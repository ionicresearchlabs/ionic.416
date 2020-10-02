/**
* @file Manages the functionality of the IONIC real-time feeds (rtfeeds) component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

var feedsMessaging = new Messaging("Feeds"); //"Feeds" messsaging channel
var mapMessaging = new Messaging("Map"); //"Map" messsaging channel

var ticker = null; //Ticker instance
var pauseTimeout = null; //current pause timeout object (as returned by setTimeout)
var lastTickerRefresh = -1; //last time ticker was manually refreshed (UNIX epoch milliseconds)
var manualTickerRefreshAllowed = 600000; //how often ticker is allowed to be refreshed manually
//These could also be loaded externally:
var feedSources = [
  {
    "url": "sources/TorontoPoliceFeed.js",
    "class": "TorontoPoliceFeed",
    "loader": null,
    "instance": null,
    "ticker": true,
    "mapMarker":"police"
  },
  {
    "url": "sources/TorontoFireFeed.js",
    "class": "TorontoFireFeed",
    "loader": null,
    "instance": null,
    "ticker": true,
    "mapMarker":"fire"
  },
  {
    "url": "sources/TorontoPoliceNewsFeed.js",
    "class": "TorontoPoliceNewsFeed",
    "loader": null,
    "instance": null,
    "ticker": false,
    "mapMarker": "policenews"
  },
  {
    "url": "sources/TorontoPoliceTwitterFeed.js",
    "class": "TorontoPoliceTwitterFeed",
    "loader": null,
    "instance": null,
    "ticker": false,
    "mapMarker": null
  }
]

/**
* Event handler invoked when a "Feeds" request message is received, usually from another component.
*
* @param {Event} event The messaging event to process.
*
* @async
*/
async function onFeedRequest(event) {
  var data = event.data;
  var requestType = data.request;
  switch (requestType) {
    case "isReady":
      feedsMessaging.broadcast({
        status:"ready",
        database:"ionic",
        feedSources:feedSources
      });
      break;
    case "resolveDetailsHTML":
      var feedSource = data.source;
      var dataItem = data.dataItem;
      var detailLevel = data.detailLevel;
      for (var count = 0; count < feedSources.length; count++) {
        var currentSource = feedSources[count];
        if (currentSource.class == feedSource) {
          var detailHTML =  await currentSource.instance.resolveDetailsHTML(dataItem, detailLevel);
          var responseObj = new Object();
          responseObj.status = requestType;
          responseObj.dataItem = dataItem;
          responseObj.detailLevel = detailLevel;
          responseObj.detailHTML = detailHTML;
          feedsMessaging.broadcast(responseObj)
        }
      }
      break;
    case "showItemOnMap":
      onClickItem(data.source, data.id)
      break;
    default:
      break;
  }
}

/**
* Loads and automatically instantiates feed sources from a list.
*
* @param {Array} sourcesList Indexed array of feed source definition objects to load.
*
* @return {Promise} Resolves when all sources have successfully been loaded and initialized.
*/
function loadFeedSources(sourcesList) {
  var promise = new Promise((resolve, reject) => {
    var remaining = sourcesList.length;
    for (var count=0; count < sourcesList.length; count++) {
      var source = sourcesList[count];
      var loader = new ScriptLoader();
      source.loader = loader;
      loader.load(source.url).then(this.onLoadFeedSource.bind(this, source, sourcesList, {resolve, reject}));
    }
  })
  return (promise);
}

/**
* Handles the completion of loading of a single feed source.
*
* @param {Object} source An object containing the source's information.
* @param {Array} sourcesList An object containing the source's information.
*/
function onLoadFeedSource(source, sourcesList, promise, scriptElement) {
  var classObj = new Function(`return (new ${source.class}());`);
  source.instance = classObj();
  for (var count=0; count < sourcesList.length; count++) {
    if (sourcesList[count].instance == null) {
      return;
    }
  }
  promise.resolve(sourcesList);
}

/**
* Updates the ticker when feed (or similar object), dispatches an "onparse" event.
*
* @param {Event} event An event object.
*
* @async
*/
async function updateTicker(event) {
  var messages = new Array();
  var now = new Date();
  var nowMS = now.getTime();
  var limitHours = 1;
  var limitMS = limitHours * 60 * 60 * 1000;
  for (var count=0; count < feedSources.length; count++) {
    var currentSource = feedSources[count];
    var currentInstance = currentSource.instance;
    if ((currentInstance != null) && (currentSource.ticker == true)) {
      if (currentInstance.latestData != null) {
        for (var count2=0; count2 < currentInstance.latestData.length; count2++) {
          var dataItem = currentInstance.latestData[count2];
          if (dataItem.datetime.id != null) {
            var itemMS = dataItem.datetime.event.getTime();
            if (Math.abs(nowMS-itemMS) <= limitMS) {
              var summaryHTML = await currentInstance.resolveDetailsHTML(dataItem, "summary");
              messages.push(summaryHTML);
            }
          } else {
            summaryHTML = dataItem.summaryHTML;
            messages.push(summaryHTML);
          }
        }
      }
    }
  }
  ticker.update(messages);
}

/**
* Performs an initial (or forced) refresh of the feed sources and subsequently ticker.
*
* @async
*/
async function refreshTickerData() {
  if (ticker == null) {
    ticker = new Ticker("#ticker");
  }
  var now = new Date();
  if (lastTickerRefresh < 0) {
    lastTickerRefresh = now.getTime();
  } else {
    var delta = now.getTime() - lastTickerRefresh;
    if (delta >= manualTickerRefreshAllowed) {
      lastTickerRefresh = now.getTime();
    } else {
      var remaining = manualTickerRefreshAllowed - delta;
      console.warn ("Manual feeds refresh blocked, "+Math.round(remaining / 1000)+" seconds until allowed.");
      return (false);
    }
  }
  ticker.update(["...loading..."]);
  for (var count=0; count < feedSources.length; count++) {
    console.log (`Refreshing ${feedSources[count].instance.toString()}...`);
    if (feedSources[count].instance != null) {
      feedSources[count].instance.latestData = new Array();
      feedSources[count].instance.latestDataRaw = new Array();
      feedSources[count].instance.load().then((event) => {
        console.log (`${event.source.toString()} refreshed.`);
      })
    }
  }
}

window.onload = function() {
  loadFeedSources(feedSources).then(success => {
    console.log ("All feed sources loaded. Running startup checks...");
    var promises = new Array();
    for (var count=0; count < feedSources.length; count++) {
      var instance = feedSources[count].instance;
      instance.addEventListener("onparse", updateTicker.bind(this));
      promises.push(instance.checkDatabase());
    }
    Promise.all(promises).then (_ => {
      console.log ("All feed sources ready.");
      feedsMessaging.addEventListener("message", onFeedRequest);
      refreshTickerData();
      feedsMessaging.broadcast({
        status:"ready",
        database:"ionic",
        feedSources:feedSources
      });
    })
  });
}

/**
* Handles any "mousemove" events, pausing the ticker for 3.5 seconds if possible.
*/
window.addEventListener("mousemove", (event) => {
  try {
    clearTimeout(pauseTimeout);
  } catch (err) {
  } finally {
    ticker.pause();
    pauseTimeout = setTimeout(ticker.unpause.bind(ticker), 3500);
  }
})

/**
* Returns a source from the global <code>sourcesList</code> object by its
* stated class.
*
* @param {Array} sourcesList Indexed array of source objects.
* @param {String} sourceClass The "class" property of the source object to find.
*
* @return {Object} The matching source object, or null if none can be found.
*/
function getSourceByClass(sourcesList, sourceClass) {
  for (var count=0; count < sourcesList.length; count++) {
    if (sourcesList[count].class == sourceClass) {
      return (sourcesList[count]);
    }
  }
  return (null);
}

/**
* Handles the click on an item's location link (set in each feed source),
* automatically putting a marker and zooming to the location in a listening
* map component.
*
* @param {String} sourceClass The "class" property of the source.
* @param {String} itemId The unique item identifier that was clicked.
*
*/
function onClickItem(sourceClass, itemId) {
  try {
     var source = getSourceByClass(feedSources, sourceClass);
     source.instance.getItemById(itemId).then(result => {
       putItemMarkerOnMap(result, source, "incidents");
       showItemOnMap(result, source);
     })
  } catch (err) {
    console.error(err);
  }
}

/**
* Adds an item marker on a listening map component.
*
* @param {Object} item The full data object of the item to place.
* @param {Object} source The feed source object that generated the <code>item</code>.
* @param {String} layerName The designated map layer name to add the marker into in the
* target map component.
*
* @async
*/
async function putItemMarkerOnMap(item, source, layerName) {
  var requestObj = new Object();
  requestObj.request = "addMarker";
  requestObj.layer = layerName;
  requestObj.icon = source.mapMarker;
  var latLonObj = await source.instance.resolveLatLon(item);
  if (latLonObj == null) {
    //open window in showItemOnMap
    return;
  }
  requestObj.latitude = latLonObj.latitude;
  requestObj.longitude = latLonObj.longitude;
  var detailsHTML = await source.instance.resolveDetailsHTML(item, "details");
  requestObj.content = detailsHTML;
  mapMessaging.broadcast(requestObj);
}

/**
* Flies to item marker or point within a listening map component.
*
* @param {Object} item The full data object of the item to fly to.
* @param {Object} source The feed source object that generated the <code>item</code>.
*
* @async
*/
async function showItemOnMap(item, source) {
  var requestObj = new Object();
  requestObj.request = "fly";
  requestObj.type = "point";
  requestObj.category = "incident";
  var latLonObj = await source.instance.resolveLatLon(item);
  if (latLonObj == null) {
    var link = await source.instance.resolveExternalURL(item);
    if (link == null) {
      alert ("No location or extarnal link available for item.");
    } else {
      window.open(link);
    }
    return;
  }
  requestObj.latitude = latLonObj.latitude;
  requestObj.longitude = latLonObj.longitude;
  requestObj.zoom = 15;
  requestObj.zoomHeight = 12;
  requestObj.duration = 2000;
  mapMessaging.broadcast(requestObj);
}
