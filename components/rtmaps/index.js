/**
* @file Manages the functionality of the IONIC realtime maps (rtmaps) component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @license MIT license
*/

var messaging = new Messaging("Map"); //"Map" messsaging channel
var maps = new Array();
var attributionsHTML =`<a href="https://openlayers.org/" target="_blank">&copy; OpenLayers</a>&nbsp;<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a>`;

/**
* Event handler invoked when a "Map" request message is received, usually from another component.
*
* @param {Event} event The messaging event to process.
*
* @async
*/
messaging.addEventListener("message", (event) => {
  processMapRequest(event.data);
})

/**
* Processes a map request, usually made by an external component.
*
* @param {Object} requestObj The request object, containing at least a <code>request</code>
* property defining the type of map request being made.
*/
function processMapRequest(requestObj) {
  switch (requestObj.request) {
    case "isReady":
      messaging.broadcast({status:"ready",source:"map"});
      break;
    case "addScript":
      var scriptElement = document.createElement("script");
      scriptElement.setAttribute("type", "text/javascript");
      scriptElement.setAttribute("language", "javascript");
      scriptElement.setAttribute("charset", "utf-8");
      scriptElement.innerHTML = requestObj.script;
      document.querySelector("head").appendChild(scriptElement);
      break;
    case "zoom":
      zoomMapTo(maps[0], requestObj.longitude, requestObj.latitude, requestObj.zoom);
      break;
    case "fly":
      flyMapTo(maps[0], requestObj.longitude, requestObj.latitude, requestObj.zoom, requestObj.zoomHeight, requestObj.duration);
      break;
    case "addMarker":
      var layer = getMapLayerByName(maps[0], requestObj.layer);
      if (layer == null) {
        layer = addMapLayer(maps[0], requestObj.layer, requestObj.layerOptions, {});
      }
      addMapMarker(layer, requestObj.latitude, requestObj.longitude, iconAlias(requestObj.icon), requestObj.content);
      break;
    case "addMarkers":
      var layer = getMapLayerByName(maps[0], requestObj.layer);
      if (layer == null) {
        layer = addMapLayer(maps[0], requestObj.layer, requestObj.layerOptions, {});
      }
      addMapMarkers(layer, requestObj.markers);
      break;
    case "openStreetViewWindow":
      openStreetViewWindow(requestObj.url);
      break;
    default: break;
  }
}

/**
* Returns a map icon path based on common aliases such as "police", "fire", or "camera".
*
* @param {String} alias The alias for the icon type.
*
* @return {String} The path to the associate icon, or the <code>alias</code> parameter if no
* matching alias exists.
*/
function iconAlias(alias) {
  switch (alias) {
    case "police":
      return ("icons/police.png");
      break;
    case "policenews":
      return ("icons/police.png");
      break;
    case "fire":
      return ("icons/fire.png");
      break;
    case "camera":
      return ("icons/photo.png");
      break;
    default:
      return (alias);
      break;
  }
}

/**
* Dummy function, as set by data feeds. Defined here only to prevent errors in the JavaScript console.
*/
function onClickItem() {}

/**
* Saves the default map object as PNG data, allowing the user to download it. UNTESTED!
*
* @private
*/
function saveMapAsPNG() {
  var pngData = mapToPNGData(maps[0]);
  var link = document.querySelector('#image-download');
  link.href = pngData;
  link.click();
}

/**
* Zooms a map to a specific latitude, longitude, and zoom level.
*
* @param {ol.Map} mapObj The OpenLayers map object to zoom.
* @param {Number} lon The longitude, in decimal degrees, to center the map to.
* @param {Number} lat The latitude, in decimal degrees, to center the map to.
* @param {Number} zoom The zoom level to magnify the map to. The larger the number the
* closer the magniciation is to the ground.
*/
function zoomMapTo(mapObj, lon, lat, zoom) {
  var targetView = {
    center: ol.proj.fromLonLat([lon,lat]),
    zoom: zoom
  };
  mapObj.getView().animate(targetView);
}

/**
* Flies a map to a specific latitude, longitude, and zoom level.
*
* @param {ol.Map} mapObj The OpenLayers map object to zoom.
* @param {Number} lon The longitude, in decimal degrees, to center the map to.
* @param {Number} lat The latitude, in decimal degrees, to center the map to.
* @param {Number} zoom The zoom level to magnify the map to. The larger the number the
* closer the magniciation is to the ground.
* @param {Number} [zoomHeight=null] The zoom-out height to take the camera to before zooming
* back into the <code>zoom</code> height.
* @param {Number} [duration=2000] The millisecond duration of the entire "fly" animation.
*/
function flyMapTo(mapObj, lon, lat, zoom, zoomHeight=null, duration=2000) {
  var view = mapObj.getView();
  if ((zoomHeight == null) || (zoomHeight == undefined)) {
    zoomHeight = view.getZoom() - 1;
  }
  view.animate(
    {
      center: ol.proj.fromLonLat([lon,lat]),
      duration: duration,
    }
  );
  view.animate(
    {
      zoom: zoomHeight,
      duration: duration / 2,
    },
    {
      zoom: zoom,
      duration: duration / 2,
    }
  );
}

/**
* Adds a new dynamic layer to a map object.
*
* @param {ol.Map} mapObj The OpenLayers map object to add the layer to.
* @param {String} name The name of the layer to create.
* @param {Object} [init=null] An initialization object to pass to the
* <code>ol.layer.Vector</code> instance.
* @param {Object} [data={}] Additional data to assign to the layer's <code>data</code>
* property.
*
* @return {ol.layer.Vector} The newly-added OpenLayers Vector layer.
*/
function addMapLayer(mapObj, name, init=null, data={}) {
  if (init == null) {
    init = new Object();
  }
  var newLayer = new ol.layer.Vector(init);
  newLayer.set("name", name);
  newLayer.set("data", data);
  mapObj.addLayer(newLayer);
  return (newLayer);
}

/**
* Returns a layer from a map object by the layer's name.
*
* @param {ol.Map} mapObj The OpenLayers map object to look into.
* @param {String} name The name of the layer to find.
*
* @return {ol.layer.Vector} The matching OpenLayers Vector layer, or null.
*/
function getMapLayerByName(mapObj, name) {
  var layers = mapObj.getLayers();
  var length = layers.getLength();
  for (var count = 0; count < length; count++) {
    var currentLayer = layers.item(count);
    var layerName = currentLayer.get("name");
    if (layerName == name) {
      return (currentLayer);
    }
  }
  return (null);
}

/**
* Returns a layer from a map object by the layer's index value.
*
* @param {ol.Map} mapObj The OpenLayers map object to look into.
* @param {Number} index The index value of the layer.
*
* @return {ol.layer.Vector} The matching OpenLayers Vector layer, or null.
*/
function getMapLayerByIndex(mapObj, index) {
  var layers = mapObj.getLayers();
  var length = layers.getLength();
  try {
    return (layers.item(index));
  } catch (err) {
    return (null);
  }
}

/**
* Returns the index value of a map layer.
*
* @param {ol.Map} mapObj The OpenLayers map object containing the layer.
* @param {ol.layer.Vector} layerObj The Vector layer object to return the index of.
*
* @return {Number} The index value of the layer, or -1 if no such layer exists within the map.
*/
function getLayerIndex(mapObj, layerObj) {
  var layers = mapObj.getLayers();
    var length = layers.getLength();
    for (var count = 0; count < length; count++) {
        if (layerObj === layers.item(count)) {
            return (count);
        }
    }
    return -1;
}

/**
* Raises a layer within an object up by one index value.
*
* @param {ol.Map} mapObj The OpenLayers map object containing the layer.
* @param {ol.layer.Vector} layerObj The Vector layer object to raise by one index value.
*/
function raiseLayer(mapObj, layerObj) {
    var layers = mapObj.getLayers();
    var index = getLayerIndex(mapObj, layerObj);
    if (index < layers.getLength() - 1) {
        var next = layers.item(index + 1);
        layers.setAt(index + 1, layerObj);
        layers.setAt(index, next);
        var elem = $('ul.layerstack li[data-layerid="' + layerObj.get('name') + '"]');
        elem.prev().before(elem);
    }
}

/**
* Lowers a layer within an object down by one index value.
*
* @param {ol.Map} mapObj The OpenLayers map object containing the layer.
* @param {ol.layer.Vector} layerObj The Vector layer object to lower by one index value.
*/
function lowerLayer(mapObj, layerObj) {
    var layers = mapObj.getLayers();
    var index = getLayerIndex(mapObj, layerObj);
    if (index > 0) {
        var prev = layers.item(index - 1);
        layers.setAt(index - 1, layer);
        layers.setAt(index, prev);
        var elem = $('ul.layerstack li[data-layerid="' + layerObj.get('name') + '"]');
        elem.next().after(elem);
    }
}

/**
* Returns a map overlay object based on its identifier.
*
* @param {ol.Map} mapObj The OpenLayers map object containing the overlay.
* @param {String} overlayId The identifier of the overlay to return.
*
* @return {ol.Overlay} The matching overlay object or null.
*/
function getMapOverlay(mapObj, overlayId) {
  var overlays = mapObj.getOverlays();
  var length = overlays.getLength();
  for (var count=0; count < length; count++) {
    var currentOverlay = overlays.item(count);
    if (currentOverlay.getId() == overlayId) {
      return (currentOverlay);
    }
  }
  return (null);
}

/**
* Hides all overlays belonging to a map.
*
* @param {ol.Map} mapObj The OpenLayers map object containing the overlays to hide.
* @param {Boolean} [includeStatic=false] If true, even overlays currently containing a
* <code>static=true</code> property are hidden, otherwise they are unaffected.
*/
function hideAllOverlays(mapObj, includeStatic=false) {
  var overlays = mapObj.getOverlays();
  var length = overlays.getLength();
  for (var count=0; count < length; count++) {
    var currentOverlay = overlays.item(count);
    var isStatic = currentOverlay.get("static");
    if (isStatic == true) {
      if (includeStatic == true) {
        currentOverlay.element.style.visibility = "hidden";
      }
    } else {
      currentOverlay.element.style.visibility = "hidden";
    }
  }
}

/**
* Adds a marker to a layer object.
*
* @param {ol.layer.Vector} layerObj The Vector layer object to add the marker to
* @param {Number} latitude The latitude if the marker, in decimal degrees.
* @param {Number} longitude The longitude if the marker, in decimal degrees.
* @param {String} iconPath The path or alias of the icon to add to the map.
* @param {String} content The popup content to show when the user clicks on the map
* icon.
*/
function addMapMarker(layerObj, latitude, longitude, iconPath, content) {
  var iconFeature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([Number(longitude), Number(latitude)]))
  });
  iconFeature.set("content", content);
  var iconStyle = new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 46],
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      src: iconPath
    }),
  });
  iconFeature.setStyle(iconStyle);
  var layerSource = layerObj.getSource();
  if (layerSource == null) {
    //new features
    layerSource = new ol.source.Vector({
        features: [iconFeature]
    });
    layerObj.setSource(layerSource);
  } else {
    //existing features
    //var features = layerSource.getFeatures();
    layerSource.addFeature(iconFeature);
  }
  return (iconFeature);
}

/**
* Adds multiple markers to a layer object.
*
* @param {ol.layer.Vector} layerObj The Vector layer object to add the marker to
* @param {Array} markersArr Indexed array of marker object, each containing a <code>latitude</code>
* property, <code>longitude</code>, the <code>iconPath</code> or alias, and the icon's popup <code>content</code>.
*/
function addMapMarkers(layerObj, markersArr) {
  var features = new Array();
  for (var count=0; count < markersArr.length; count++) {
    var marker = markersArr[count];
    var latitude = Number(marker.latitude);
    var longitude = Number(marker.longitude);
    var iconPath = iconAlias(marker.icon);
    var script = `<script type="text/javascript" language="javascript" charset="utf-8">${marker.script} alert("Script added!");</script>`;
    var content = marker.content;
    var iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude]))
    });
    iconFeature.setId(Math.random());
    features.push(iconFeature);
    iconFeature.set("content", content);
    var iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        anchor: [0.5, 46],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: iconPath
      }),
    });
    iconFeature.setStyle(iconStyle);
    var layerSource = layerObj.getSource();
    if (layerSource == null) {
      //new features
      layerSource = new ol.source.Vector({
          features: [iconFeature]
      });
      layerObj.setSource(layerSource);
    } else {
      //existing features
      //var features = layerSource.getFeatures();

    }
  }
  layerSource.addFeatures(features);
  return (features);
}

/**
* Adds event listeners and other handlers to the defeault map object (<code>maps[0]</code>).
*/
function addMapHandlers() {
  for (var count=0; count<maps.length; count++) {
    var map = maps[count];
    map.on('click', function (evt) {
      var coordLonLat = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
      var feature = maps[0].forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      });
      var overlay = getMapOverlay(maps[0], "generic");
      var element = overlay.element;
      var content = element.querySelector("#popup-content");
      if (feature) {
        var coordinates = feature.getGeometry().getCoordinates();
        overlay.setPosition(coordinates);
        content.innerHTML = feature.get("content");
        element.style.visibility = "visible";
      } else {
        content.innerHTML = "";
        element.style.visibility = "hidden";
      }
      var msg = new Object();
      msg.status = "mapclick";
      msg.coordinates = new Object();
      msg.coordinates.longitude = coordLonLat[0];
      msg.coordinates.latitude = coordLonLat[1];
      messaging.broadcast(msg);
    });
    map.on('pointermove', function (evt) {
      var feature = maps[0].forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      });
    });
    map.getTargetElement().addEventListener("mouseout", (event) => {
    //  hideAllOverlays(map);
    });
  }
}

/**
* Adds an overlay layer to a map object.
*
* @param {ol.Map} mapObj The OpenLayers map object to add the overlay to.
* @param {HTMLElement} element The element containing the overlay to add to the map.
* @param {Boolean} static If true, the new layer is marked as static.
*
* @return {ol.Overlay} The newly-added overlay object.
*/
function addMapOverlay(mapObj, element, overlayId, static=false) {
  var overlay = new ol.Overlay({
    element: element,
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -50],
    stopEvent: true,
    id: overlayId
  });
  overlay.set("static", static);
  mapObj.addOverlay(overlay);
  return (overlay);
}

/**
* Creates an overlay element and appends it as a child of a map object.
*
* @param {ol.Map} mapObj The OpenLayers map object to create the overlay element for.
* @param {String} [CSSClass=null] The CSS class to assign to the new overlay element.
*
* @return {HTMLElement} The new overlay container element.
*/
function createOverlay(mapObj, CSSClass=null) {
  var div = document.createElement("div");
  var overlayClass = "ol-popup";
  if (CSSClass != null) {
    overlayClass += " "+CSSClass;
  }
  div.setAttribute("class", overlayClass);
  var closer = document.createElement("a");
  closer.setAttribute("href", "#");
  closer.setAttribute("id", "popup-closer");
  closer.setAttribute("class", "ol-popup-closer");
  var content = document.createElement("div");
  content.setAttribute("id", "popup-content");
  div.appendChild(content);
  mapObj.getTargetElement().appendChild(div);
  return (div);
}

/**
* Opens an external Goodle Maps Street View window.
*
* @param {String} url The Street View url to load into the new window.
*/
function openStreetViewWindow(url) {
  var myWindow = window.open(url, "Google Maps Street View", "width=600,height=600,menubar=no,scrollbars=no,status=no");
}

/**
* Event listener invoked when then default map object (<code>maps[0]</code>) is ready.
*
* @param {Event} event A "tileloadend" event.
*/
function onMapReady(event) {
  event.target.removeEventListener ("tileloadend", onMapReady);
  addMapOverlay(maps[0], createOverlay(maps[0], "map-location"), "generic");
  addMapHandlers();
  messaging.broadcast({status:"ready",source:"map"});
}

window.onload = function() {
  var mapElement = document.querySelector("#map");
  var layerSource = new ol.source.OSM({
    attributions: [attributionsHTML]
  });
  var attribution = new ol.control.Attribution({
    collapsible: true,
    label:"+"
  });
  var map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: layerSource
      }),
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([-79.3832,43.6532]),
      zoom: 12
    }),
    controls: ol.control.defaults({attribution: false}).extend([attribution]),
  });
  maps.push(map);
  layerSource.addEventListener ("tileloadend", onMapReady);
}
