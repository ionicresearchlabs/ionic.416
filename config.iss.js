/**
* @file Global IONIC configuration file served by the IONIC Services Server.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @license MIT license
*/

window.usingISS = true;
window.ISSProxy = function() {
  var proxyObj = new Object();
  proxyObj.url = "/api/proxy/?url=";
  proxyObj.action = "append";
  proxyObj.encodeURIComponent = true;
  return (proxyObj);
}
