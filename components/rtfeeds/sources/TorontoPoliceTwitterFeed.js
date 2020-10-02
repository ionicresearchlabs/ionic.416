/**
* @file Toronto Police Twitter {@TPSOperations} feed.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class  Toronto Police Twitter {@TPSOperations} feed.
* @extends FeedSource
*/
class TorontoPoliceTwitterFeed extends FeedSource {

  /**
  * @private
  */
  constructor() {
    super();
    this.feeds["TorontoPoliceTwitterFeed"] = this;
    console.log (`Created ${this.toString()}`);
  }

  /**
  * @async
  * @private
  */
  async checkDatabase() {
    //data is integrated directly into TorontoPoliceFeed
    return (true);
  }

  /**
  * Parses the @TPSOperations timeline.
  *
  * @param {TwitterTimeline} result The loaded timeline for the account.
  *
  * @return {Boolean} True when the response has been fully parsed.
  * @async
  */
  async parseResult(result) {
    for (var count=0; count < result.timeline.length; count++) {
      var now = new Date();
      var currentTimelineItem = result.timeline[count];
      var currentTweetURL = currentTimelineItem.url;
      var currentAuthor = currentTimelineItem.author;
      var currentTweet = currentTimelineItem.tweet;
      var currentTweetText = currentTweet.text;
      var currentTweetHTML = currentTweet.html;
      var currentTweetInfo = currentTweet.info;
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
      var publishedDateTime = new Intl.DateTimeFormat('en', dtOptions).format(currentTweetInfo.published);
      var caseIdSplit = currentTweetText.split("#GO");
      if (caseIdSplit.length > 1) {
        var caseId = caseIdSplit[1].split("^")[0];
        caseId = `${now.getFullYear()}-${caseId}`;
        try {
          var targetFeed = this.feeds["TorontoPoliceFeed"];
          var dataItem = await targetFeed.getItemById(caseId);
          if (dataItem != null) {
            if ((dataItem.details == undefined) || (dataItem.details == null)) {
              dataItem.details = new Object();
            }
            if ((dataItem.details.twitter == undefined) || (dataItem.details.twitter == null)) {
              dataItem.details.twitter = new Array();
            }
            //cases may have multiple Twitter updates
            var detailExists = false;
            for (var count2=0; count2 < dataItem.details.twitter.length; count2++) {
              var currentDetailItem = dataItem.details.twitter[count2];
              if (currentDetailItem.id == currentTimelineItem.id) {
                detailExists = true;
                break;
              }
            }
            if (detailExists == false) {
              //details don't match any currently stored with item
              var newDetailItem = new Object();
              Object.assign(newDetailItem, currentTimelineItem);
              dataItem.details.twitter.push (newDetailItem);
              if (dataItem.detailsHTML == null) {
                dataItem.detailsHTML = `<hr>`;
              } else {
                dataItem.detailsHTML += `<hr>`;
              }
              dataItem.detailsHTML += `${publishedDateTime}<br/><a href="${currentTweetURL}" target="_blank"><i class="fas fa-external-link-alt"></i>&nbsp;${currentTweetURL}</a><br/><br/>${currentTweetHTML}`;
              await this.db.updateById (dataItem.id, dataItem, "TorontoPoliceFeed");
              var updateObj = new Object();
              updateObj.status = "updateItem";
              updateObj.source = "TorontoPoliceFeed";
              updateObj.dataItem = dataItem;
              this.messaging.broadcast(updateObj);
            } else {
              //dataItem already has latest details
            }
          }
        } catch (err) {
        }
      }
    }
  }

  load(customURL=null, async=true, bypassCache=true) {
    this._latestData = new Array();
    this._latestDataRaw = null;
    var promise = new Promise((resolve, reject) => {
      this._loadingDetails = true;
      var timeline = new TwitterTimeline();
      timeline.getTimelineAsync("@TPSOperations").then (resultObj => {
        var result = resultObj.result;
        this.parseResult(result).then(result => {
          var onParseEvent = new Event("onparse");
          this.dispatchEvent(onParseEvent);
        })
        var event = new Event("onload");
        event.source = this;
        resolve (event);
        this.refresh (this.load.bind(this, customURL, async, bypassCache), 300000);
      })
    })
    return (promise);
  }

  /**
  * @private
  */
  toString() {
    return ("[object TorontoPoliceTwitterFeed]");
  }

}
