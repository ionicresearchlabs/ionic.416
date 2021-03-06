/**
* @file Manages the functionality of the IONIC clock component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

var timezoneOffset = -4; //updated after getCurrentTimeOffset call below

/**
* Continuously displays the target and local dates / times on a 500ms timer.
*/
function refreshTime() {
  var now = new Date();
  var targetTimeContainer = document.querySelector("#target-clock-container");
  var localTimeContainer = document.querySelector("#local-clock-container");
  var targetDateContainer = document.querySelector("#target-date-container");
  var localDateContainer = document.querySelector("#local-date-container");
  var locale = "en-US";
  var timeOptions = {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }
  var dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }
  targetTimeContainer.innerHTML = calculateTZOffset(timezoneOffset).toLocaleTimeString(locale, timeOptions);
  targetDateContainer.innerHTML = calculateTZOffset(timezoneOffset).toLocaleDateString(locale, dateOptions);
  localTimeContainer.innerHTML = now.toLocaleTimeString(locale, timeOptions);
  localDateContainer.innerHTML = now.toLocaleDateString(locale, dateOptions);
  var t = setTimeout(refreshTime, 500);
}

/**
* Calculates the current time at a specific timezone offset and returns the result.
*
* @param {Number} offset The timezone offset relative to GTM. No DST adjustment is
* made during this calculation.
*
* @return {Date} The current date/time object at the specified timezone.
*/
function calculateTZOffset(offset) {
  var now = new Date();
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var offsetDate = new Date(utc + (3600000*offset));
  return (offsetDate);
}

/**
* Parses the current time zone offset from retrieved data. The returned data
* is expected to be in a standardized JSON format containing a <code>utc_offset</code>
* property.
*
* @param {Event} event A XMLHTTPRequest response event.
*
*/
function parseCurrentTimeOffset(event) {
  try {
    var responseStr = event.target.responseText;
    var response = JSON.parse(responseStr);
    var tzOffset = parseInt(response.utc_offset.split(":")[0]);
    event.target._resolve(tzOffset);
  } catch (err) {
    event.target._reject(err);
  }
}

/**
* Retrieves the current timezone offset for a location, including DST adjustments, from an
* external API.
*
* @param {String} [url="https://worldtimeapi.org/api/timezone/America/Toronto"] The API to
* to call to retrieve the adjusted timezone. Default is url is for Toronto, Canada.
*
* @return {Promise} Resolves with a number representing the current, DST-adjusted timezone offset
* (from UTC), or rejects with an error.
*/
function getCurrentTimeOffset(url="https://worldtimeapi.org/api/timezone/America/Toronto") {
  var promise = new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr._resolve = resolve;
    xhr._reject = reject;
    xhr.overrideMimeType("application/json");
    xhr.addEventListener("load", parseCurrentTimeOffset);
    xhr.open("GET", url);
    xhr.send();
  });
  return (promise);
}

window.onload = () => {
  getCurrentTimeOffset().then(result => {
    timezoneOffset = result;
    refreshTime();
  })
}
