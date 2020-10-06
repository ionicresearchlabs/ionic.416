/**
* @file Manages functionality of the top-level IONIC application window (main component container).
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

var mapsMessaging = new Messaging("Map"); //Maps component messaging channel
var appMessaging = new Messaging("Application"); //Application (main) component messaging channel.

mapsMessaging.addEventListener("message", (event) => {
  onMapRequest(event.data);
})

appMessaging.addEventListener("message", (event) => {
  processAppRequest(event.data);
})

/**
* Processes an application (main) request, usually made by a contained component.
*
* @param {Object} requestObj The request object, containing at least a <code>request</code>
* property defining the type of application request being made.
*/
function processAppRequest(requestObj) {
  switch (requestObj.request) {
    case "scrollTo":
      scrollPageTo(requestObj.selector);
      break;
    case "scrollComponentTo":
      scrollComponentPageTo(requestObj.componentSelector, requestObj.selector);
      break;
    default: break;
  }
}

/**
* Catches any broadcast messages that target the map component and require it to be in focus..
*
* @param {Object} requestObj The request object, containing at least a <code>request</code>
* property defining the type of map request being made.
*/
function onMapRequest(requestObj) {
  switch (requestObj.request) {
    case "zoom":
      break;
    case "fly":
      scrollPageTo("#map");
      break;
    case "addMarker":
      scrollPageTo("#map");
      break;
    case "addMarkers":
      break;
    default: break;
  }
}

/**
* Opens an external "About" window.
*/
function openAboutWindow() {
  var myWindow = window.open("./about.html", "About", "width=600,height=600,menubar=no,scrollbars=no,status=no");
}

/**
* Smooth-scrolls the page to the top of a specified element.
*
* @param {String} selector The selector of the element to scroll the window to.
*/
function scrollPageTo(selector) {
  document.querySelector(selector).scrollIntoView({
    behavior:"smooth",
    block:"start",
    inline:"start"
  });
}



/**
* Smooth-scrolls a component's page page to the top of a contained specified element.
*
* @param {String} componentSelector The selector of the component (iframe) to target.
* @param {String} selector The selector of the inner element to scroll the component swindow to.
* @param {Boolean} [includeComponent=false] If true, the main application window will also scroll to the
* component.
*/
function scrollComponentPageTo(componentSelector, selector, includeComponent=false) {
  if (includeComponent == true) {
    scrollPageTo(componentSelector);
  }
  var iframeDocument = document.querySelector(componentSelector).contentWindow.document;
  iframeDocument.querySelector(selector).scrollIntoView({
    behavior:"smooth",
    block:"start",
    inline:"start"
  });
}

window.onload = function() {
}
