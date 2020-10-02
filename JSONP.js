/**
* @file Generic JSONP request/result handler for browser.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class JSONP request and result handler.
* @extends EventTarget
*/
class JSONP extends EventTarget {

  /**
  * The requested JSONP call has successfully completed. Note that errors
  * reported in returned data, as opposed to HTTP errors, will also dispatch
  * this event and must therefore be handled further within the application.
  *
  * @event JSONP.onload
  * @type {Event}
  *
  * @property {*} result The result passed to the JSONP result function.
  */
  /**
  * An error has been encountered when retrieving or parsing the JSONP data.
  *
  * @event JSONP.onerror
  * @type {Event}
  *
  * @property {Error} error Contains details about the error.
  */

  /**
  * Creates a new instance of JSONP.
  */
  constructor() {
    super();
    this.createCallbacksObject();
  }

  /**
  * Creates the default Twitter JSONP callbacks container object on
  * the <code>window</code> object if it doesn't already exist.
  * @private
  */
  createCallbacksObject() {
    if ((window["_JSONP"] == undefined) || (window["_JSONP"] == null)) {
      var JSONPObj = new Object();
      window._JSONP = JSONPObj;
    }
  }

  /**
  * @property {String} uniqueCallback A unique callback function name that can be used to
  * construct a JSONP URL and subsequently supplied to the [load]{@link JSONP#load} function.
  */
  get uniqueCallback() {
    var funcName = `_JSONP.cb${Math.floor(Math.random()*Number.MAX_SAFE_INTEGER)}`;
    return (funcName);
  }

  /**
  * Begins a JSONP load operation.
  *
  * @param {String} url The URL from which to load the JSONP data. Note that the
  * @param {String} callback A unique callback function to invoke when the JSONP load
  * finishes. This function should be unique to prevent collisions so use of the
  * [uniqueCallback]{@link JSONP#uniqueCallback} property is <b>highly</b> recommended.
  *
  */
  async load (url, callback) {
    var promise = new Promise((resolve, reject) => {
      var scriptElement = document.createElement('script');
      scriptElement.setAttribute("src", url);
      scriptElement.setAttribute("type", "text/javascript");
      scriptElement.setAttribute("language", "javascript");
      scriptElement.setAttribute("charset", "utf-8");
      var cbSplit = callback.split(".");
      var target = window;
      var cbRef = null;
      if (cbSplit.length == 1) {
        target[callback] = this.resultHandler.bind(this, scriptElement, cbRef, {resolve, reject});
        cbRef = target[callback];
      } else {
        var previousTarget = target;
        for (var count=0; count<cbSplit.length; count++) {
          target = previousTarget[cbSplit[count]];
          if (count == (cbSplit.length - 1)) {
            previousTarget[cbSplit[count]] = this.resultHandler.bind(this, scriptElement, cbRef, {resolve, reject});
            cbRef = previousTarget[cbSplit[count]];
          } else {
            if ((target == undefined) || (target == null)) {
              var newTarget = new Object();
              previousTarget[cbSplit[count]] = newTarget;
              target = newTarget;
            }
          }
          previousTarget = target;
        }
      }
      document.head.appendChild(scriptElement); //start load
    });
    return (promise);
  }

  /**
  * JSONP result handler.
  *
  * @param {HTMLScriptElement} jsElementRef A reference to the temporary <code><script></code>
  * tag appended to the page header used for the JSONP request.
  * @param {Object} data The returned JSONP data.
  * @private
  */
  resultHandler(jsElementRef, callbackRef, promise, data) {
    try {
      promise.resolve(data);
    } catch (err) {
    } finally {
      jsElementRef.remove(); //clean up <script> tag
      callbackRef = null; //remove function reference
    }
  }

}
