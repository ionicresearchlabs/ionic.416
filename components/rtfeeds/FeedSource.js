/**
* @file A base IONIC data feed source class to be extended by a specific
* implementation.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Base IONIC data feed object. This base class should be extended by a
* specific implementation.
* @extends EventTarget
*/
class FeedSource extends EventTarget {

  /**
  * A standardized incident data item object. Extending implementations may add
  * additional properties so this definition should be considered incomplete.
  *
  * @typedef {Object} FeedSource.IncidentDataItem
  * @property {String} id A unique and immutable identifier for the incident data item.
  * @property {String} raw The raw data string for the associated data item, as initially received.
  * This string may be part of a larger structure.
  * @property {String} type The data item / incident type, or group.
  * @property {Object} items Properties parsed in their raw state from received data. The contents of this object
  * will vary greatly between implementations.
  * @property {String} summaryHTML A brief HTML description of the incident. This property will always be available
  * immediately after a feed parse.
  * @property {String} detailsHTML Extended HTML description of the incident. Feeds updating properties of other feeds
  * will often update this field, but it may also be null.
  * @property {Object} datetime Contains date and time information for the incident.
  * @property {Date} datetime.received The date/time that the incident was received by the application.
  * @property {Date} datetime.event The reported date/time of the incident.
  * @property {Object} location Contains coordinates of the incident.
  * @property {String} location.latitude The latitude of the incident, in decimal degrees. If this hasn't been resolved,
  * the default value will be -1.
  * @property {String} location.longitude The longitude of the incident, in decimal degrees. If this hasn't been resolved,
  * the default value will be -1.
  */

  /**
  * Creates a new instance.
  */
  constructor() {
    super();
    if ((FeedSource._db == undefined) || (FeedSource._db == null)) {
      FeedSource._db = new Database();
    }
    if ((FeedSource._messaging == undefined) || (FeedSource._messaging == null)) {
      FeedSource._messaging = new Messaging("Feeds");
    }
  }

  /**
  * @property {Object} feeds A singleton property of the class storing references to
  * registered feed instances, for easier access.
  *
  * @readonly
  * @private
  */
  get feeds() {
    if ((FeedSource._feeds == undefined) || (FeedSource._feeds == null)) {
      FeedSource._feeds = new Object();
    }
    return (FeedSource._feeds);
  }

  /**
  * @property {IndexedDB} db A shared IndexedDB instance associated with the class. All
  * feeds should use individual object stores within the "ionic" database.
  *
  * @readonly
  */
  get db() {
    //use single database with multiple object stores
    return (FeedSource._db);
  }

  /**
  * @property {Messaging} messaging A shared Messaging instance to use for all "Feeds"
  * channel exchanges.
  *
  * @readonly
  */
  get messaging() {
    return (FeedSource._messaging);
  }


  /**
  * @property {Array} latestData Array of {@link FeedSource.IncidentDataItem} objects parsed from the
  * most recent feed refresh result.
  */
  get latestData() {
    if ((this._latestData == undefined) || (this._latestData == null)) {
      this._latestData = new Array();
    }
    return (this._latestData);
  }

  set latestData(msgsSet) {
    this._latestData = msgsSet;
  }

  /**
  * @property {*} latestDataRaw Raw representation of the latest received data in its native state.
  * @readonly
  */
  get latestDataRaw() {
    if (this._latestDataRaw == undefined) {
      this._latestDataRaw = null;
    }
    return (this._latestDataRaw);
  }

  /**
  * Calls a refresh function after a specific number milliseconds have elapsed.
  *
  * @param {Function} func The function to call when the timer has elapsed.
  * @param {Number} ms The number of milliseconds to delay before invoking the
  * specified function.
  */
  refresh (func, ms) {
    try {
      clearTimeout(this._refreshTimeout);
    } catch (err) {
    } finally {
      this._refreshTimeout = setTimeout(func, ms);
    }
  }

  /**
  * Attempts to resolve / geocode the latitude and longitude of an incident data item.
  *
  * @param {FeedSource.IncidentDataItem} dataItem The incident data item to resolve
  * the coordinates for.
  * @param {Boolean} [updateDataItem=true] If true, the incident data item's
  * <code>location.latitude</code> and <code>location.longitude</code> properties
  * will also be updated.
  *
  * @return {Object} The resolved <code>latitude</code> and <code>longitude</code> coordinates
  * of the incident data item, or null if they can't be resolved / geocoded.
  * @async
  */
  async resolveLatLon(dataItem, updateDataItem=true) {
    return (null);
  }

  /**
  * Resolves the external URL of an incident data item.
  *
  * @param {FeedSource.IncidentDataItem} dataItem The incident data item to find the
  * external url for.
  *
  * @return {String} The external URL of the incident data item.
  * @async
  */
  async resolveExternalURL(dataItem) {
    return (null);
  }

  /**
  * Generates the details of an incident data item as a HTML string.
  *
  * @param {FeedSource.IncidentDataItem} dataItem The incident data item for which
  * to generate the details HTML.
  * @param {String} [detailLevel="summary"] The detail level to return. Valid options
  * include "summary" (brief details) and "details" (extended details).
  *
  * @return {String} The details
  * @async
  */
  async resolveDetailsHTML(dataItem, detailLevel="summary") {
    return (dataItem.summaryHTML);
  }

  /**
  * Sorts an array of [IncidentDataItem]{@link FeedSource.IncidentDataItem} objects by date
  * in descending order (newest first).
  *
  * @param {Array} eventsData Indexed array of {@link FeedSource.IncidentDataItem} objects.
  * This array <b>will be emptied</b> as it's sorted.
  *
  * @return {Array} The sorted array of incident data items in descending order (newest first).
  */
  sortByDate(eventsData) {
    var sorted = new Array();
    while (eventsData.length > 0) {
      var oldestEvent = this.getOldest(eventsData);
      sorted.unshift(oldestEvent);
    }
    return (sorted);
  }

  /**
  * Splices the oldest {@link FeedSource.IncidentDataItem} objects from a list and returns it.
  *
  * @param {Array} eventsData Indexed array of {@link FeedSource.IncidentDataItem} objects from
  *
  * @return {FeedSource.IncidentDataItem} The oldest incident data item removed from the <code>eventsData</code>
  * array.
  */
  getOldest(eventsData) {
    var oldestDate = new Date();
    oldestDate.setFullYear(oldestDate.getFullYear()+1);
    var oldestIndex = 0;
    for (var count=0; count < eventsData.length; count++) {
      var currentEvent = eventsData[count];
      var eventDate = currentEvent.datetime.event;
      if (eventDate.getTime() < oldestDate.getTime()) {
        oldestIndex = count;
        oldestDate = eventDate;
      }
    }
    return (eventsData.splice(oldestIndex, 1)[0]);
  }

  /**
  * Loads or refreshes the feed.
  *
  * @param {String} [customURL=null] Load the feed from a custom URL. If not specified,
  * an internal one will be used.
  * @param {Boolean} [async=true] Use promises instead of events to signal the completion of the
  * feed load and parse.
  * @param {Boolean} [bypassCache=true] If true, the loader adds a pseudo-random parameter to the URL to
  * force both browser and server to bypass content caches.
  *
  * @return {Promise|Boolean} A promise may be returned if <code>async=true</code> otherwise a boolean value
  * indicating a successful initiation of the load process will be returned.
  */
  load(customURL=null, async=true, bypassCache=true) {
    throw (new Error(`Function "load" must be implented by extending class.`));
  }

  /**
  * @property {FeedSource.IncidentDataItem} newDataObject A new incident data item object.
  * Most properties will be null and must be updated by the implementation.
  */
  get newDataObject() {
    var now = new Date();
    var dataObj = new Object();
    dataObj.id = null;
    dataObj.raw = null;
    dataObj.type = null;
    dataObj.items = new Object();
    dataObj.summaryHTML = null;
    dataObj.detailsHTML = null;
    dataObj.datetime = new Object();
    dataObj.datetime.received = now;
    dataObj.datetime.event = null;
    dataObj.location = new Object();
    dataObj.location.details = new Object();
    dataObj.location.latitude = -1;
    dataObj.location.longitude = -1;
    return (dataObj);
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
            "url":"https://cors-anywhere.herokuapp.com/",
            "action":"append",
            "encodeURIComponent":false
          },
          {
            "url":"https://api.allorigins.win/get?url=",
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
