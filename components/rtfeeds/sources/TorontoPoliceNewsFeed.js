/**
* @file Toronto Police News Releases feed.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Toronto Police News Releases feed.
* @extends FeedSource
*/
class TorontoPoliceNewsFeed extends FeedSource {

  /**
  * @private
  */
  constructor() {
    super();
    this.feeds["TorontoPoliceNewsFeed"] = this;
    console.log (`Created ${this.toString()}`);
  }

  /**
  * Checks for / creates the "TorontoPoliceNewsFeed" object store in the
  * "ionic" database.
  *
  * @async
  * @private
  */
  async checkDatabase() {
    var storeName = "TorontoPoliceNewsFeed";
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
  *  @private
  */
  async resolveLatLon(dataItem, updateDataItem=true) {
    var returnObj = new Object();
    var locObj = dataItem.location;
    var addressAppend = ", Toronto, Ontario, Canada";
    if ((locObj.latitude == -1) || (locObj.longitude == -1)) {
      var street = dataItem.location.details.street;
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
        } else {
          returnObj = null;
        }
      } else {
        returnObj = null;
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
  async resolveExternalURL(dataItem) {
    return (dataItem.items.link);
  }

  /**
  * Retrieves a {@link FeedSource.IncidentDataItem} item by its unique id.
  *
  * @param {String} itemId The unique identifier of the incident data item to get.
  *
  * @return {FeedSource.IncidentDataItem} The incident data item matching the id, or null.
  */
  async getItemById(itemId) {
    var result = await this.db.getById(itemId, "TorontoPoliceNewsFeed");
    if (result.target.result != undefined) {
      return (result.target.result);
    } else {
      return (null);
    }
  }

  /**
  * @private
  */
  getNewsDetailsItem(sourceItem) {
    var promise = new Promise((resolve, reject) => {
      var url = sourceItem.items.link;
      var xhr = new XMLHttpRequest();
      xhr.addEventListener("load", this.onGetNewsDetailsItem.bind(this, sourceItem, {resolve, reject}));
      xhr.open("GET", this.proxify(url));
      xhr.send();
    });
    return (promise);
  }

  /**
  * @private
  */
  onGetNewsDetailsItem(sourceItem, promise, event) {
    try {
      var detailsHTML = event.target.responseText;
      var sourceDetailsHTML = sourceItem.items.description.replace(/(?:\\[rn]|[\r\n]+)+/g, "");
      var caseId = detailsHTML.split("Case #: ")[1].split("<br>")[0];
      var byLine = detailsHTML.split("<hr>")[1].split("</div>")[0];
      byLine = byLine.split("\r").join("").split("\n").join("");
      var itemDetailsHTML = `Case #: ${caseId}<br/>${sourceDetailsHTML}<br/>${byLine}`;
      sourceItem.caseId = caseId;
      sourceItem.detailsHTML = itemDetailsHTML;
      promise.resolve(true);
    } catch (err) {
      //probably no case ID (generic news item)
      promise.reject (err);
    }
  }

  /**
  * @private
  */
  async loadNewsDetails() {
    console.warn ("TorontoPoliceNewsFeed lazy loading "+this.latestData.length+" item details.");
    for (var count=0; count < this.latestData.length; count++) {
      var newsItem = this.latestData[count];
      if (newsItem.id != null) {
        try {
          //load one at a time with a delay
          await this.delay(1000);
          var resultItem = await this.getItemById(newsItem.id);
          if (resultItem == null) {
            //console.log ("News item: "+newsItem.id+" not found. Creating...")
            await this.getNewsDetailsItem(newsItem);
            await this.db.insert ([newsItem], "TorontoPoliceNewsFeed");
            console.log (`News item #${newsItem.id} added to database.`);
            resultItem = newsItem;
          } else {
            //console.log ("News item: "+newsItem.id+" already exists. Not creating.")
          }
          var policeFeed = this.feeds["TorontoPoliceFeed"];
          //note use of caseId (id is specific to the news feed):
          //console.log ("Looking for case in police feed: "+resultItem.caseId);
          var dataItem = await policeFeed.getItemById(resultItem.caseId);
          //console.log ("Found item:");
          //console.dir(dataItem);
          if (dataItem != null) {
            //console.log ("Found matching entry in police feed");
            if ((dataItem.details == undefined) || (dataItem.details == null)) {
              dataItem.details = new Object();
            }
            if ((dataItem.details.news == undefined) || (dataItem.details.news == null)) {
              dataItem.details.news = new Array();
            }
            //cases may have multiple news updates
            var detailExists = false;
            for (var count2=0; count2 < dataItem.details.news.length; count2++) {
              var currentNewsItem = dataItem.details.news[count2];
              if (currentNewsItem.id == currentNewsItem.id) {
                detailExists = true;
                break;
              }
            }
            if (detailExists == false) {
              //details don't match any currently stored with item
              var newDetailItem = new Object();
              Object.assign(newDetailItem, resultItem);
              var newsHTML = newsItem.detailsHTML;
              dataItem.details.news.push (newDetailItem);
              if (dataItem.detailsHTML == null) {
                dataItem.detailsHTML = `<hr><p>${newsHTML}</p>`;
              } else {
                dataItem.detailsHTML += `<hr><p>${newsHTML}</p>`;
              }
              await this.db.updateById (dataItem.id, dataItem, "TorontoPoliceFeed");
              var updateObj = new Object();
              updateObj.status = "updateItem";
              updateObj.source = "TorontoPoliceFeed";
              updateObj.dataItem = dataItem;
              this.messaging.broadcast(updateObj);
            } else {
              //console.log ("Item has already been updated with latest details. Skipping.");
              //console.dir S(dataItem);
            }
          } else {
            //console.log ("No such entry in police feed");
          }
        } catch (err) {
          //fail silently -- item may not have parsed properly or some other error so try again next time
        }
      }
    }
    console.warn ("TorontoPoliceNewsFeed lazy load completed.");
  }

  /**
  * @private
  */
  delay(ms) {
    var promise = new Promise((resolve, reject) => {
      setTimeout(resolve.bind(this), ms);
    });
    return (promise);
  }

  /**
  * @private
  */
  extractLocation(item) {
    var itemDescription = item.description;
    var locationStr = null;
    var locationLinkPre = `https://www.google.com/maps/`;
    var locationSplit = itemDescription.split(locationLinkPre);
    if (locationSplit.length < 2) {
      locationLinkPre = `https://www.google.ca/maps/`;
    }
    locationSplit = itemDescription.split(locationLinkPre);
    if (locationSplit.length > 1) {
      var locationTag = locationSplit[1].split(">"); //end of opening <a> tag
      locationStr = locationTag[1].split("<")[0]; //closing </a> tag
    }
    return (locationStr);
  }

  /**
  * @private
  */
  extractItemId(item) {
    var itemLink = item.link;
    var linkSplit = itemLink.split("/");
    var itemId = linkSplit[linkSplit.length - 1];
    return (itemId);
  }

  /**
  * @private
  */
  async parseResult(RSSObj) {
    this._rawData = RSSObj.channel;
    var itemsList = RSSObj.channel.item;
    for (var count=0; count < itemsList.length; count++) {
      var dataObject = this.newDataObject;
      var item = itemsList[count];
      dataObject.raw = JSON.stringify(item);
      dataObject.items = item;
      dataObject.id = this.extractItemId(item); //feed item id (not the global case Id)
      dataObject.type = "TorontoPoliceNews";
      dataObject.caseId = null; //global case Id (can be cross-referenced with other feeds)
      var location = this.extractLocation(item);
      if (location == null) {
        var mapLink = `<a href="${item.link}" target="_blank">${item.title}</a>`;
      } else {
        dataObject.location.details.street = location;
        mapLink = `<a href="#" onclick="onClickItem('TorontoPoliceNewsFeed', '${dataObject.id}');">${item.title}</a>`;
      }
      var options = {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      };
      var postedDate = new Intl.DateTimeFormat('en-CA', options).format(item.pubDate);
      var msg = `<span class="event-icon">&#x1F6A8;</span>&nbsp;${mapLink} published on ${postedDate}`;
      dataObject.summaryHTML = msg;
      dataObject.datetime.event = new Date(item.pubDate.toISOString());
      this.latestData.push(dataObject);
    }
    this.latestData = this.sortByDate(this.latestData);
    var currentDate = new Date();
    var nextUpdate = new Date(currentDate.toISOString());
    nextUpdate.setMinutes(nextUpdate.getMinutes() + 30);
    var headerMsg = `<span class="event-icon">&#x1F6A8;</span>&nbsp;Police News updated ${currentDate.toLocaleTimeString()} / next ${nextUpdate.toLocaleTimeString()}`;
    var dataObject = this.newDataObject;
    dataObject.summaryHTML = headerMsg;
    this.latestData.unshift (dataObject);
    this.loadNewsDetails();
    var event = new Event("onload");
    event.source = this;
    RSSObj._resolve(event);
  }

  /**
  * @private
  */
  load(customURL = null, async=true, bypassCache=true) {
    this._latestData = new Array();
    this._latestDataRaw = null;
    var rss = new RSS();
    if (async == true) {
      var promise = new Promise((resolve, reject) => {
        rss._resolve = resolve;
        rss._reject = reject;
      })
    } else {
      promise = null;
      rss._resolve = this.dispatchEvent;
      rss._reject = this.dispatchEvent;
    }
    rss.onParse = result => {
      this.parseResult(rss).then (result => {
        var onParseEvent = new Event("onparse");
        this.dispatchEvent(onParseEvent);
      })
      this.refresh (this.load.bind(this, customURL, async, bypassCache), 1800000);
    };
    if (customURL == null) {
      var url = "http://torontopolice.on.ca/newsreleases/rss.php";
      if (bypassCache == true) {
        var rnd = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        url += "?timeStamp="+rnd.toString();
      }
    } else {
      url = customURL;
    }
    rss.load("GET", this.proxify(url));
    return (promise);
  }

  /**
  * @private
  */
  toString() {
    return ("[object TorontoPoliceNewsFeed]");
  }

}
