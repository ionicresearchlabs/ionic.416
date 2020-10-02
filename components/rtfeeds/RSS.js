/**
* @file RSS parser for JavaScript in the browser.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG
* @copyright MIT License
*/
/**
* @class RSS parser for Javascript in the browser.
*/
class RSS {

  /**
  * Creates a new instance.
  *
  * @param {Document|String} [RSSXML=null] XML document or string to parse immediately. If
  * omitted, the data must be loaded separately.
  */
  constructor(RSSXML = null) {
    if (RSSXML != null) {
      if (RSSXML instanceof Document) {
        var RSSXMLDocument = RSSXML;
      } else if (typeof(RSSXML) == "string") {
        var parser = new DOMParser();
        RSSXMLDocument = parser.parseFromString(RSSXML, "text/xml");
      } else {
        throw (new Error("Constructor parameter must be of type Document, string, or null."));
      }
      this.parse(RSSXMLDocument);
    }
  }

  /**
  * @property {Function} onParse Callback function to invoke when the RSS data has been succesfully parsed.
  */
  get onParse() {
    if (this._onParse == undefined) {
      this._onParse = null;
    }
    return (this._onParse);
  }

  set onParse(parseSet) {
    this._onParse = parseSet;
  }

  /**
  * @property {Function} onLoad Callback function to invoke when RSS data has been succesfully loaded.
  */
  get onLoad() {
    if (this._onLoad == undefined) {
      this._onLoad = null;
    }
    return (this._onLoad);
  }

  set onLoad(loadSet) {
    this._onLoad = loadSet;
  }

  /**
  * Parses a XML Document object into native data, stored in the [channel]{@link RSS#channel} object.
  *
  * @param {Document} RSSXMLDocument A DOM Document object containing the RSS XML data
  * to parse.
  */
  parse(RSSXMLDocument) {
    var resultXML = RSSXMLDocument.documentElement;
    this.parseNode(resultXML);
  }

  /**
  * Parses a single RSS XML node and recursively calls children to parse them.
  *
  * @param {DocumentElement} XMLNode The top-level RSS XML element to begin parsing at. All children
  * will also be parsed if appropriate.
  * @param {Object} [channelObj=null] A channel data object to append parsed data and storing previously parsed properties.
  */
  parseNode(XMLNode, channelObj=null) {
    for (var count=0; count < XMLNode.children.length; count++) {
      var currentNode = XMLNode.children[count];
      switch (currentNode.nodeName) {
        case "channel":
          this._channel = new Object();
          this.parseNode(currentNode, this._channel);
          break;
        case "title":
          channelObj.title = currentNode.textContent;
          break;
        case "link":
          channelObj.link = currentNode.textContent;
          break;
        case "description":
          channelObj.description = currentNode.textContent;
          break;
        case "copyright":
          channelObj.copyright = currentNode.textContent;
          break;
        case "language":
          channelObj.language = currentNode.textContent;
          break;
        case "managingEditor":
          channelObj.managingEditor = currentNode.textContent;
          break;
        case "pubDate":
          channelObj.pubDate = new Date(currentNode.textContent);
          break;
        case "lastBuildDate":
          channelObj.lastBuildDate = new Date(currentNode.textContent);
          break;
        case "webMaster":
          channelObj.webMaster = currentNode.textContent;
          break;
        case "category":
          channelObj.category = currentNode.textContent;
          break;
        case "generator":
          channelObj.generator = currentNode.textContent;
          break;
        case "docs":
          channelObj.docs = currentNode.textContent;
          break;
        case "cloud":
          //need to parse node: <cloud domain="rpc.sys.com" port="80" path="/RPC2" registerProcedure="pingMe" protocol="soap"/>
          break;
        case "ttl":
          channelObj.ttl = currentNode.textContent;
          break;
        case "image":
          channelObj.image = new Object();
          this.parseNode(currentNode, channelObj.image);
          break;
        case "url":
          //for image node (title and link nodes handled as normal children)
          channelObj.url = currentNode.textContent;
          break;
        case "rating":
          channelObj.rating = currentNode.textContent;
          break;
        case "textInput":
          channelObj.textInput = new Object();
          this.parseNode(currentNode, channelObj.textInput);
          break;
        case "name":
          //for textInput node (title, description, link nodes handled as normal children)
          channelObj.name = currentNode.textContent;
          break;
        case "skipHours":
          channelObj.skipHours = currentNode.textContent;
          break;
        case "skipDays":
          channelObj.skipDays = currentNode.textContent;
          break;
        case "item":
          if ((this._channel["item"] == undefined) || (this._channel["item"] == null)) {
            this._channel.item = new Array();
          }
          var channelItem = new Object();
          this._channel.item.push(channelItem);
          this.parseNode(currentNode, channelItem);
          break;
        case "author":
          //for item node
          channelObj.author = currentNode.textContent;
          break;
        case "comments":
          //for item node
          channelObj.comments = currentNode.textContent;
          break;
        case "enclosure":
          //for item node
          //need to parse node: <enclosure url="http://www.scripting.com/mp3s/weatherReportSuite.mp3" length="12216320" type="audio/mpeg" />
          break;
        case "guid":
          //for item node
          channelObj.guid = currentNode.textContent;
          break;
        case "source":
          //for item node
          //need to parse node: <source url="http://www.tomalak.org/links2.xml">Tomalak's Realm</source>
          break;
        default: break;
      }
    }
  }

  /**
  * Loads RSS XML data via XMLHttpRequest.
  *
  * @param {String} method The request method to use (e.g. "GET", "POST", etc.)
  * @param {String} url The url of the RSS XML data.
  */
  load (method, url) {
    this._refreshInfo = new Object();
    this._refreshInfo.method = method;
    this._refreshInfo.url = url;
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", this.xhrResultHandler.bind(this));
    method = method.toUpperCase();
    xhr.open(method, url);
    xhr.send();
  }

  /**
  * Handles RSS data loaded via XMLHttpRequest.
  *
  * @param {Event} event A load completion event.
  */
  xhrResultHandler(event) {
    try {
      var RSSXMLDocument = event.target.responseXML;
      if (this.onLoad != null) {
        this.onLoad(event.target.responseXML);
      }
      this.parse(event.target.responseXML);
      if (this.onParse != null) {
        this.onParse(this);
      }
    } catch (err) {
      console.error(err.toString());
    } finally {
      if (this.refreshSeconds > 0) {
        var refreshMs = this.refreshSeconds*1000;
        setTimeout(this.load.bind(this), refreshMs, this._refreshInfo.method, this._refreshInfo.url);
      }
    }
  }

  /**
  * @property {Object} [channel=null] The parsed RSS data that was either supplied as instantiation or
  * via a load. The data should (mostly) match the structure of the loaded RSS data, including naming conventions.
  * @readonly
  */
  get channel() {
    if (this._channel == undefined) {
      this._channel = null;
    }
    return (this._channel);
  }

}
