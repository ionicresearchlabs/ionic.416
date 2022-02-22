/**
* @file Enables inter-frame / inter-tab messaging.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class An inter-frame / inter-tab messaging system.
* @extends EventTarget
*/
class Messaging extends EventTarget {

  /**
  * Creates a new instance.
  *
  * @param {String} [channel="Messaging"] The exclusive communication channel
  * over which to send and receive messages with this instance.
  * @param {String} [use="best"] The messaging mechanism to use with this instance.
  * If "best", the best available mechanism is used, otherwise "BroadcastChannel"
  * and "localStorage" are valid. For widest compatability, "localStorage" should be used.
  */
  constructor(channel="Messaging", use="best") {
    super();
    if (use == "best") {
      this._use = this.detectBestMessagingType();
    } else {
      this._use = use;
    }
    this._channel = channel;
    if ((Messaging._messageIndex == undefined) || (Messaging._messageIndex == null)) {
      Messaging._messageIndex = 0;
    }
    if (this.useBroadcastChannel) {
      this._broadcastChannel = new BroadcastChannel(this.channel);
      this._broadcastChannel.addEventListener("message", this.onBroadcastChannelMessage.bind(this));
    } else if (this.useLocalStorage) {
      window.addEventListener("storage", this.onLSOChange.bind(this));
    } else {
      throw (new Error(`Unrecognized messaging mechanism ${use}`));
    }
  }

  /**
  * Dispatched when a message for the associated [channel]{@link Messaging#channel}
  * has been received.
  *
  * @event Messaging#message
  * @type {Object}
  * @property {*} data The message data received with the message.
  */

  /**
  * Detects the best available messaging mechanism.
  *
  * @return {String} Either "BroadcastChannel", "localStorage", or "none" if
  * messaging is not available.
  * @private
  */
  detectBestMessagingType() {
    if (BroadcastChannel) {
      return ("BroadcastChannel");
    };
    if (window.localStorage) {
      return ("localStorage");
    };
    return ("none");
  }

  /**
  * @property {Boolean} useBroadcastChannel Returns <code>true</code> if
  * the "BroadcastChannel" mechanism has been assigned to this instance.
  *
  * @readonly
  * @private
  */
  get useBroadcastChannel() {
    if (this._use == "BroadcastChannel") {
      return (true);
    }
    return (false);
  }

  /**
  * @property {Boolean} useLocalStorage Returns <code>true</code> if
  * the "localStorage" mechanism has been assigned to this instance.
  *
  * @readonly
  * @private
  */
  get useLocalStorage() {
    if (this._use == "localStorage") {
      return (true);
    }
    return (false);
  }

  /**
  * @property {String} channel The name of the channel in which this instance
  * sends and receives messages.
  * @readonly
  */
  get channel() {
    return (this._channel);
  }

  /**
  * @property {Number} messageIndex A global read-incremental index value
  * used to construct unique message identifiers.
  * @static
  * @private
  * @readonly
  */
  static get messageIndex() {
    if ((Messaging._messageIndex == undefined) || (Messaging._messageIndex == null)) {
      Messaging._messageIndex = 0;
    }
    Messaging._messageIndex++;
    return (Messaging._messageIndex);
  }

  /**
  * @property {String} randomMessageId A unique message identifier combining
  * a pseudo-random numeric value and [messageIndex]{@link Messaging#messageIndex}.
  * @private
  * @readonly
  */
  get randomMessageId() {
    var randomInt = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    var rmid = String(randomInt)+String(Messaging.messageIndex);
    return (rmid);
  }

  /**
  * Generates a standardized object to use in localStorage-based messaging.
  *
  * @param {*} [data=null] The message data with which to initialize the object.
  *
  * @return {Object} Contains a unique message <code>id</code>, an ISO <code>datetime</code>
  * string, a <code>type</code> property used to differentiate the object from other
  * localStorage data (currently always "Messaging"), the messaging <code>channel</code>,
  * and the message <code>data</code>.
  * @private
  */
  newLSOMessage(data=null) {
    var now = new Date();
    var msgObj = new Object();
    msgObj.id = this.randomMessageId; //can be used to avoid possible duplication
    msgObj.datetime = now.toISOString();
    msgObj.type = "Messaging";
    msgObj.channel = this.channel;
    msgObj.data = data;
    return (msgObj);
  }

  /**
  * Handler for incoming messages sent over a BroadcastChannel.
  *
  * @param {MessageEvent} event The BroadcastChannel's message event.
  *
  * @fires Messaging#message
  * @private
  */
  onBroadcastChannelMessage(event) {
    var eventObj = new Event("message");
    eventObj.data = event.data;
    this.dispatchEvent(eventObj);
  }

  /**
  * Handler for incoming messages sent over localStorage.
  *
  * @param {StorageEvent} event The localStorage change event.
  *
  * @fires Messaging#message
  * @private
  */
  onLSOChange (event) {
    var msgStr = event.newValue;
    if (msgStr == null) {
      return;
    }
    try {
      var msgObj = JSON.parse(msgStr);
    } catch (err) {
      return;
    }
    if (typeof(msgObj["channel"]) == "string") {
      if ((msgObj.channel == this.channel) && (msgObj.type == "Messaging")) {
        var eventObj = new Event("message");
        eventObj.data = msgObj.data;
        this.dispatchEvent(eventObj);
      }
    }
  }

  /**
  * Broadcasts data to all registered [channel]{@link Messaging#channel} recipients
  * over the associated messaging mechanism.
  *
  * @param {*} sendData The data to send to all recipients.
  * @param {Boolean} [includeSelf=false] If <code>true</code>, a "[message]{@link Messaging#message}"
  * event is fired to any listeners registered to this instance.
  *
  * @fires Messaging#message
  */
  broadcast(sendData, includeSelf=false) {
    if (this.useBroadcastChannel == true) {
      try {
        this._broadcastChannel.postMessage(sendData);
      } catch (err) {
        //Most likely an object cloning error (probably contains function references).
        //Can't use Object.assign since it produces the same deep clone so:
        var sendObj = JSON.parse(JSON.stringify(sendData));
        this._broadcastChannel.postMessage(sendObj);
      }
    } else if (this.useLocalStorage == true) {
      var msgObj = this.newLSOMessage(sendData);
      window.localStorage.removeItem(this.channel); //otherwise it won't always update
      window.localStorage.setItem(this.channel, JSON.stringify(msgObj));
    } else {
      throw (new Error(`Unrecognized or unsupported message broadcast mechanism "${this._use}"`));
    }
    if (includeSelf == true) {
      var eventObj = new Event("message");
      eventObj.data = sendData;
      this.dispatchEvent(eventObj);
    }
  }

  /**
  * @private
  */
  toString() {
    return (`[object Messaging "${this.channel}"]`);
  }

}
