/**
* @file Manages the functionality of the IONIC real-time streaming radio (rtradio) component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @license MIT license
*/

/**
* Callback handler for audio signal processing (<code>audioProcessCallback</code>),
* of an audio stream processor to updates the associated peak meter.
*
* @param {HTMLElement} meterElement The peak meter element to adjust.
* @param {AudioStreamProcessor} peakmeter The stream processor object invoking the
* callback.
*/
function onAudioSignal(meterElement, peakmeter) {
  meterElement.style.width = peakmeter.volume * 100 + '%';
}

/**
* Resets all UI peak meters to a "zero" (silent) state.
*
* @param {String} [meterPrefix="#peakmeter"] The selector prefix
* of the peak meter UI elements. Elements should be numbered sequentially
* starting from 1 and are considered to have ended when the following
* element (prefix + next_number) does not exist.
*/
function resetPeakMeters(meterPrefix="#peakmeter") {
  var selectorCount = 1;
  var meterSelector = meterPrefix+String(selectorCount);
  var meterElement = document.querySelector(meterSelector);
  while (meterElement != null) {
    meterElement.style.width = 0;
    selectorCount++;
    meterSelector = meterPrefix+String(selectorCount);
    meterElement = document.querySelector(meterSelector);
  }
}

/**
* Event handler invoked for an audio source's "loadeddata" event.
*
* @param {String} meterSelector The selector of the audio object dispatching the event.
* @param {Event} event The event object.
*/
function onAudioLoadStart(meterSelector, event) {
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioContext = new AudioContext();
  var meterElement = document.querySelector(meterSelector);
  var mediaStream = audioContext.createMediaElementSource(event.target);
  var peakmeter = createAudioStreamProcessor(audioContext, ()=>{});
  peakmeter.audioProcessCallback = onAudioSignal.bind(this, meterElement, peakmeter);
  mediaStream.connect(peakmeter);
  mediaStream.onended = peakmeter.close.bind(peakmeter);
}

/**
* Adds event listeners and handlers to all defined audio sources and their peak meters.
*
* @param {String} [sourcePrefix="#stream"] The selector prefix of existing audio
* elements on the page to append event listeners to. Elements must be numbered
* sequentially starting from 1 and are considered to have ended when the following
* element (sourcePrefix + next_number) doesn't exist.
* @param {String} [meterPrefix="#peakmeter"] The selector prefix of associated peak meter
* elements on the page to append event listeners to. Elements must be numbered
* sequentially starting from 1 and are considered to have ended when the following
* element (meterPrefix + next_number) doesn't exist.
*/
function addAudioListeners(sourcePrefix="#stream", meterPrefix="#peakmeter") {
  var selectorCount = 1;
  var sourceSelector = sourcePrefix+String(selectorCount);
  var audioElement = document.querySelector(sourceSelector);
  var meterSelector = meterPrefix+String(selectorCount);
  if (audioElement != null) {
    audioElement.addEventListener("loadeddata", onAudioLoadStart.bind(this, meterSelector));
  }
  while (audioElement != null) {
    selectorCount++;
    sourceSelector = sourcePrefix+String(selectorCount);
    audioElement = document.querySelector(sourceSelector);
    meterSelector = meterPrefix+String(selectorCount);
    if (audioElement != null) {
      audioElement.addEventListener("loadeddata", onAudioLoadStart.bind(this, meterSelector));
    }
  }
}

window.onload = function () {
  resetPeakMeters();
  if (window.usingISS == true)  {
    addAudioListeners();
  }
}
