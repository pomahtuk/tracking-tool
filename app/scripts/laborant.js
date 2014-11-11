/**
 * Created by pman on 04.10.14.
 */
(function(funcName, baseObj) {
  // The public function name defaults to window.docReady
  // but you can pass in your own object and own function name and those will be used
  // if you want to put them in a different namespace
  funcName = funcName || "docReady";
  baseObj = baseObj || window;
  var readyList = [];
  var readyFired = false;
  var readyEventHandlersInstalled = false;

  // call this when the document is ready
  // this function protects itself against being called more than once
  function ready() {
    if (!readyFired) {
      // this must be set to true before we start calling callbacks
      readyFired = true;
      for (var i = 0; i < readyList.length; i++) {
        // if a callback here happens to add new ready handlers,
        // the docReady() function will see that it already fired
        // and will schedule the callback to run right after
        // this event loop finishes so all handlers will still execute
        // in order and no new ones will be added to the readyList
        // while we are processing the list
        readyList[i].fn.call(window, readyList[i].ctx);
      }
      // allow any closures held by these functions to free
      readyList = [];
    }
  }

  function readyStateChange() {
    if ( document.readyState === "complete" ) {
      ready();
    }
  }

  // This is the one public interface
  // docReady(fn, context);
  // the context argument is optional - if present, it will be passed
  // as an argument to the callback
  baseObj[funcName] = function(callback, context) {
    // if ready has already fired, then just schedule the callback
    // to fire asynchronously, but right away
    if (readyFired) {
      setTimeout(function() {callback(context);}, 1);
      return;
    } else {
      // add the function and context to the list
      readyList.push({fn: callback, ctx: context});
    }
    // if document already ready to go, schedule the ready function to run
    if (document.readyState === "complete") {
      setTimeout(ready, 1);
    } else if (!readyEventHandlersInstalled) {
      // otherwise if we don't have event handlers installed, install them
      if (document.addEventListener) {
        // first choice is DOMContentLoaded event
        document.addEventListener("DOMContentLoaded", ready, false);
        // backup is window load event
        window.addEventListener("load", ready, false);
      } else {
        // must be IE
        document.attachEvent("onreadystatechange", readyStateChange);
        window.attachEvent("onload", ready);
      }
      readyEventHandlersInstalled = true;
    }
  }
})("docReady", window);

(function(window, document, docReady) {
  'use strict';

  function AjaxRequester (baseObject, namespace) {
    'use strict';

    baseObject = baseObject || window;

    function AjaxRequest () {

      function prepareParams(data, prefix) {
        var resultString = [], value, resKey, resValue;

        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            value = data[key];
            resValue = typeof value == "function" ? value() : value;
            resKey = prefix ? prefix + "[" + key + "]" : key;
            resultString.push(typeof value == "object" ?
                prepareParams(value, resKey) :
                encodeURIComponent(resKey) + "=" + encodeURIComponent(resValue));
          }
        }

        return resultString.join("&");

      }

      baseObject[namespace] = {};

      function scriptRequest(params, onSuccess, onError) {
        var url = params.url || window.location.origin,
            data = params.data || {},
            scriptOk = false,
            callbackName = 'f'+String(Math.random()).slice(2);

        url += ~url.indexOf('?') ? '&' : '?';
        url += prepareParams(data);
        url += '&callback=Lab.'+namespace+'.'+callbackName;

        baseObject[namespace][callbackName] = function(data) {
          scriptOk = true;
          delete baseObject[namespace][callbackName];
          onSuccess(data);
        };

        function checkCallback() {
          if (scriptOk) return;
          delete baseObject[namespace][callbackName];
          if (typeof onError === 'function') { onError(url); }
        }

        var script = document.createElement('script');

        script.onreadystatechange = function() {
          if (this.readyState == 'complete' || this.readyState == 'loaded'){
            this.onreadystatechange = null;
            setTimeout(checkCallback, 0);
          }
        };

        script.onload = script.onerror = checkCallback;
        script.src = url;

        document.body.appendChild(script);
      }

      return scriptRequest
    }

    baseObject.ajax = new AjaxRequest(namespace);

  }

  function Lab () {

    var context = this;

    AjaxRequester(context, '__jsonpCallbacks');

    function initialize () {

      var experiments = {};

      // checking url for forced experiments in format lab_site_experiment_[name]=[value]
      function getForcedUrlExperiments () {
        var result = {},
          param, key, value, tmp,
          urlParams = window.location.search,
          urlParamsArray = urlParams.slice(1, urlParams.length).split('&'),
          li = urlParamsArray.length;

        while (li--) {
          param = urlParamsArray[li];
          if (param.indexOf('lab_site_experiment_') !== -1) {
            tmp = param.split('=');
            key = tmp[0].replace(/^lab_site_experiment_/, '');
            value = tmp[1] || 0;
            result[key] = value;
          }
        }

        return result;
      }

      // First - start at dom ready
      docReady(function() {
        console.log("document is ready. Let's start magic");
        // prepare success callback
        function successFunction (data) {
          if (data && data.status === 'success' ) {
            console.log(data);
          } else {
            new Error ('Incorrect Laborant API key');
          }
        }

        function errorFunction() {
          new Error ('Could not check API key');
        }

        experiments = getForcedUrlExperiments();

        // get list of all experiments and its variants from server
        context.ajax({
          url: 'http://localhost:3000/laborant',
          data: {
            apiKey: 'laborant_development_key',
            experiments: experiments
          }
        }, successFunction, errorFunction);
        // from this point we could run all experiments
      });

      // Third    - check cookies for already setted values

      // Fifth    - send server request with forced and setted parameters

      // Sixth    - process server response and form experiments object

      // Seventh  - iterate over object and run all experiments

      // Finally  - set up tracking and fire events
    }

    // (also need an assert mode, determine response-request formats and so on)

    context.hello = function () {
      console.log('Hello from laborant!');
      return true;
    };

    initialize();

  }

  window.Lab = new Lab()

})(window, document, docReady);