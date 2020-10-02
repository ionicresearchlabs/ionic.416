/**
* @file Manages the functionality of the IONIC clock component.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @copyright MIT License
*/

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
  targetTimeContainer.innerHTML = calculateTZOffset(-4).toLocaleTimeString(locale, timeOptions);
  targetDateContainer.innerHTML = calculateTZOffset(-4).toLocaleDateString(locale, dateOptions);
  localTimeContainer.innerHTML = now.toLocaleTimeString(locale, timeOptions);
  localDateContainer.innerHTML = now.toLocaleDateString(locale, dateOptions);
  var t = setTimeout(refreshTime, 500);
}

/**
* Calculates the current time at a specific timezone offset and returns the result.
*
* @param {Number} offset The timezone offset relative to GTM. For example, -4 is
* Eastern Standard Time.
*
* @return {Date} The current date/time object at the specified timezone.
*/
function calculateTZOffset(offset) {
  var now = new Date();
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var offsetDate = new Date(utc + (3600000*offset));
  return (offsetDate);
}

window.onload = () => {
  refreshTime();
}
