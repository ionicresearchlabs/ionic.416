/**
* @file Manages the functionality of the IONIC incidents list component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

var feedsMessaging = new Messaging("Feeds");
var mapMessaging = new Messaging("Map");
var feedsReady = false;
var activeRequests = new Array();
var incidentsCache = new Array();
var incidentsHold = new Array(); //new or updated items added here during startup
var incidentsVisible = 0;
var startup = true;
var currentSort = "dateDesc";
var db = new Database();
var activeFilter = "none";

/**
* Event handler for inter-window / iframe messaging for the "Feeds" channel.
* The "status" property of the message determines how the message is handled.
* Valid statuses include:
* "ready" - Adds UI handlers for the filters inputs and begins to populate the
* incident list with items from the database.
* "resolveDetailsHTML" - Called when a "resolveDetailsHTML" response is received
* from the feeds handler.
* "newItem" - Received from the feeds handler when a new item has just been
* processed and added to the database.
" updateItem" - Received from the feeds handler when an existing item has just been
* processed and updated in the database (usually with additional information).
*/
feedsMessaging.addEventListener("message", (event) => {
  var data = event.data;
  switch (data.status) {
    case "ready":
      if (feedsReady == true) {
        //already received notification
        return;
      }
      feedsReady = true;
      addFilterUIHandlers();
      loadIncidents(data.database, data.feedSources);
      break;
    case "resolveDetailsHTML":
      var dataItem = data.dataItem;
      var detailLevel = data.detailLevel;
      var detailsHTML = data.detailHTML;
      var activeRequest = getActiveRequest(dataItem, activeRequests);
      if (activeRequest != null) {
        activeRequest.promise.resolve(detailsHTML);
      } else {
        //Retrieved details HTML but doesn't match any active request
      }
      break;
    case "newItem":
      if (startup) {
        incidentsHold.push(data);
        return;
      }
      disableFilterUI();
      var dataItem = data.dataItem;
      var source = data.source;
      addNewIncident(source, dataItem);
      enableFilterUI();
      break;
    case "updateItem":
      if (startup) {
        incidentsHold.push(data);
        return;
      }
      disableFilterUI();
      console.log ("Adding extended details to item: "+data.dataItem.id)
      var dataItem = data.dataItem;
      var source = data.source;
      updateIncident(source, dataItem);
      enableFilterUI();
      break;
    default:
      break;
  }
})

/**
* Adds handlers (listeners) for events dispatched by filters UI elements.
*/
function addFilterUIHandlers() {
  var radioButtons = document.querySelectorAll(`#filters > #container > input[type="radio"]`);
  for (var count=0; count < radioButtons.length; count++) {
    radioButtons[count].addEventListener("change", this.onFilterUIChange.bind(this, "radio", radioButtons[count]));
  }
  var typeFilterSelect = document.querySelector(`#filters > #container > #typeOptions`);
  typeFilterSelect.addEventListener("change", this.onFilterUIChange.bind(this, "select", typeFilterSelect));
}

/**
* Enables the filters UI elements to allow user input.
*/
function enableFilterUI() {
  var radioButtons = document.querySelectorAll(`#filters > #container > input[type="radio"]`);
  for (var count=0; count < radioButtons.length; count++) {
    radioButtons[count].removeAttribute("disabled");
  }
  var selects = document.querySelectorAll(`#filters > #container > select`);
  for (count=0; count < selects.length; count++) {
    selects[count].removeAttribute("disabled");
  }
}

/**
* Disables the filters UI elements in order to block user input.
*/
function disableFilterUI() {
  var radioButtons = document.querySelectorAll(`#filters > #container > input[type="radio"]`);
  for (var count=0; count < radioButtons.length; count++) {
    radioButtons[count].setAttribute("disabled", "true");
  }
  var selects = document.querySelectorAll(`#filters > #container > select`);
  for (count=0; count < selects.length; count++) {
    selects[count].setAttribute("disabled", "true");
  }
}

/**
* Adds an incident type to the filter type UI element (pulldown), if it's unique.
*
* @param {String} type The unique filter type to add to the list.
* @param {String} description The description that will appear in the list to the user
* for the associated filter item.
*/
function addToTypeFilter(type, description) {
  var existingOptions = document.querySelectorAll(`#filters > #container > #typeOptions > option`);
  for (var count=0; count < existingOptions.length; count++) {
    var currentOption = existingOptions[count];
    var optionType = currentOption.getAttribute("value");
    if (optionType == type) {
      //already exists in options list
      return;
    }
  }
  var option = document.createElement("option");
  option.setAttribute("value", type);
  option.innerHTML = description;
  var selectElement = document.querySelector(`#filters > #container > #typeOptions`);
  selectElement.append(option);
}

/**
* Event handler invoked when a filters UI item has been changed by the user. This
* listener is bound (<code>.bind</code>) to receive some additional information with
* each event.
*
* @param {String} elementType The descriptive element type that has just changed.
* @param {HTMLElement} element A reference to the element that had just changed.
* @param {Event} event The change (or similar) event dispatched by the <code>element</code>.
*/
async function onFilterUIChange(elementType, element, event) {
  disableFilterUI();
  switch (elementType) {
    case "radio":
      var optionName = element.getAttribute("name");
      var optionSelected = document.querySelector(`input[name="${optionName}"]:checked`).value;
      activeFilter = optionSelected;
      await applyFilter(optionSelected, null);
      break;
    case "select":
      var groupName = element.getAttribute("group");
      var optionName = element.getAttribute("value");
      var optionSelected = document.querySelector(`input[name="${groupName}"]:checked`).value;
      if (optionSelected == optionName) {;
        activeFilter = optionName;
        await applyFilter(optionSelected, null);
      }
      break;
  }
  enableFilterUI();
}

/**
* Determines if a cached item is currently being filtered (usually by a filters UI
* setting).
*
* @param {Object} cacheItem The cached item to examine.
*
* @return {Boolean} True of the cached item is currently being filteres (should not be
* displayed), true otherwise (should be displayed).
*/
async function isFiltered(cacheItem) {
  var result = await applyFilter(activeFilter, cacheItem)
  return (result);
}

/**
* Checks if an individual cached item should be filtered or applies a filter
* to the entire internal list of cached items (<code>incidentsCache</code>).
*
* @param {String} filterType The type of filter to check for or apply. Valid
* filter types include "none" (all items), "details" (only items with extended details),
* and "type" (only items of a specific type, as selected in the <code>#typeOptions</code>
* pulldown).
* @param {Object} [cacheItem=null] The cache item to examine. If null, the specified filter
* is applied to the entire list of cached items.
*
* @return {Boolean} True if the <code>cacheItem</code> parameter is specified, is non-null,
* and should be displayed according to the specified <code>filterType</code>. True is always
* returned if <code>cacheItem</code> is null.
* @async
*/
async function applyFilter(filterType, cacheItem=null) {
  var dataItem = null;
  if (cacheItem != null) {
    dataItem = cacheItem.dataItem;
  }
  var cacheSize = incidentsCache.length;
  switch (filterType) {
    case "none":
      if (dataItem != null) {
        return (false);
      }
      for (var count=0; count < incidentsCache.length; count++) {
        var currentIncident = incidentsCache[count];
        if (currentIncident.element.style.display != "inline-block") {
          incidentsVisible++;
        }
        currentIncident.element.style.display = "inline-block";
        updateProgressStatus((count+1),cacheSize);
        updateVisibleStatus(incidentsVisible);
        await waitDelay(1);
      }
      break;
    case "details":
      if (dataItem != null) {
        if ((dataItem.details != undefined) && (dataItem.details != null)) {
          return (false);
        } else {
          return (true);
        }
      } else {
        for (var count=0; count < incidentsCache.length; count++) {
          var currentIncident = incidentsCache[count];
          if ((currentIncident.dataItem.details != undefined) && (currentIncident.dataItem.details != null)) {
            if (currentIncident.element.style.display != "inline-block") {
              incidentsVisible++;
            }
            currentIncident.element.style.display = "inline-block";
          } else {
            if (currentIncident.element.style.display != "none") {
              incidentsVisible--;
            }
            currentIncident.element.style.display = "none";
          }
          updateProgressStatus((count+1),cacheSize);
          updateVisibleStatus(incidentsVisible);
          await waitDelay(1);
        }
      }
      break;
    case "type":
      var listElement = document.querySelector(`#filters > #container > #typeOptions`);
      var filterByType = listElement.options[listElement.selectedIndex].value;
      if (dataItem != null) {
        if (filterByType == dataItem.type) {
          return (false);
        } else {
          return (true);
        }
      } else {
        for (count=0; count < incidentsCache.length; count++) {
          var currentIncident = incidentsCache[count];
          if (currentIncident.dataItem.type == filterByType) {
            if (currentIncident.element.style.display != "inline-block") {
              incidentsVisible++;
            }
            currentIncident.element.style.display = "inline-block";
          } else {
            if (currentIncident.element.style.display != "none") {
              incidentsVisible--;
            }
            currentIncident.element.style.display = "none";
          }
          updateProgressStatus((count+1),cacheSize);
          updateVisibleStatus(incidentsVisible);
          await waitDelay(1);
        }
      }
      break;
  }
  return (true);
}

/**
* Updates the progress display UI (<code>#options > #statusDisplay > #progress</code>).
*
* @param {Number} currentNum The current item number being processed.
* @param {Number} totalNum The total number of items to be processed.
*/
function updateProgressStatus(currentNum, totalNum) {
  var statusHTML = `${Math.round((currentNum / totalNum) * 100)}%`;
  var element = document.querySelector("#options > #statusDisplay > #progress");
  element.innerHTML = statusHTML;
}

/**
* Updates the total items display UI (<code>#options > #statusDisplay > #total</code>).
*
* @param {Number} totalNum The total number of items available.
*/
function updateTotalStatus(totalNum) {
  var statusHTML = `${totalNum}`;
  var element = document.querySelector("#options > #statusDisplay > #total");
  element.innerHTML = statusHTML;
}

/**
* Updates the visible items display UI (<code>#options > #statusDisplay > #displaying</code>).
*
* @param {Number} visibleNum The number of items currently visible.
*/
function updateVisibleStatus(visibleNum) {
  var statusHTML = `${visibleNum}`;
  var element = document.querySelector("#options > #statusDisplay > #displaying");
  element.innerHTML = statusHTML;
}

/**
* Processes any incidents that are being held, usually because the incidents list
* UI was disabled (being built, filtered, etc.) Held incidents will automatically
* be added the internal <code>incidentsCache</code> array.
*
* @param {Array} holdsArray Indexed array of cache item objects.
*
* @return {Boolean} True when all held items have been processed and added to the UI.
* @async
*/
async function processHeldIncidents(holdsArray) {
  while (holdsArray.length > 0) {
    var currentHold = holdsArray.pop();
    switch (currentHold.status) {
      case "newItem":
        var dataItem = currentHold.dataItem;
        var source = currentHold.source;
        await addNewIncident(source, dataItem);
        break;
      case "updateItem":
        var dataItem = currentHold.dataItem;
        var source = currentHold.source;
        await updateIncident(source, dataItem);
        break;
    }
  }
  return (true);
}

/**
* Updates an incident currently existing in the internal <code>incidentsCache</code>
* and the UI.
*
* @param {String} source The feeds source that the associated data item belongs to
* (e.g."TorontoPoliceFeed").
* @param {object} dataItem The associated data item containing updated information.
*
* @return {Boolean} True when the item had been updated, or false if no matching item
* exists in the internal <code>incidentsCache</code>
* @async
*/
async function updateIncident(source, dataItem) {
  var updatedCacheItem = new Object();
  updatedCacheItem.dataItem = dataItem;
  updatedCacheItem.detailsHTML = await getDetailsHTML(dataItem, source);
  updatedCacheItem.source = source;
  updatedCacheItem.element = null;
  for (var count=0; count<incidentsCache.length; count++) {
    var currentIncident = incidentsCache[count];
    if ((currentIncident.dataItem.id == dataItem.id) && (currentIncident.source == source)) {
      await updateIncidentList(updatedCacheItem, "update", currentIncident.element);
      return (true);
    }
  }
  return (false);
}

/**
* Adds a new existing to the internal <code>incidentsCache</code> and the UI.
* No duplication checking is attempted.
*
* @param {String} source The feeds source that the associated data item belongs to
* (e.g."TorontoPoliceFeed").
* @param {object} dataItem The new data item to add.
*
* @return {Boolean} True when the item had been added.
* @async
*/
async function addNewIncident(source, dataItem) {
  var insertObj = new Object();
  insertObj.dataItem = dataItem;
  insertObj.source = source;
  insertObj.detailsHTML = await getDetailsHTML(dataItem, source);
  insertObj.element = null;
  if (currentSort == "dateDesc") {
    var precedingIndex = getNewestIndexBefore(insertObj, incidentsCache);
    if (precedingIndex > 0) {
      var precedingItem = incidentsCache[precedingIndex];
      incidentsCache.splice(precedingIndex, 0, insertObj);
      await updateIncidentList(insertObj, "prepend", precedingItem.element);
    } else {
      incidentsCache.unshift(insertObj);
      await updateIncidentList(insertObj, "prepend");
    }
  } else if (currentSort == "dateAsc") {
    //NOT TESTED!
    var procedingIndex = getOldestIndexAfter(insertObj, incidentsCache);
    if (procedingIndex > 0) {
      var procedingItem = incidentsCache[procedingIndex];
      incidentsCache.splice((precedingIndex+1), 0, insertObj);
      await updateIncidentList(insertObj, "append", procedingItem.element);
    } else {
      incidentsCache.unshift(insertObj);
      await updateIncidentList(insertObj, "prepend");
    }
  }
  updateVisibleStatus(incidentsVisible);
  updateTotalStatus(incidentsCache.length);
  await waitDelay(1);
  return (true);
}

/**
* Returns the index of the cache item that appears immediately before
* the specified item in a sorted list of items, according to their event date/times.
*
* @param {Object} beforeItem The cache item containing a <code>dataItem.datetime.event</code>
* Date object that immediately follows the target item in the list.
* @param {Array} itemList An indexed array of sorted cache items to look through.
*
* @return {Number} The index of the item currently preceding the <code>beforeItem</code> item
* in the <code>itemList</code>.
*/
function getNewestIndexBefore(beforeItem, itemList) {
  if (itemList.length == 0) {
    return (0);
  }
  var newestBeforeIndex = 0;
  var timeDiff = Number.MAX_SAFE_INTEGER;
  for (var count=0; count < itemList.length; count++) {
    var dataItem = itemList[count].dataItem;
    var dataItemTime = dataItem.datetime.event.getTime();
    var beforeItemTime = beforeItem.dataItem.datetime.event.getTime();
    var currentTimeDiff = beforeItemTime - dataItemTime;
    if ((currentTimeDiff >= 0) && (currentTimeDiff < timeDiff)) {
      timeDiff = currentTimeDiff;
      newestBeforeIndex = count;
    }
  }
  return (newestBeforeIndex);
}

/**
* Returns the index of the cache item that appears immediately after
* the specified item in a sorted list of items, according to their event date/times.
*
* @param {Object} afterItem The cache item containing a <code>dataItem.datetime.event</code>
* Date object that immediately precedes the target item in the list.
* @param {Array} itemList An indexed array of sorted cache items to look through.
*
* @return {Number} The index of the item currently following the <code>afterItem</code> item
* in the <code>itemList</code>.
*/
function getOldestIndexAfter(afterItem, itemList) {
  //NOT TESTED!
  if (itemList.length == 0) {
    return (0);
  }
  var oldestAfterIndex = 0;
  var timeDiff = Number.MAX_SAFE_INTEGER;
  for (var count=0; count < itemList.length; count++) {
    var dataItem = itemList[count].dataItem;
    var dataItemTime = dataItem.datetime.event.getTime();
    var afterItemTime = afterItem.dataItem.datetime.event.getTime();
    var currentTimeDiff = dataItemTime - afterItemTime;
    if ((currentTimeDiff >= 0) && (currentTimeDiff > timeDiff)) {
      timeDiff = currentTimeDiff;
      oldestAfterIndex = count;
    }
  }
  return (oldestAfterIndex);
}

/**
* Performs an initial load of incidents from the IndexedDB of a particular feed source, and
* adds those items to the UI.
*
* @param {String} dbName The name of the database to open (e.g. "ionic").
* @param {String} source The name of the feed source / object store to open (e.g. "TorontoPoliceFeed").
*
* @return {Boolean} True when successfully completed, false if something went wrong.
* @async
*/
async function loadIncidents(dbName, sources) {
  console.log ("Loading existing incidents from database: "+dbName);
  disableFilterUI();
  try {
    var result = await db.open(dbName);
  } catch (err) {
    console.error ("Incident List couldn't open database \""+dbName+"\"");
    console.dir (err);
    return (false);
  }
  for (var count=0; count < sources.length; count++) {
    var currentSource = sources[count];
    if (currentSource.ticker == true) {
      //only include display sources
      var objectStoreName = currentSource.class; //assume store name is same as class name
      var searchResults = await db.search ("{", "*", objectStoreName); //return everything since all JSON objects will contain "{"
      for (var count2 = 0; count2 < searchResults.length; count2++) {
        var dataItem = searchResults[count2];
        var detailsHTML = await getDetailsHTML(dataItem, objectStoreName);
        var cacheObj = new Object();
        cacheObj.dataItem = dataItem;
        cacheObj.source = searchResults;
        cacheObj.detailsHTML = detailsHTML;
        cacheObj.element = null;
        incidentsCache.push(cacheObj);
      }
    }
  }
  incidentsCache = await sortItems(incidentsCache, "dateDesc", updateIncidentList);
  startup = false;
  await processHeldIncidents(incidentsHold); //some incidents may have been added or updated while list was being generated
  enableFilterUI();
  return (true);
}


/**
* Generates a list UI header for a specified cache item.
*
* @param {Object} cacheItem The cache object for which to generate a list UI header.
*
* @return {String} The UI HTML header of the cache object.
*/
function incidentHeader(cacheItem) {
  var dataItem = cacheItem.dataItem;
  var dtOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }
  var eventTime = new Intl.DateTimeFormat('en', dtOptions).format(dataItem.datetime.event);
  var receivedTime = new Intl.DateTimeFormat('en', dtOptions).format(dataItem.datetime.received);
  var extraPropertiesHTML = "&nbsp;";
  if ((dataItem.details != undefined) && (dataItem.details != null)) {
    extraPropertiesHTML += `<i class="fa fa-flag extra-details"></i>&nbsp;`;
  }
  var headerHTML = `<span class="incident-times"><i class="fa fa-clock"></i>&nbsp;${eventTime}&nbsp;&nbsp;&nbsp;<i class="fa fa-download"></i>&nbsp;${receivedTime}</span><span class="extra-incident-properties">${extraPropertiesHTML}</span><br/>`;
  return (headerHTML);
}

/**
* Updates the incidents list UI with a specific cache item.
*
* @param {Object} cacheItem The cache item to update the list with.
* @param {String} [type="append"] The type of update to apply to the UI. Valid
* types include "append" (add to the end), "prepend" (add to the beginning),
* "update" (replace the existing element in the UI with the new information in
* the <code>cacheItem</code>), and "remove" (remove the cache item from the incidents
* list UI).
*
* @return {HTMLElement} A reference to the UI element that was just added, updated, or
* removed.
* @async
*/
async function updateIncidentList(cacheItem, type="append", targetElement=null) {
  var element = document.createElement("div");
  element.setAttribute("class", "list-item");
  var filterItem = await isFiltered(cacheItem);
  if (filterItem == true) {
    element.style.display = "none";
  } else {
    element.style.display = "inline-block";
  }
  var detailsHTML = cacheItem.detailsHTML;
  detailsHTML = detailsHTML.split(`<summary>`).join(`<summary>${incidentHeader(cacheItem)}`);
  element.innerHTML = detailsHTML;
  var listElement = document.querySelector("#list-container");
  switch (type) {
    case "append":
      if (targetElement == null) {
        listElement.append(element);
      } else {
        targetElement.after(element);
      }
      if (filterItem == false) {
        incidentsVisible++;
      }
      break;
    case "prepend":
      if (targetElement == null) {
        listElement.prepend(element);
      } else {
        targetElement.before(element);
      }
      if (filterItem == false) {
        incidentsVisible++;
      }
      break;
    case "update":
      targetElement.before(element);
      targetElement.remove();
      break;
    case "remove":
      //TODO: implement item removal
      break;
  }
  cacheItem.element = element;
  addToTypeFilter(cacheItem.dataItem.type, cacheItem.dataItem.type);
  return (element);
}

/**
* A simple promise-based code delay.
*
* @param {Number} [ms=1] The number milliseconds to delay.
*
* @return {Promise} Resolves true when the specified delay has completed.
*/
function waitDelay(ms=1) {
  var promise = new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  })
  return (promise);
}

/**
* Sorts cache items in a list.
*
* @param {Array} itemList Indexed array of cache items to sort.
* @param {String} sortBy The type of sort to apply to the returned list. Valid
* options include "dateDesc" (descending by date/time), and "dateAsc" (ascending by
* date/time).
* @param {Function} [onSortItem=null] If specified, a function to invoke whenever
* an item is sorted.
*
* @return {Array} A copy of the <code>itemList</code>, sorted as specified.
* @async
*/
async function sortItems(itemList, sortBy="dateDesc", onSortItem=null) {
  var sortedList = new Array();
  var totalItems = itemList.length;
  updateTotalStatus(totalItems);
  var sortedItems = 0;
  if (sortBy == "dateDesc") {
    currentSort = "dateDesc";
  } else {
    //NOT TESTED!
    currentSort = "dateAsc";
  }
  while (itemList.length > 0) {
    switch (sortBy) {
      case "dateDesc":
        var sortedItem = getOldestItem(itemList, true);
        sortedList.unshift(sortedItem);
        await onSortItem(sortedItem, "prepend");
        break;
      case "dateAsc":
        sortedItem = getNewestItem(itemList, true);
        sortedList.unshift(sortedItem);
        await onSortItem(sortedItem, "append");
        break;
      default:
        break;
    }
    sortedItems++;
    updateProgressStatus(sortedItems, totalItems);
    updateVisibleStatus(sortedItems);
    await waitDelay(1);
  }
  return (sortedList);
}

/**
* Returns the newest cache item from a list.
*
* @param {Array} itemList Indexed array of cache items to look through.
* @param {Boolean} [remove=true] True if the newest item should be removed from
* the list, or simply returned (false).
*
* @return {Object} The newest cache item found in the <code>itemList</code>, or
* null if none exists.
*/
function getNewestItem(itemList, remove=true) {
  //NOT TESTED!
  if (itemList.length == 0) {
    return (null);
  }
  var newestItem = itemList[0].dataItem;
  var newestIndex = 0;
  for (var count=1; count < itemList.length; count++) {
    var dataItem = itemList[count].dataItem;
    var dataItemTime = dataItem.datetime.event.getTime();
    var newestItemTime = newestItem.datetime.event.getTime();
    if (newestItemTime < dataItemTime) {
      newestItem = dataItem;
      newestIndex = count;
    }
  }
  if (remove == true) {
    var returnItem = itemList.splice(newestIndex, 1)[0];
  } else {
    returnItem = itemList[newestIndex];
  }
  return (returnItem);
}

/**
* Returns the oldest cache item from a list.
*
* @param {Array} itemList Indexed array of cache items to look through.
* @param {Boolean} [remove=true] True if the oldest item should be removed from
* the list, or simply returned (false).
*
* @return {Object} The oldest cache item found in the <code>itemList</code>, or
* null if none exists.
*/
function getOldestItem(itemList, remove=true) {
  if (itemList.length == 0) {
    return (null);
  }
  var oldestItem = itemList[0].dataItem;
  var oldestIndex = 0;
  for (var count=1; count < itemList.length; count++) {
    var dataItem = itemList[count].dataItem;
    var dataItemTime = dataItem.datetime.event.getTime();
    var oldestItemTime = oldestItem.datetime.event.getTime();
    if (oldestItemTime > dataItemTime) {
      oldestItem = dataItem;
      oldestIndex = count;
    }
  }
  if (remove == true) {
    var returnItem = itemList.splice(oldestIndex, 1)[0];
  } else {
    returnItem = itemList[oldestIndex];
  }
  return (returnItem);
}

/**
* Returns a matching request object from the internal <code>requestsList</code> array.
*
* @param {Object} dataItem The data item containing an <code>.id</code> property
* to match to an item in the <code>requestsList</code>.
* @param {Array} requestsList The list of active requests to look through.
*
* @return {Object} A matching active request object or null if no matching
* request exists.
*/
function getActiveRequest(dataItem, requestsList) {
  for (var count=0; count < requestsList.length; count++) {
    var currentRequest = requestsList[count];
    var requestDataItem = currentRequest.request.dataItem;
    if (requestDataItem.id == dataItem.id) {
      return (requestsList.splice(count, 1)[0])
    }
  }
  return (null);
}

/**
* Makes a request to the data feeds to return details for a specific data item.
*
* @param {Object} dataItem The data item for which to retrieve details.
* @param {String} source The feeds source to which the <code>dataItem</code> exists
* (e.g. "TorontoPoliceFeed").
* @param {String} [detailLevel="details"] The detail level to retrieve for the item, either
* full (extended) "details", or just the "summary".
*
* @return {Promise} Resolves with the result of the request. The request is automatically added
* to the internal <code>activeRequests</code> array until a valid matching response is received.
*/
function getDetailsHTML(dataItem, source, detailLevel="details") {
  var requestEntry = new Object();
  var promise = new Promise((resolve, reject) => {
    requestEntry.promise = {resolve, reject};
    var requestObj = new Object();
    requestObj.request = "resolveDetailsHTML";
    requestObj.source = source;
    requestObj.dataItem = dataItem;
    requestObj.detailLevel = detailLevel;
    requestEntry.request = requestObj;
    feedsMessaging.broadcast(requestObj);
  })
  activeRequests.push(requestEntry);
  return (promise);
}

/**
* Handler called by incidents list UI items when (usually) a location link
* is clicked. This handler and its parameters are set when the details
* for the item are generated, typically within the specific feed source code.
*
* @param {String} sourceClass The feeds source class associated with the item.
* @param {String} itemId The unique ID of the item clicked.
*/
function onClickItem(sourceClass, itemId) {
  var requestObj = new Object();
  requestObj.request = "showItemOnMap"; //show the clicked item in the map component
  requestObj.source = sourceClass;
  requestObj.id = itemId;
  feedsMessaging.broadcast(requestObj);
}

/**
* Handler called by incidents list UI items when (usually) a Google Street View link
* is clicked. This handler and its parameters are set when the details
* for the item are generated, typically within the specific feed source code.
*
* @param {String} url The Street View url of the associated item.
*/
function openStreetViewWindow(url) {
  var requestObj = new Object();
  requestObj.request = "openStreetViewWindow"; //use the map component to actually open a window
  requestObj.url = url;
  mapMessaging.broadcast(requestObj);
}

feedsMessaging.broadcast({request:"isReady"});
