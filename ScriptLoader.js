/**
* @file Dynamic (runtime) JavaScript loader.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Dynamic (runtime) JavaScript loader.
* @extends EventTarget
*/
class ScriptLoader extends EventTarget {

  /**
  * Creates a new instance.
  */
  constructor() {
    super();
  }

  /**
  * Dispatched when a script has successfully loaded and been processed.
  *
  * @event ScriptLoader#onload
  */
  /**
  * Dispatched when a script load fails.
  *
  * @event ScriptLoader#onerror
  * @type {Object}
  * @property {String} message The error message of the failure.
  */

  /**
  * Dynamically loads and processes an external JavaScript file.
  *
  * @param {String} scriptURL The URL to the JavaScript file to load and process.
  * @param {Boolean} [async=true] If <code>true</code>, a <code>Promise</code> is
  * returned which will resolve on success or reject on failure. If <code>false</code>,
  * an event is dispatched instead.
  * @param {String} [targetSelector="head"] The HTML selector to append the
  * generated <code>&lt;script&gt;</code> tag.
  * @param {String} [charSet="utf-8"] The <code>charset</code> attribute with which
  * to create the dynamic <code>&lt;script&gt;</code> tag.
  *
  * @return {Promise|undefined} If the <code>async</code> is <code>true</code> a Promise
  * is returned which resolves or rejects, otherwise nothing is returned and the instance
  * dispatches an event instead.
  * @fires ScriptLoader#onload
  * @fires ScriptLoader#onerror
  */
  load(scriptURL, async=true, targetSelector="head", charSet="utf-8") {
    var scriptElement = document.createElement('script');
    scriptElement.setAttribute("src", scriptURL);
    scriptElement.setAttribute("type", "text/javascript");
    scriptElement.setAttribute("language", "javascript");
    scriptElement.setAttribute("crossorigin", "anonymous");
    scriptElement.setAttribute("charset", charSet);
    var targetElement = document.querySelector(targetSelector);
    if (async == true) {
      var promise = new Promise((resolve, reject) => {
        scriptElement.addEventListener("load", (event) => {
          resolve(scriptElement);
        });
        scriptElement.addEventListener("error", (event) => {
          reject(event);
        });
      })
      targetElement.appendChild(scriptElement);
      return (promise);
    } else {
      scriptElement.addEventListener("load", (evt) => {
        var event = new Event("onload");
        this.dispatchEvent(event);
      })
      scriptElement.addEventListener("error", (evt) => {
        var event = new Event("onerror");
        event.message = evt.message;
        this.dispatchEvent(event);
      })
      targetElement.appendChild(scriptElement);
    }
  }

  /**
  * @private
  */
  toString() {
    return ("[object ScriptLoader]");
  }

}
