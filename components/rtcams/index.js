/**
* @file Manages the functionality of the IONIC real-time cameras (rtcams) component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

var mapMessaging = new Messaging("Map");
var initialized = false;

var cameras = new Array(); //all cameras

/**
* Messaging handler for the "Map" channel.
*/
mapMessaging.addEventListener("message", (event) => {
  var data = event.data;
  switch (data.status) {
    case "ready":
      if (initialized == true) {
        return;
      }
      initialized = true;
      var requestObj = new Object();
      requestObj.request = "addScript";
      requestObj.script = this.cameraRefresh.toString(); //inject camera refresh script (above)
      mapMessaging.broadcast(requestObj);
      //loadCamerasList("http://opendata.toronto.ca/transportation/tmc/rescucameraimages/Data/tmcearthcameras.json", parseRESCUCamsList);
      loadCamerasList("tmcearthcameras.json", parseRESCUCamsList);
      break;
    default:
      //unhandled (probably sent to map from other component)
      break;
  }
})

/**
* Returns a pseudo-random integer value.
*
* @return {Number} A pseudo-random integer value between 1 and <code>Number.MAX_SAFE_INTEGER</code>
*/
function randomInteger() {
  return(Math.floor(Math.random()*Number.MAX_SAFE_INTEGER));
}

/**
* Displays a camera on any listening map component.
*
* @param {Object} camera A camera definition object containing, at least, the
* latitude and longitude of the camera.
*/
function showCameraOnMap(camera) {
  var requestObj = new Object();
  requestObj.request = "fly";
  requestObj.type = "point";
  requestObj.category = "camera";
  requestObj.latitude = camera.location.latitude;
  requestObj.longitude = camera.location.longitude;
  requestObj.zoom = 16;
  requestObj.zoomHeight = 15;
  requestObj.duration = 2000;
  mapMessaging.broadcast(requestObj);
}

/**
* Displays a camera on any listening map component by invoking the
* {@link showCameraOnMap} function.
*
* @param {String} listElementSelector The selector of the list item
* of the camera selection list.
*/
function zoomMapToCamera (listElementSelector) {
  var listElement = document.querySelector(listElementSelector);
  //could use listElement.selectedIndex but this leaves option for other types of indexing
  var cameraIndex = parseInt(listElement.options[listElement.selectedIndex].value);
  var camera = cameras[cameraIndex];
  showCameraOnMap(camera);
}

/**
* Loads a camera list file, sending the results to a custom parser function.
*
* @param {String} url The URL of the camera list JSON file to load.
* @param {Function} resultHandler The result handler / parsing function to invoke
* when the camera list JSON data has been loaded.
*/
function loadCamerasList(url, resultHandler) {
  var xhr = new XMLHttpRequest();
  xhr.overrideMimeType("application/json");
  xhr.addEventListener("load", resultHandler);
  xhr.open("GET", url);
  xhr.send();
}

/**
* Parses a loaded list of RESCU cameras and adds them to the global <code>cameras</code> list.
*
* @param {Event} event A XHR load completion event.
*/
function parseRESCUCamsList(event) {
  var responseStr = event.target.responseText;
  responseStr = responseStr.split("jsonTMCEarthCamerasCallback(").join("");
  responseStr = responseStr.split("]});").join("]}");
  var obj = JSON.parse(responseStr);
  var cameraImageUrl = "https://www.toronto.ca/data/transportation/roadrestrictions/CameraImages/loc%Number%.jpg?%rand%"
  for (var count=0; count < obj.Data.length; count++) {
    var dataItem = obj.Data[count];
    var name = `${dataItem.Name}`;
    var imgURL = cameraImageUrl.split("%Number%").join(dataItem.Number);
    var group = `RESCU/${dataItem.Group}`;
    refreshMS = dataItem.refreshMS;
    name += ` (${group})`;
    var description = `https://www.toronto.ca/services-payments/streets-parking-transportation/road-restrictions-closures/rescu-traffic-cameras/`;
    var location = {
      latitude: dataItem.Latitude,
      longitude: dataItem.Longitude
    };
    addNewCamera(name, imgURL, group, description, location, refreshMS, false);
  }
  loadCamerasList("extracameras.json", parseExtraCamsList);
}

/**
* Parses a loaded list of extra cameras and adds them to the global <code>cameras</code> list.
*
* @param {Event} event A XHR load completion event.
*/
function parseExtraCamsList(event) {
  var responseStr = event.target.responseText;
  var obj = JSON.parse(responseStr);
  for (var count=0; count < obj.Data.length; count++) {
    var dataItem = obj.Data[count];
    var name = `${dataItem.Name}`;
    var imgURL = `${dataItem.imgURL}`;
    var group = `OTHER/${dataItem.Group}`;
    var refreshMS = dataItem.refreshMS;
    name += ` (${group})`;
    var description = `${dataItem.Description}`;
    var location = {
      latitude: dataItem.Latitude,
      longitude: dataItem.Longitude
    };
    addNewCamera(name, imgURL, group, description, location, refreshMS, false);
  }
  refreshCamerasList();
}

/**
* Adds a new camera to the global <code>cameras</code> list;
*
* @param {String} name The descriptive name of the camera to add.
* @param {String} imgURL The URL of the camera image to load and refresh in subsequent operations.
* @param {String} [description=null] A desription of the camera (e.g. location name, special features, etc.)
* @param {Object} [location=null] An object containing the <code>latitude</code> and <code>longitude</code> properties,
* in decimal degrees, of the camera's location.
* @param {Number} [refreshMS=300000] The number of milliseconds to refresh the webcam image at.
* @param {Boolean} [addFirst=false] If true, the camera is added to the beginning of the list, otherwise it's added
* to the end.
*/
function addNewCamera(name, imgURL, group, description=null, location=null, refreshMS=300000, addFirst=false) {
  var cameraObj = new Object();
  cameraObj.name = name;
  cameraObj.imgURL = imgURL;
  cameraObj.group = group;
  cameraObj.description = description;
  cameraObj.location = location;
  cameraObj.refreshMS = refreshMS;
  if (addFirst == true) {
    cameras.unshift(cameraObj);
  } else {
    cameras.push(cameraObj);
  }
}

/**
* This script dynamically inserted into rtmaps component to automatically refresh an associated camera image.
*
* @param {String} elementSelector The selector of the camera image element being affected.
* @param {Number} refreshMS The number of milliseconds to automatically refresh the element at.
* If the element has been removed or is otherwise invalid, the refresh timer is automatically stopped.
* @param {String} refreshURL The URL of the image to refresh.
* @param {String} control Determines if the refresh timer is being "start"ed for the first time, or "refresh"ed
* manually.
*/
function cameraRefresh(elementSelector, refreshMS, refreshURL, control) {
  var element = document.querySelector("#refreshTimeDisplay");
  if ((control == "reset") || (control == "start")) {
    try {
      clearTimeout(element._refreshTimeout);
    } catch (err) {
    }
    try {
      element._refreshMS = refreshMS;
    } catch (err) {
    }
  }
  var imgElement = document.querySelector(elementSelector);
  if ((element == null) || (imgElement == null)) {
    //probably removed / closed
    return;
  }
  var displayElement = element.querySelector("#timeString");
  var refreshTime = element._refreshMS - 1000;
  element._refreshMS = refreshTime;
  var seconds = Math.floor(refreshTime / 1000) % 60;
  var minutes = Math.floor(refreshTime / (1000 * 60)) % 60;
  var hours = Math.floor(refreshTime / (1000 * 60 * 60)) % 24;
  //var days = Math.floor(refreshTime / (1000 * 60 * 60 * 24));
  var hourStr = String(hours);
  if (hours < 10) {
    hourStr = "0"+hourStr;
  }
  var minuteStr = String(minutes);
  if (minutes < 10) {
    minuteStr = "0"+minuteStr;
  }
  var secondStr = String(seconds);
  if (seconds < 10) {
    secondStr = "0"+secondStr;
  }
  if ((refreshTime > 0) && (control != "reset")) {
    var refreshTimeStr = `${hourStr}:${minuteStr}:${secondStr}`;
    displayElement.innerHTML = refreshTimeStr;
    element._refreshTimeout = setTimeout (cameraRefresh, 1000, elementSelector, refreshMS, refreshURL, "continue");
  } else {
    var refreshTimeStr = `--:--:--`;
    displayElement.innerHTML = refreshTimeStr;
    var imgURL = refreshURL.split("%rand%").join(Math.floor(Math.random()*Number.MAX_SAFE_INTEGER));
    imgElement.setAttribute("src", imgURL);
  }
}

/**
* Refresh the cameras list (<code>select</code> element) with items found in the global
* <code>cameras</code> list.
*
* @param {String} [elementSelector="#camerasList"] The selector of the list <code>select</code> element to refresh.
*/
function refreshCamerasList(elementSelector="#camerasList") {
  var listContainerElement = document.querySelector(elementSelector);
  var selectHTML = `<select id="camerasListPulldown" name="camerasListPulldown">`;
  var cameraMarkers = new Array();
  for (var count=0; count < cameras.length; count++) {
    var camera = cameras[count];
    var marker = new Object();
    marker.latitude = camera.location.latitude;
    marker.longitude = camera.location.longitude;
    marker.icon = `camera`;
    marker.content = `<span class="camera-name">${camera.name}</span>`;
    var imgURL = camera.imgURL;
    var baseImgURL = imgURL;
    var refreshMS = camera.refreshMS;
    var rndId = randomInteger();
    imgURL = imgURL.split("%rand%").join(String(rndId));
    var streetViewHTML = `<span class="street-view-link"><a href="#" onclick="openStreetViewWindow('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${marker.latitude},${marker.longitude}');"><i class="fas fa-street-view"></i>&nbsp;Google Maps Street View</a></span>`;
    var refreshTimerHTML = `<span id="refreshTimeDisplay" class="camera-refresh-timer"><a href="#" onclick='cameraRefresh("#camera${rndId}",${refreshMS},"${baseImgURL}","reset");'><i class="fas fa-redo"></i>&nbsp;Refresh in <span id="timeString">--:--:--</span></a></span>`;
    marker.content += `<div class="camera-container"><img onload="cameraRefresh('#camera${rndId}',${refreshMS},'${baseImgURL}','start');" id="camera${rndId}" src="${imgURL}" width="100%" />${streetViewHTML}${refreshTimerHTML}</div>`;
    cameraMarkers.push(marker);
    var optionHTML = `<option value="${count}">${camera.name}</option>`;
    selectHTML += optionHTML;
  }
  selectHTML += `</select>`;
  listContainerElement.innerHTML = selectHTML;
  var requestObj = new Object();
  requestObj.request = "addMarkers";
  requestObj.layer = "cameras";
  requestObj.layerOptions = {
    minZoom:12
  };
  requestObj.markers = cameraMarkers;
  mapMessaging.broadcast(requestObj);
  document.querySelector("#goToCameraButton").removeAttribute("disabled");
}

window.onload = function() {
  document.querySelector("#goToCameraButton").setAttribute("disabled", "true");
}

mapMessaging.broadcast({request:"isReady"});
