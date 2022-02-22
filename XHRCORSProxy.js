/**
* @file Extends XMLHttpRequest to use a CORS proxy.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Sends a XMLHttpRequest
* @extends XMLHttpRequest
*/
class XHRCORSProxy extends XMLHttpRequest {

  /**
  * Creates a new instance.
  */
  constructor(...args) {
    super.apply(this, args);
  }

  /**
  * @property {Array} proxyList Indexed array of proxy objects to use in load operations.
  * @private
  */
  get proxyList() {
    if ((this._proxyList == undefined) || (this._proxyList == null)) {
      if (window.usingISS == true) {
        this._proxyList = [window.ISSProxy()];
      } else {
        this._proxyList = [
          {
            "url":"https://api.allorigins.win/raw?url=",
            "action":"append",
            "encodeURIComponent":false
          }
        ]
      }
    }
    return (this._proxyList);
  }

  set proxyList(proxySet) {
    this._proxy = proxySet;
  }

  /**
  * Creats a "proxified" URL that can be used to load otherwise CORS-blocked data.
  *
  * @property {String} url The target URL to "proxify".
  * @property {Number} [useProxyNum=-1] The index number of a specific proxy to use.
  * If smaller than 0, the proxy is automatically selected from a rotating list (if avalable).
  *
  * @return {String} The "proxified" (CORS-safe) url.
  */
  proxify(url, useProxyNum=-1) {
    if (useProxyNum > -1) {
      var currentProxy = this.proxyList[useProxyNum];
    } else {
      currentProxy = this.proxyList[0];
      if (this.proxyList.length > 1) {
        this.proxyList.push(this.proxyList.shift()); //rotate proxy
      }
    }
    var outURL = currentProxy.url;
    switch (currentProxy.action) {
      case "append":
        if (currentProxy.encodeURIComponent == true) {
          outURL += encodeURIComponent(url);
        } else {
          outURL += url;
        }
        break;
      case "none":
        if (currentProxy.encodeURIComponent == true) {
          outURL = encodeURIComponent(url);
        } else {
          outURL = url;
        }
        break;
      default:
        throw (new Error("Unrecognized proxy type: "+currentProxy.action));
        break;
    }
    return (outURL);
  }

}
