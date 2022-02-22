/**
* @file Toronto Police Service C4S (Calls 4 Service) data feed.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Toronto Police Service C4S (Calls 4 Service) data feed.
* @extends FeedSource
*/
class TorontoPoliceFeed extends FeedSource {

  /**
  * Creates a news instance.
  */
  constructor() {
    super();
    this.feeds["TorontoPoliceFeed"] = this;
    //console.log (`Created ${this.toString()}`);
  }

  /**
  * Checks for / creates the "TorontoPoliceFeed" object store in the
  * "ionic" database.
  *
  * @async
  * @private
  */
  async checkDatabase() {
    var storeName = "TorontoPoliceFeed";
    try {
      var result = await this.db.create("ionic", storeName, "id");
      console.log (`"${storeName}" object store in "ionic" database ready.`);
      return (true);
    } catch (err) {
      console.error(`Error creating / checking "${storeName}" object store in "ionic" database:\n${err}`);
      return (false);
    }
  }

  /**
  * @private
  */
  async resolveLatLon(dataItem, updateDataItem=true) {
    var returnObj = new Object();
    returnObj.latitude = dataItem.location.latitude;
    returnObj.longitude = dataItem.location.longitude;
    return (returnObj);
  }

  /**
  * @private
  */
  async resolveDetailsHTML(dataItem, detailLevel="summary") {
    //var caseIdHTML = `<p>Case #<span style="font-weight:bold;">${dataItem.id}</span></p>`;
    //Data no longer contains valid case ID as of February 2022
    var caseIdHTML = ``;
    var streetViewHTML = `<p><a href="#" onclick="openStreetViewWindow('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${dataItem.location.latitude},${dataItem.location.longitude}');"><i class="fas fa-street-view"></i>&nbsp;Google Maps Street View</a></p>`;
    if (detailLevel == "details") {
      if (dataItem.detailsHTML == null) {
        var details = `${caseIdHTML}${streetViewHTML}<p>No additional details available at this time.</p>`;
      } else {
        details = `${caseIdHTML}${streetViewHTML}${dataItem.detailsHTML}`;
      }
      var detailsHTML = `<details><summary>${dataItem.summaryHTML}</summary>${details}</details>`;
      return (detailsHTML);
    } else {
      return (dataItem.summaryHTML);
    }
  }

  /**
  * Retrieves a {@link FeedSource.IncidentDataItem} item by its unique id.
  *
  * @param {String} itemId The unique identifier of the incident data item to get.
  *
  * @return {FeedSource.IncidentDataItem} The incident data item matching the id, or null.
  */
  async getItemById(itemId) {
    try {
      var result = await this.db.getById(itemId, "TorontoPoliceFeed");
      if (result.target.result != undefined) {
        return (result.target.result);
      } else {
        return (null);
      }
    } catch (err) {
      //database error -- try latest data
      for (var count = 0; count < this.latestData.length; count++) {
        if (this.latestData[count].id == itemId) {
          return (this.latestData[count]);
        }
      }
      return (null);
    }
  }

  /**
  * Parses the TPS C4S data feed into {@link FeedSource.IncidentDataItem} objects.
  *
  * @param {Object} response The response object from the C4S api.
  * @param {Boolean} [DBEnabled=true] If true, the "TorontoPoliceForce" object store
  * in the "ionic" database will also be updated as part of the parsing process.
  *
  * @return {Boolean} True when the response has been fully parsed.
  * @async
  */
  async parseResult(response, DBEnabled=true) {
    if ((response == null) || (response == undefined)) {
      var event = new Event("onerror");
      event.message = "Response was empty."
      event.source = this;
      request._reject(event);
      return;
    }
    this._rawData = JSON.stringify(response);
    var eventsData = response.features;
    if (eventsData.length == 0) {
      var event = new Event("onerror");
      event.message = "No results in response."
      event.source = this;
      request._reject(event);
      return;
    }
    for (var count=0; count < eventsData.length; count++) {
      var currentEvent = eventsData[count];
      console.dir (currentEvent);
      var now = new Date();
      dataObject = this.newDataObject;
      //var caseId = `${now.getFullYear()}-${currentEvent.attributes.OBJECTID}`; //long format used in news feed
      //OBJECTID no longer contains the case ID (data point has been removed from feed)
      var caseId = `c4s-${currentEvent.attributes.OCCURRENCE_TIME_AGOL}`;
      var division = currentEvent.attributes.DIVISION;
      division = division.split("D").join("");
      var eventTime = new Date(currentEvent.attributes.OCCURRENCE_TIME_AGOL);
      var atScene = new Date(currentEvent.attributes.OCCURRENCE_TIME_AGOL);
      var xStreets = currentEvent.attributes.CROSS_STREETS;
      var mapLink = `<a href="#" onclick="onClickItem('TorontoPoliceFeed', '${caseId}');"><i class="fas fa-map-marker-alt"></i>&nbsp;${xStreets}</a>`;
      switch (division) {
        case "HP":
          var divisionLink = `<a href="http://www.torontopolice.on.ca/traffic/hp.php" target="_blank"><i class="fas fa-external-link-alt"></i>&nbsp;Highway Patrol Jurisdiction</a>`;
          break;
        case "PSU":
          divisionLink = `<a href="https://www.torontopolice.on.ca/publicsafetyoperations/" target="_blank"><i class="fas fa-external-link-alt"></i>&nbsp;Public Safety Unit Jurisdiction</a>`;
          break;
        default:
          divisionLink = `<a href="http://www.torontopolice.on.ca/d${division}/" target="_blank"><i class="fas fa-external-link-alt"></i>&nbsp;${division} division</a>`;
          break;
      }
      Object.assign(dataObject.items, currentEvent);
      dataObject.id = caseId;
      dataObject.caseId = null; //no longer available
      dataObject.type = currentEvent.attributes.CALL_TYPE;
      dataObject.raw = JSON.stringify(currentEvent);
      dataObject.datetime.event = eventTime;
      dataObject.location.latitude = currentEvent.geometry.y;
      dataObject.location.longitude = currentEvent.geometry.x;
      dataObject.summaryHTML = `<span class="event-icon">&#x1F6A8;</span>&nbsp;${currentEvent.attributes.CALL_TYPE} on ${mapLink} in ${divisionLink} at ${atScene.toLocaleTimeString()}`;
      if (DBEnabled == true) {
        try {
          //do this async since additional details (e.g. Twitter), may need it to already exist
          var result = await this.db.insert ([dataObject], "TorontoPoliceFeed");
          console.log (`Police case #${dataObject.id} added to database.`);
          var updateObj = new Object();
          updateObj.status = "newItem";
          updateObj.source = "TorontoPoliceFeed";
          updateObj.dataItem = dataObject;
          this.messaging.broadcast(updateObj);
        } catch (err) {
      //    console.warn (`Case #${dataObject.id} already exists in database.`);
        }
      }
      this.latestData.push (dataObject);
    }
    this.latestData = this.sortByDate(this.latestData);
    var currentDate = new Date();
    var nextUpdate = new Date(currentDate.toISOString());
    nextUpdate.setMinutes(nextUpdate.getMinutes() + 5);
    var headerMsg = `<span class="event-icon">&#x1F6A8;</span>&nbsp;Police Services dispatch updated ${currentDate.toLocaleTimeString()} / next ${nextUpdate.toLocaleTimeString()}`;
    var dataObject = this.newDataObject;
    dataObject.summaryHTML = headerMsg;
    this.latestData.unshift (dataObject);
    return (true);
  }

  /**
  * @private
  */
  load(customURL=null, async=true, bypassCache=true) {
    this._latestData = new Array();
    this._latestDataRaw = null;
    var promise = new Promise((resolve, reject) => {
      if (customURL == null) {
        var jsonp = new JSONP();
        var callback = jsonp.uniqueCallback;
        //old url:
        //var url = "https://c4s.torontopolice.on.ca/arcgis/rest/services/CADPublic/C4S/MapServer/0/query";
        //new url (as of Feb 21, 2022):
        var url = "https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/C4S_Public_NoGO/FeatureServer/0/query";
        url += "?f=json"; //json result
        url += "&callback=" + callback; //use JSONP
        url += "&where=1%3D1";
        url += "&returnGeometry=true"; //send back geodata
        url += "&outFields=*"; //return all databse fields
        url += "&inSR=102100"; //native coordinate system (?)
        url += "&outSR=4326"; //make sure coordinates are in lon/lat degrees
        if (bypassCache == true) {
          var rnd = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
          url += "&timeStamp="+rnd.toString();
        }
      } else {
        url = customURL;
      }
      jsonp.load(url, callback).then(result => {
        this.parseResult(result).then(result => {
          var onParseEvent = new Event("onparse");
          this.dispatchEvent(onParseEvent);
        })
        var eventObj = new Event("onload");
        eventObj.source = this;
        if (async == true) {
          resolve(eventObj);
        } else {
          this.dispatchEvent(eventObj);
        }
      })
    })
    this.refresh (this.load.bind(this, customURL, async, bypassCache), 300000);
    return (promise);
  }

  /**
  * @private
  */
  toString() {
    return ("[object TorontoPoliceFeed]");
  }

}
