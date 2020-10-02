/**
* @file Manages functionality of the top-level IONIC application window (main component container).
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

var mapsMessaging = new Messaging("Map"); //Maps component messaging channel

mapsMessaging.addEventListener("message", (event) => {
  onMapRequest(event.data);
})

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



window.onload = function() {
}
