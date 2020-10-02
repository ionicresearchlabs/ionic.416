/**
* @file Controls and manages a horizontal information ticker.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @license MIT license
*/
class Ticker {

  /**
  * Creates a new instance.
  */
  constructor(tickerSelector) {
    this._tickerElement = document.querySelector(tickerSelector);
    var tickerItems = this.tickerElement.querySelector(`.${this.tickerItemClass}`);
    this.updateTickerSpeed(tickerItems.length);
  }

  /**
  * @property {HTMLElement} tickerElement A reference to the ticker container element associated with
  * this instance.
  * @readonly
  */
  get tickerElement() {
    return (this._tickerElement);
  }

  /**
  * @property {String} tickerItemClass The default style class to give to any new ticker item.
  */
  get tickerItemClass() {
    if ((this._tickerItemClass == null) || (this._tickerItemClass == undefined)) {
      this._tickerItemClass = "ticker-item";
    }
    return (this._tickerItemClass);
  }

  set tickerItemClass(TIClass) {
    this._tickerItemClass = TIClass;
  }

  /**
  * Updates / resets the ticker display with new messages.
  *
  * @param {Array} messagesArray Array of HTML or plain-text messages to assign to the
  * ticker display.
  */
  update(messagesArray) {
    var rawHTML = new String();
    for (var count=0; count < messagesArray.length; count++) {
      var currentMessage = messagesArray[count];
      var msgHTML = `<div class="${this.tickerItemClass}"> ${currentMessage}</div>`;
      rawHTML += msgHTML;
    }
    this.tickerElement.innerHTML = rawHTML;
    this.updateTickerSpeed(messagesArray.length);
  }

  /**
  * Updates the ticker speed based on a number of list items. It is assumed that each item will
  * appear in the ticker area for a total ot 10 seconds.
  *
  * @param {Number} numItems The number of items in a scroller to use to calculate the new
  * ticker speed. The larger the number, the faster the speed.
  */
  updateTickerSpeed(numItems) {
    var durationPerItem = 10; //seconds
    var duration = String(numItems*durationPerItem)+"s";
    this.tickerElement.style.animationDuration = duration;
  }

  /**
  * Pauses the running ticker animation.
  */
  pause() {
    this.tickerElement.style.webkitAnimationPlayState = "paused";
    this.tickerElement.style.animationPlayState = "paused";
  }

  /**
  * Unpauses or resumes the paused ticker animation.
  */
  unpause() {
    this.tickerElement.style.webkitAnimationPlayState = "running";
    this.tickerElement.style.animationPlayState = "running";
  }

  toString() {
    return ("[object Ticker]");
  }

}
