/**
* @file Twitter timeline grabber / parser for browser-based JavaScript.<br/>
* <b>No authentication or server components required</b> and uses JSONP so <b>no CORS headaches</b>!
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG
* @copyright MIT License
* @example
* <caption>Using events</caption>
* let timeline = new TwitterTimeline();
*
* function handleResult(event) {
*    console.log ("I will now do something with the timeline data:");
*    console.dir (event.result);
* }
*
* function handlerError(event) {
*    console.error ("Something went wrong!");
*    console.dir (event.error);
* }
*
* timeline.addEventListener("ontimeline", handleResult);
* timeline.addEventListener("onerror", handlerError);
* timeline.getTimeline("@jack");
* @example
* <caption>Using promises</caption>
* let timeline = new TwitterTimeline();
*
* timeline.getTimelineAsync("@jack").then((response) => {
*    console.log ("I will now do something with the timeline data:");
*    console.dir (response.result);
* }).catch((err) => {
*    console.error ("Something went wrong!");
*    console.dir (err.error);
* })
*/
/**
* @class Twitter timeline grabber / parser for browser-based JavaScript.
* @extends EventTarget
*/
class TwitterTimeline extends EventTarget {

  /**
  * A retrieved and parsed Twitter timeline object.
  *
  * @typedef {Object} TwitterTimeline.TimelineResult
  * @property {Object} headers The meta-data included with the JSONP response.
  * @property {Number} headers.status <i>?</i>&nbsp;(<i>maybe like HTTP status
  * code</i>)
  * @property {Number} headers.time <i>?</i>
  * @property {Number} headers.xPolling <i>?</i>&nbsp;(<i>maybe the minimum number of seconds to wait before refreshing</i>)
  * @property {String} headers.minPosition The mininimum tweet id within the data returned
  * (the first tweet included).
  * @property {String} headers.maxPosition The maximum tweet id within the data returned
  * (the last tweet included).
  * @property {Array} timeline Array of objects containing detailed information about
  * each tweet.
  * @property {String} timeline.id The unique id of the tweet, assigned by Twitter.
  * @property {String} timeline.sourceId The unique id of the original tweet, if this was
  * a retweet or reply, assigned by Twitter. This should match the <code>id</code> property
  * if the tweet was not a retweet or reply.
  * @property {String} timeline.url The direct URL of the tweet on Twitter.
  * @property {Object} timeline.author Contains details about the tweet's author.
  * @property {String} timeline.author.url The URL of the author's profile on Twitter.
  * @property {String} timeline.author.name The full name of the author.
  * @property {String} timeline.author.screenName The screen name of the author (the "@" name).
  * @property {String} timeline.author.longName The long name of the author (usually a combination of
  * name and screenName).
  * @property {Object} timeline.author.profileImage Contains information about the author's profile
  * images.
  * @property {String} timeline.author.profileImage.largeUrl The URL of the author's large-size
  * profile image.
  * @property {String} timeline.author.profileImage.smallUrl The URL of the author's small-size
  * profile image.
  * @property {Boolean} timeline.author.verified <code>true</code> if the tweet's author is
  * a verified account, <code>false</code> otherwise.
  * @property {Object} timeline.tweet Contains details of the tweet.
  * @property {String} timeline.tweet.html The full HTML contents of the tweet.
  * @property {String} timeline.tweet.text The text-only contents of the tweet (an
  * approximate copy of the <code>html</code> property).
  * @property {Object} timeline.tweet.replyTo Contains details about which
  * tweet this one is in reply to, or <code>null</code> if this is not a reply.
  * @property {String} timeline.tweet.replyTo.url The URL of the tweet being replied
  * to in this one.
  * @property {String} timeline.tweet.replyTo.screenNames The screen names of the users
  * who had published / posted the tweet being replied to. Note that this is often
  * condensed into something like <code>"@twitteruser and 4 others"</code>.
  * @property {Object} timeline.tweet.info Contains metadata about the tweet.
  * @property {String} timeline.tweet.info.language The tweet language (e.g. "en")
  * @property {Date} timeline.tweet.info.published The date / time that the tweet
  * was published or posted.
  * @property {String} timeline.tweet.info.publishedDescription A textual description
  * of when the tweet was published or posted (e.g. "Posted 10 minutes ago")
  * @property {String} timeline.dir <i>?</i>
  */
  /**
  * The requested timeline has been successfully retrieved and parsed.
  *
  * @event TwitterTimeline.ontimeline
  * @type {Event}
  *
  * @property {String} screenName The screen name included with the original
  * request.
  * @property {TwitterTimeline.TimelineResult} result Contains the result of the request.
  */
  /**
  * An error has been encountered when retrieving or parsing the timeline data.
  *
  * @event TwitterTimeline.onerror
  * @type {Event}
  *
  * @property {Error} error Contains details about the error.
  */

  /**
  * Creates a new instance of TwitterTimeline.
  */
  constructor() {
    super();
    this.createCallbacksObject();
  }

  /**
  * Creates the default Twitter JSONP callbacks container object on
  * the <code>window</code> object if it doesn't already exist.
  * @private
  */
  createCallbacksObject() {
    if ((window["__twttr"] == undefined) || (window["__twttr"] == null)) {
      var twitterObj = new Object();
      window.__twttr = twitterObj;
    } else {
      twitterObj = window.__twttr;
    }
    if ((twitterObj["callbacks"] == undefined) || (twitterObj["callbacks"] == null)) {
      twitterObj.callbacks = new Object();
    }
  }

  /**
  * @property {Object} callbacks The default Twitter JSONP callbacks container
  * object. If <code>null</code> is returned, call [createCallbacksObject]{@link TwitterTimeline#createCallbacksObject}
  * to create it.
  * @readonly
  * @private
  */
  get callbacks() {
    try {
      if ((window.__twttr.callbacks == undefined) || (window.__twttr.callbacks == null)) {
        var cbObj = null;
      } else {
        cbObj = window.__twttr.callbacks;
      }
    } catch (err) {
      cbObj = null;
    }
    return (cbObj);
  }

  /**
  * Retrieves a timeline for a specific Twitter screen name by a timeline type.
  *
  * @param {String} timelineType The type of timeline to retrieve. Valid values include: "profile"
  * and "likes"
  *
  * @param {String} screenName The screen name (a typical "<code>@</code>" Twitter handle).
  * @param {Boolean} [includeReplies=false] If true, information about tweets being replied to
  * will be included with each tweet object, otherwise only the tweet object is included.
  * @param {String} [timeZone="GMT-0400"] The originating timezone for the request (<i>maybe?</i>)
  * @param {String} [domain="localhost"] The originating domain for the request (<i>maybe?</i>)
  * @param {String} [language="en"] The requested language for the results (<i>maybe?</i>)
  * @private
  */
  getTimelineType (timelineType, screenName, includeReplies=false, timeZone="GMT-0400", domain="localhost", language="en") {
    screenName = screenName.split("@").join(""); //only use part after "@"
    var now = new Date();
    var time = now.getTime();
    var callbackName = `tl_i0_${timelineType}_${screenName}_old`;
    var JSONPCallback = `__twttr.callbacks.${callbackName}`;
    var JSONPURL = `https://cdn.syndication.twimg.com/timeline/${timelineType}?callback=${JSONPCallback}&dnt=false&domain=${domain}&lang=${language}&screen_name=${screenName}&suppress_response_codes=true&t=${time}&tz=${timeZone}&with_replies=${includeReplies}`;
    var scriptElement = document.createElement('script');
    scriptElement.setAttribute("src", JSONPURL);
    scriptElement.setAttribute("type", "text/javascript");
    scriptElement.setAttribute("language", "javascript");
    scriptElement.setAttribute("charset", "utf-8");
    var finalArg = arguments[arguments.length - 1];
    var asyncObj = null;
    if (typeof(finalArg) == "object") {
      if (typeof(finalArg.resolve == "function") && typeof(finalArg.reject == "function")) {
        //result to be returned via promise
        asyncObj = {
          resolve: finalArg.resolve,
          reject: finalArg.reject
        }
      }
    }
    this.callbacks[callbackName] = this.timelineResultHandler.bind(this, asyncObj, scriptElement, screenName);
    document.head.appendChild(scriptElement);
  }

  /**
  * Retrieves a timeline for a specific Twitter screen name.
  *
  * @param {String} screenName The screen name (a typical "<code>@</code>" Twitter handle).
  * @param {Boolean} [includeReplies=false] If true, information about tweets being replied to
  * will be included with each tweet object, otherwise only the tweet object is included.
  * @param {String} [timeZone="GMT-0400"] The originating timezone for the request (<i>maybe?</i>)
  * @param {String} [domain="localhost"] The originating domain for the request (<i>maybe?</i>)
  * @param {String} [language="en"] The requested language for the results (<i>maybe?</i>)
  */
  getTimeline(screenName, includeReplies=false, timeZone="GMT-0400", domain="localhost", language="en") {
    this.getTimelineType("profile", screenName, includeReplies, timeZone, domain, language);
  }

  /**
  * Retrieves a timeline of liked tweets for a specific Twitter screen name.
  *
  * @param {String} screenName The screen name (a typical "<code>@</code>" Twitter handle).
  * @param {Boolean} [includeReplies=false] If true, information about tweets being replied to
  * will be included with each tweet object, otherwise only the tweet object is included.
  * @param {String} [timeZone="GMT-0400"] The originating timezone for the request (<i>maybe?</i>)
  * @param {String} [domain="localhost"] The originating domain for the request (<i>maybe?</i>)
  * @param {String} [language="en"] The requested language for the results (<i>maybe?</i>)
  */
  getLikes() {
    this.getTimelineType("likes", screenName, includeReplies, timeZone, domain, language);
  }

  /**
  * Retrieves a timeline for a specific Twitter screen name. This is an asynchronous version
  * of the [getTimeline]{@link TwitterTimeline#getTimeline} function.
  *
  * @param {String} screenName The screen name (a typical "<code>@</code>" Twitter handle).
  * @param {Boolean} [includeReplies=false] If true, information about tweets being replied to
  * will be included with each tweet object, otherwise only the tweet object is included.
  * @param {String} [timeZone="GMT-0400"] The originating timezone for the request (<i>maybe?</i>)
  * @param {String} [domain="localhost"] The originating domain for the request (<i>maybe?</i>)
  * @param {String} [language="en"] The requested language for the results (<i>maybe?</i>)
  *
  * @return (Promise) The asynchronous promise that will either resolve with the result or reject
  * with an error.
  * @async
  */
  getTimelineAsync(screenName, includeReplies=false, timeZone="GMT-0400", domain="localhost", language="en") {
    var promise = new Promise((resolve, reject) => {
      this.getTimelineType("profile", screenName, includeReplies, timeZone, domain, language, {resolve, reject});
    });
    return (promise);
  }

  /**
  * Retrieves the likes for a specific Twitter screen name. This is an asynchronous version
  * of the [getLikes]{@link TwitterTimeline#getLikes} function.
  *
  * @param {String} screenName The screen name (a typical "<code>@</code>" Twitter handle).
  * @param {Boolean} [includeReplies=false] If true, information about tweets being replied to
  * will be included with each tweet object, otherwise only the tweet object is included.
  * @param {String} [timeZone="GMT-0400"] The originating timezone for the request (<i>maybe?</i>)
  * @param {String} [domain="localhost"] The originating domain for the request (<i>maybe?</i>)
  * @param {String} [language="en"] The requested language for the results (<i>maybe?</i>)
  *
  * @return (Promise) The asynchronous promise that will either resolve with the result or reject
  * with an error.
  * @async
  */
  getLikesAsync(screenName, includeReplies=false, timeZone="GMT-0400", domain="localhost", language="en") {
    var promise = new Promise((resolve, reject) => {
      this.getTimelineType("likes", screenName, includeReplies, timeZone, domain, language, {resolve, reject});
    });
    return (promise);
  }

  /**
  * Parses a raw retrieved timeline object (JSONP result), into a native object.
  *
  * @param {Object} timelineObj The timeline object containing <code>headers</code>
  * and <code>body</code> result properties to parse.
  *
  * @return (Object) A parsed object with an included <code>timeline</code> array and
  * result <code>headers</code> information.
  * @private
  */
  parseTimeline(timelineObj) {
    var resultObj = new Object();
    resultObj.headers = new Object();
    resultObj.timeline = new Array();
    var resultHTML = document.createElement("div");
    resultHTML.innerHTML = timelineObj.body;
    Object.assign(resultObj.headers, timelineObj.headers);
    var tweetList = resultHTML.querySelectorAll(".timeline-Tweet");
    for (var count=0; count < tweetList.length; count++) {
      var currentTweet = tweetList[count];
      var tweetObj = new Object();
      tweetObj.author = new Object();
      tweetObj.tweet = new Object();
      tweetObj.tweet.info = new Object();
      tweetObj.tweet.replyTo = null;
      var authorNode = currentTweet.querySelector(".timeline-Tweet-author");
      var replyToNode = currentTweet.querySelector(".timeline-Tweet-inReplyTo");
      var tweetTextNode = currentTweet.querySelector(".timeline-Tweet-text");
      var tweetMetaNode = currentTweet.querySelector(".timeline-Tweet-metadata");
      var tweetMetaTimeNode = tweetMetaNode.querySelector("time");
      var publishedDate = new Date(tweetMetaTimeNode.getAttribute("datetime"));
      var publishedDateDesc = tweetMetaTimeNode.getAttribute("aria-label");
      var avatarNode = authorNode.querySelector(".TweetAuthor-avatar");
      var authorDetailsNode = authorNode.querySelector(".TweetAuthor-link");
      var authorVerifiedNode = authorNode.querySelector(".TweetAuthor-verifiedBadge");
      var authorNameNode = authorNode.querySelector(".TweetAuthor-name");
      var authorScreenNameNode = authorNode.querySelector(".TweetAuthor-screenName");
      var imgNode = avatarNode.querySelector("img");
      tweetObj.id = currentTweet.getAttribute("data-tweet-id");
      tweetObj.sourceId = currentTweet.getAttribute("data-rendered-tweet-id");
      tweetObj.url = currentTweet.getAttribute("data-click-to-open-target");
      tweetObj.author.url = authorDetailsNode.getAttribute("href");
      tweetObj.author.name = authorNameNode.innerHTML;
      tweetObj.author.screenName = authorScreenNameNode.innerHTML;
      tweetObj.author.longName = authorDetailsNode.getAttribute("aria-label");
      tweetObj.author.profileImage = new Object();
      tweetObj.author.profileImage.largeUrl = imgNode.getAttribute("data-src-2x");
      tweetObj.author.profileImage.smallUrl = imgNode.getAttribute("data-src-1x");
      if (authorVerifiedNode == null) {
        tweetObj.author.verified = false;
      } else {
        tweetObj.author.verified = true;
      }
      tweetObj.tweet.info.language = tweetTextNode.getAttribute("lang");
      tweetObj.tweet.info.published = publishedDate;
      tweetObj.tweet.info.publishedDescription = publishedDateDesc;
      tweetObj.tweet.dir = tweetTextNode.getAttribute("dir");
      tweetObj.tweet.html = tweetTextNode.innerHTML;
      tweetObj.tweet.text = this.htmlToText(tweetTextNode.innerHTML);
      if (replyToNode != null) {
        var replyToNodeA = replyToNode.querySelector("a");
        tweetObj.tweet.replyTo = new Object();
        var screenNames = replyToNodeA.innerText;
        screenNames = screenNames.replace("\n  ", "");
        screenNames = screenNames.replace("\n ", "");
        screenNames = screenNames.replace("\n", "");
        screenNames = screenNames.replace("Replying to ", "");
        tweetObj.tweet.replyTo.url = replyToNodeA.getAttribute("href");
        tweetObj.tweet.replyTo.screenNames = screenNames;
      }
      resultObj.timeline.push (tweetObj)
    }
    return (resultObj);
  }

  /**
  * Converts a HTML string to an approximate plain-text representation.
  *
  * @param {String} htmlStr The HTML string to to convert to plain text.
  *
  * @return (String) The plain text representation of the HTML string.
  * @private
  */
  htmlToText(htmlStr) {
    htmlStr = htmlStr.replace("<br>", "\n");
    htmlStr = htmlStr.replace("<br/>", "\n");
    htmlStr = htmlStr.replace("</p>", "\n");
    //add other replacements / RegExps here
    var returnStr = htmlStr.replace(/(<([^>]+)>)/gi, ""); //strip all tags
    return (returnStr);
  }

  /**
  * Default timeline results handler.
  *
  * @param {Object} asyncObj An object containing <code>resolve</code> and
  * <code>reject</code> functions to invoke when executing as an asynchronous
  * process, of <code>null</code> to execute as an event dispatcher.
  * @param {HTMLScriptElement} jsElementRef A reference to the temporary <code><script></code>
  * tag appended to the page header used for the JSONP request.
  * @param {String} screenName The original screen name used for the request.
  * @param {Object} data The returned JSONP data to parse.
  * @private
  */
  timelineResultHandler(asyncObj, jsElementRef, screenName, data) {
    if (asyncObj == null) {
      //event
      var returnObj = new Event("ontimeline");
    } else {
      //async call
      var returnObj = new Object();
    }
    try {
      returnObj.screenName = screenName;
      returnObj.result = this.parseTimeline(data);
      if (asyncObj == null) {
        this.dispatchEvent(returnObj);
      } else {
        asyncObj.resolve(returnObj);
      }
    } catch (err) {
      if (asyncObj == null) {
        returnObj = new Event("onerror");
        returnObj.error = err;
        this.dispatchEvent(returnObj);
      } else {
        returnObj.error = err;
        asyncObj.reject(err);
      }
    } finally {
      jsElementRef.remove(); //clean up <script> tag
    }
  }

}
/**
* @description Note for additional future updates: https://github.com/jasonmayes/Twitter-Post-Fetcher/blob/master/js/twitterFetcher.js
* @private
* @ignore
*/
