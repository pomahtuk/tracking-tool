/*jslint browser: true, plusplus: true, indent: 2*/
/*global window, document, setTimeout, docReady, console*/

/**
 * Created by pman on 04.10.14.
 */

/*
  Custom docReady implementation
*/
(function (funcName, baseObj) {

  "use strict";

  // The public function name defaults to window.docReady
  // but you can pass in your own object and own function name and those will be used
  // if you want to put them in a different namespace
  funcName = funcName || "docReady";
  baseObj = baseObj || window;
  var readyList = [],
    readyFired = false,
    readyEventHandlersInstalled = false;

  // call this when the document is ready
  // this function protects itself against being called more than once
  function ready() {
    var i;

    if (!readyFired) {
      // this must be set to true before we start calling callbacks
      readyFired = true;
      for (i = 0; i < readyList.length; i++) {
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
    if (document.readyState === "complete") {
      ready();
    }
  }

  // This is the one public interface
  // docReady(fn, context);
  // the context argument is optional - if present, it will be passed
  // as an argument to the callback
  baseObj[funcName] = function (callback, context) {
    // if ready has already fired, then just schedule the callback
    // to fire asynchronously, but right away
    if (readyFired) {
      setTimeout(function () {callback(context); }, 1);
      return;
    } else {
      // add the function and context to the list
      readyList.push({fn: callback, ctx: context});
    }
    // if document already ready to go, schedule the ready function to run
    if (document.readyState === "complete") {
      setTimeout(ready, 1);
    } else if (!readyEventHandlersInstalled) {
      // otherwise if we don"t have event handlers installed, install them
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
  };
}("docReady", window));

/*
  Laborant itself implementation
*/

(function (window, document, docReady) {
  "use strict";

  var uber = this;

  /**
   * modify baseObject and mount JSONP ajax request engine to namespace
   * @param   {Object} [baseObject=window] object to modify, by default - window
   * @param   {String} [namespace="ajax"]  namespace for requster functions
   */
  function ajaxRequester(baseObject, namespace) {

    baseObject = baseObject || window;
    namespace  = namespace  || "ajax";

    /**
     * Constructor function for ajaxRequester
     * @returns {Function} actual request function
     */
    function AjaxRequest() {

      /**
       * recursively prepare passed data object to GET requst params
       * @param   {Object} data   current chunk of data
       * @param   {String} prefix namespace prefix
       * @returns {String} GET requst params string
       */
      function prepareParams(data, prefix) {
        var resultString = [], value, resKey, resValue, dataKey;

        for (dataKey in data) {
          if (data.hasOwnProperty(dataKey)) {
            value = data[dataKey];
            resValue = typeof value === "function" ? value() : value;
            resKey = prefix ? prefix + "[" + dataKey + "]" : dataKey;
            resultString.push(typeof value === "object" ?
                prepareParams(value, resKey) :
                encodeURIComponent(resKey) + "=" + encodeURIComponent(resValue));
          }
        }

        return resultString.join("&");

      }

      baseObject[namespace] = {};

      /**
       * Perform JSONP request
       * @param {Object}   params    request params
       * @param {Function} onSuccess success cllback, passing data
       * @param {Function} onError   error callback, passing request params
       */
      function scriptRequest(params, onSuccess, onError) {
        var url = params.url || window.location.origin,
          data = params.data || {},
          scriptOk = false,
          callbackName = "f" + String(Math.random()).slice(2),
          script = document.createElement("script");

        if (url.indexOf("?") !== -1) {
          url += "&";
        } else {
          url += "?";
        }
        url += prepareParams(data);
        url += "&callback=Lab." + namespace + "." + callbackName;

        baseObject[namespace][callbackName] = function (data) {
          scriptOk = true;
          delete baseObject[namespace][callbackName];
          onSuccess(data, params);
        };

        function checkCallback() {
          if (scriptOk) {
            return;
          }
          delete baseObject[namespace][callbackName];
          if (typeof onError === "function") { onError(params); }
        }

        script.onreadystatechange = function () {
          if (this.readyState === "complete" || this.readyState === "loaded") {
            this.onreadystatechange = null;
            setTimeout(checkCallback, 0);
          }
        };

        script.onload = script.onerror = checkCallback;
        script.src = url;

        document.body.appendChild(script);
      }

      return scriptRequest;
    }

    baseObject.ajax = new AjaxRequest(namespace);

  }

  function Lab() {

    var context = this,
      serverUrl = "http://localhost:3000/laborant",
      retryAttempts = 5,
      retryDelay = 500,
      track;

    ajaxRequester(uber, "__jsonpCallbacks");

    function initialize() {

      var experiments = {};

      // checking url for forced experiments in format lab_site_experiment_[name]=[value]
      function getForcedUrlExperiments() {
        var param, key, value, tmp,
          result = {},
          urlParams = window.location.search,
          urlParamsArray = urlParams.slice(1, urlParams.length).split("&"),
          li = urlParamsArray.length;

        while (li--) {
          param = urlParamsArray[li];
          if (param.indexOf("lab_site_experiment_") !== -1) {
            tmp = param.split("=");
            key = tmp[0].replace(/^lab_site_experiment_/, "");
            value = tmp[1] || 0;
            result[key] = value;
          }
        }

        return result;
      }

      // First - start at dom ready
      docReady(function () {
        var error;
        // prepare success callback
        function successFunction(data) {
          if (data && data.status === "success") {
            console.log(data);
            // write propper cookie

            // start executing experiment functions

            // note: all experiment conditions should be set at backend? or not?
          } else {
            error = new Error("Incorrect Laborant API key");
          }
        }

        function errorFunction() {
          error = new Error("Could not check API key");
        }

        experiments = getForcedUrlExperiments();

        // get list of all experiments and its variants from server, handshake
        uber.ajax({
          url: serverUrl,
          data: {
            apiKey: "laborant_development_key",
            experiments: experiments
          }
        }, successFunction, errorFunction);
      });

    }

    function trackSuccessFunction(data) {
      console.info(data);
    }

    function trackErrorFunction(params) {
      params = params.tracking;
      var error = new Error("Error sending tracking data to server, will retry");
      // retry on error
      if (params.attempts < retryAttempts) {
        setTimeout(function () {
          track(params.type, params.param, params.attempts + 1);
        }, retryDelay);
      } else {
        error = new Error("giving up on this tracking, check connection and server status");
      }
    }

    track = function (type, param, attempts) {
      attempts = attempts || 1;
      console.log(type, "fake tracking");
      uber.ajax({
        url: serverUrl + "/" + type + "/" + param,
        tracking: {
          type: type,
          param: param,
          attempts: attempts
        },
        data: {
          apiKey: "laborant_development_key"
        }
      }, trackSuccessFunction, trackErrorFunction);
    };

    context.experiments = {};

    context.trackExperiment = function (experimentName) {
      track("experiment", experimentName);
    };

    context.trackGoal = function (goalName) {
      track("goal", goalName);
    };

    context.trackTarget = function (targetName) {
      track("target", targetName);
    };

    initialize();

  }

  window.Lab = new Lab();

}(window, document, docReady));
