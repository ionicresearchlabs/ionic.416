/**
* @file Toronto Fire Service feed.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Toronto Fire Service feed.
* @extends FeedSource
*/
class TorontoFireFeed extends FeedSource {

  /**
  * @private
  */
  constructor() {
    super();
    this.feeds["TorontoFireFeed"] = this;
    //console.log (`Created ${this.toString()}`);
  }

  /**
  * Checks for / creates the "TorontoFireFeed" object store in the
  * "ionic" database.
  *
  * @async
  * @private
  */
  async checkDatabase() {
    var storeName = "TorontoFireFeed";
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
  get fireStationData() {
    if (this._fireStationData == undefined) {
      this._fireStationData = null;
    }
    return (this._fireStationData);
  }

  /**
  * @private
  */
  loadFireStationData() {
    var promise = new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.addEventListener("load", (event) => {
        this._fireStationData = JSON.parse(event.target.responseText);
        resolve(event);
      });
      var url = "sources/TorontoFireStations.json";
      xhr.open("GET", url);
      xhr.send();
    })
    return (promise);
  }

  /**
  * Retrieves a {@link FeedSource.IncidentDataItem} item by its unique id.
  *
  * @param {String} itemId The unique identifier of the incident data item to get.
  *
  * @return {FeedSource.IncidentDataItem} The incident data item matching the id, or null.
  */
  async getItemById(itemId) {
    var result = await this.db.getById(itemId, "TorontoFireFeed");
    if (result.target.result != undefined) {
      return (result.target.result);
    } else {
      return (null);
    }
  }

  /**
  * @private
  */
  async getFireStationInfo(stationId) {
    if (this.fireStationData == null) {
      await this.loadFireStationData();
    }
    for (var count=0; count < this.fireStationData.length; count++) {
      var stationInfo = this.fireStationData[count];
      if (String(stationInfo.stationId) == String(stationId)) {
        return (stationInfo);
      }
    }
    return (null);
  }

  /**
  * @private
  */
  larger (num1, num2) {
    if (num1 > num2) {
      return (num1);
    }
    return (num2);
  }

  smaller (num1, num2) {
    if (num1 < num2) {
      return (num1);
    }
    return (num2);
  }

  /**
  * @private
  */
  async resolveLatLon(dataItem, updateDataItem=true) {
    var returnObj = new Object();
    var locObj = dataItem.location;
    var addressAppend = ", Toronto, Ontario, Canada";
    if ((locObj.latitude == -1) || (locObj.longitude == -1)) {
      var street = dataItem.location.details.street;
      var intersection = dataItem.location.details.intersection;
      var postalCode = dataItem.location.details.postalCode;
      var gc = new Geocoder();
      if (street != null) {
        street = street.split(",")[0];
        street += addressAppend;
        var result = await gc.search(street);
        if (result.bestResult != null) {
          returnObj.latitude = result.bestResult.latitude;
          returnObj.longitude = result.bestResult.longitude;
          if (updateDataItem == true) {
            locObj.latitude = returnObj.latitude;
            locObj.longitude = returnObj.longitude;
          }
          return (returnObj);
        }
      }
      if (postalCode != null) {
        //current geocoder doesn't support short codes
      }
      //no other valid results so use location of fire station
      returnObj.latitude = locObj.details.station.latitude;
      returnObj.longitude = locObj.details.station.longitude;
      if (updateDataItem == true) {
        locObj.latitude = returnObj.latitude;
        locObj.longitude = returnObj.longitude;
      }
    } else {
      returnObj.latitude = locObj.latitude;
      returnObj.longitude = locObj.longitude;
    }
    return (returnObj);
  }

  /**
  * @private
  */
  async resolveDetailsHTML(dataItem, detailLevel="summary") {
    var incidentIdHTML = `<p>Incident <span style="font-weight:bold;">${dataItem.id}</span></p>`;
    //var streetViewHTML = `<p><a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${dataItem.location.latitude},${dataItem.location.longitude}" target="_blank">Google Maps Street View</a></p>`;
    var streetViewHTML = `<p><a href="#" onclick="openStreetViewWindow('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${dataItem.location.latitude},${dataItem.location.longitude}');"><i class="fas fa-street-view"></i>&nbsp;Google Maps Street View</a></p>`;
    if (detailLevel == "details") {
      if (dataItem.detailsHTML == null) {
        var details = `${incidentIdHTML}${streetViewHTML}<p>No additional details available.</p>`;
      } else {
        details = `${incidentIdHTML}${streetViewHTML}${dataItem.detailsHTML}`;
      }
      var detailsHTML = `<details><summary>${dataItem.summaryHTML}</summary>${details}</details>`;
      return (detailsHTML);
    } else {
      return (dataItem.summaryHTML);
    }
  }

  /**
  * @private
  */
  addAlarmLevelTooltip(alarmLevel) {
    var level = String(alarmLevel);
    switch (level) {
      case "0":
        var levelDetails = "Responding";
        break;
      case "1":
        levelDetails = "Active/Confirmed";
        break;
      case "2":
        levelDetails = "10-13 Vehicles";
        break;
      case "3":
        levelDetails = "14-17 Vehicles";
        break;
      case "4":
        levelDetails = "18-21 Vehicles";
        break;
      case "5":
        levelDetails = "22-25 Vehicles";
        break;
      case "6":
        levelDetails = "25-29 Vehicles";
        break;
      default:
        levelDetails = "Unrecognized";
        break;
    }
    var returnStr = `<span class="tooltip">&#x1F514; ${level}<span class="tooltiptext">${levelDetails}</span></span>`;
    return (returnStr);
  }

  /**
  * @private
  */
  addUnitTooltips(unitsStr) {
    var unitsSplit = unitsStr.split(",");
    for (var count=0; count < unitsSplit.length; count++) {
      var unit = unitsSplit[count].trim();
      //this would be better via a config file or something (rather than hardcoded):
      var unitDetails = "Unrecognized vehicle type";
      if (unit.indexOf("P") == 0) {
        unitDetails = "Pumper";
      }
      if (unit.indexOf("R") == 0) {
        unitDetails = "Rescue";
      }
      if (unit.indexOf("A") == 0) {
        unitDetails = "Aerial";
      }
      if (unit.indexOf("T") == 0) {
        unitDetails = "Tower";
      }
      if (unit.indexOf("S") == 0) {
        unitDetails = "Squad";
      }
      if (unit.indexOf("C") == 0) {
        unitDetails = "Chief";
      }
      if (unit.indexOf("AL") == 0) {
        unitDetails = "Air/Light";
      }
      if (unit.indexOf("DC") == 0) {
        unitDetails = "District Chief";
      }
      if (unit.indexOf("FI") == 0) {
        unitDetails = "Fire Investigator";
      }
      if (unit.indexOf("FB") == 0) {
        unitDetails = "Fire Boat";
      }
      if (unit.indexOf("HR") == 0) {
        unitDetails = "Highrise";
      }
      if (unit.indexOf("HZ") == 0) {
        unitDetails = "Heavy Hazmat";
      }
      if (unit.indexOf("PL") == 0) {
        unitDetails = "Platform";
      }
      if (unit.indexOf("CMD") == 0) {
        unitDetails = "Command";
      }
      if (unit.indexOf("WT") == 0) {
        unitDetails = "Water Tanker";
      }
      if (unit.indexOf("DE") == 0) {
        unitDetails = "Decontamination";
      }
      if (unit.indexOf("HS") == 0) {
        unitDetails = "Hazmat Support";
      }
      if (unit.indexOf("TRS") == 0) {
        unitDetails = "Trench Rescue";
      }
      if (unit.indexOf("SUP") == 0) {
        unitDetails = "Canteen Vehicle";
      }
      if (unit.indexOf("BOX") == 0) {
        unitDetails = "Canteen Vehicle";
      }
      if (unit.indexOf("REHAB") == 0) {
        unitDetails = "Rehab Vehicle";
      }
      unitsSplit[count] = `<span class="tooltip">${unitsSplit[count]}<span class="tooltiptext">${unitDetails}</span></span>`;
    }
    return (unitsSplit.join(","));
  }

  /**
  * @private
  */
  async parseResult(event) {
    var request = event.target;
    if (request.responseXML == null) {
      var event = new Event("onerror");
      event.message = "Response was empty."
      event.source = this;
      request._reject(event);
      return;
    }
    var statusObj = new Object();
    var eventsArray = new Array();
    this._rawData = request.responseText;
    var resultXML = request.responseXML.documentElement;
    for (var count=0; count < resultXML.children.length; count++) {
      var currentNode = resultXML.children[count];
      if (currentNode.nodeName == "event") {
        var eventObj = new Object();
        for (var count2=0; count2 < currentNode.children.length; count2++) {
          var eventItemNode = currentNode.children[count2];
          var itemName = eventItemNode.nodeName;
          eventObj[itemName] = eventItemNode.textContent;
        }
        eventsArray.push(eventObj);
      } else {
        statusObj[currentNode.nodeName] = currentNode.textContent;
      }
    }
    for (var count=0; count < eventsArray.length; count++) {
      dataObject = this.newDataObject;
      var currentEvent = eventsArray[count];
      var stationInfo = await this.getFireStationInfo(currentEvent.beat);
      dataObject.raw = new Object();
      Object.assign(dataObject.raw, currentEvent);
      Object.assign(dataObject.items, currentEvent);
      dataObject.id = currentEvent.event_num;
      dataObject.type = currentEvent.event_type;
      var dispatchTime = new Date(currentEvent.dispatch_time);
      dataObject.datetime.event = dispatchTime;
      var locationStr = `${currentEvent.prime_street} - ${currentEvent.cross_streets}`
      var alarmLevelStr = `${this.addAlarmLevelTooltip(currentEvent.alarm_lev)}`;
      var mapLink = `<a href="#" onclick="onClickItem('TorontoFireFeed', '${currentEvent.event_num}');"><i class="fas fa-map-marker-alt"></i>&nbsp;${locationStr}</a>`;
      var msg = `<span class="event-icon">&#128293;</span>&nbsp;${currentEvent.event_type}&nbsp;${alarmLevelStr} on `;
      msg += `${mapLink};`;
      msg += `&nbsp;${this.addUnitTooltips(currentEvent.units_disp)} dispatched at ${dispatchTime.toLocaleTimeString()}`;
      dataObject.summaryHTML = msg;
      if (currentEvent.prime_street.length == 3) {
        //sometimes only a partial postal code is included as the prime street
        dataObject.location.details.street = null;
        dataObject.location.details.postalCode = currentEvent.prime_street;
      } else {
        dataObject.location.details.street = currentEvent.prime_street;
        dataObject.location.details.postalCode = null;
      }
      dataObject.location.details.station = new Object();
      Object.assign (dataObject.location.details.station, stationInfo);
      if (currentEvent.cross_streets.length > 0) {
        dataObject.location.details.intersection = currentEvent.cross_streets;
      } else {
        dataObject.location.details.intersection = null;
      }
      try {
        var result = await this.db.insert ([dataObject], "TorontoFireFeed");
        console.log (`Fire incident #${dataObject.id} added to database.`);
        var updateObj = new Object();
        updateObj.status = "newItem";
        updateObj.source = "TorontoFireFeed";
        updateObj.dataItem = dataObject;
        this.messaging.broadcast(updateObj);
      } catch (err) {
    //    console.warn (`Incident #${dataObject.id} already exists in database.`);
      }
      this.latestData.push(dataObject);
    }
    this.latestData = this.sortByDate(this.latestData);
    var lastUpdated = new Date(statusObj.update_from_db_time);
    var nextUpdate = new Date(lastUpdated.toISOString());
    nextUpdate.setMinutes(nextUpdate.getMinutes() + 5);
    var msg = `<span class="event-icon">&#128293;</span>&nbsp;Fire Services dispatch updated ${lastUpdated.toLocaleTimeString()} / next ${nextUpdate.toLocaleTimeString()}`;
    var dataObject = this.newDataObject;
    dataObject.summaryHTML = msg;
    this.latestData.unshift(dataObject);
    var event = new Event("onload");
    event.source = this;
    request._resolve(event);
  }

  /**
  * @private
  */
  load(customURL=null, async=true, bypassCache=true) {
    this._latestData = new Array();
    this._latestDataRaw = null;
    var xhr = new XMLHttpRequest();
    if (async == true) {
      var promise = new Promise((resolve, reject) => {
        xhr._resolve = resolve;
        xhr._reject = reject;
      })
    } else {
      promise = null;
      xhr._resolve = this.dispatchEvent;
      xhr._reject = this.dispatchEvent;
    }
    xhr.addEventListener("load", event => {
      this.parseResult(event).then(result => {
        var onParseEvent = new Event("onparse");
        this.dispatchEvent(onParseEvent);
      })
    });
    if (customURL == null) {
      var url = "https://www.toronto.ca/data/fire/livecad.xml";
      if (bypassCache == true) {
        var rnd = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        url += "?timestamp=" + rnd.toString();
      }
    } else {
      url = customURL;
    }
    xhr.open("GET", this.proxify(url));
    xhr.send();
    this.refresh (this.load.bind(this, customURL, async, bypassCache), 300000);
    return (promise);
  }

  /**
  * @private
  */
  toString() {
    return ("[object TorontoFireFeed]");
  }

}
