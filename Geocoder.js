/**
* @file A geocoding, location search, and distance calculation library.
*
* @version 0.1.0
*/
/**
* @class A library to look up (geocode) locations, coordinates, and calculate distances.
*/
class Geocoder {

  /**
  * Creates a new instance.
  */
  constructor() {
  }

  /**
  * Converts an angle in decimal degrees to radians.
  *
  * @param {Number} angle The angle in decimal degrees to convert.
  *
  * @return {Number} The calculated radians value.
  */
  toRadians(angle) {
    return (angle * Math.PI) / 180;
  }

  /**
  * @private
  */
  get proxy() {
    if ((this._proxy == undefined) || (this._proxy == null)) {
      this._proxy = "";
    }
    return (this._proxy);
  }

  /**
  * @private
  */
  set proxy(proxySet) {
    this._proxy = proxySet;
  }

  /**
  * @property {Object} searchProvider Contains the provider's descritptive <code>name</code>,
  * the provider's <code>homepage</code> URL, a parametric <code>searchURL</code> containing meta-tags (to be
  * replaced by search parameters), the HTTP <code>searchMethod</code> (e.g. "GET"), and an associated
  * <code>searchParser</code> function that will parse the returned results into a standard format.
  *
  * @private
  */
  get searchProvider() {
    var returnObj = new Object();
    returnObj.name = "Nominatim";
    returnObj.homepage = "https://nominatim.org/";
    //Reference: https://nominatim.org/release-docs/latest/api/Search/
    returnObj.searchURL = `https://nominatim.openstreetmap.org/search/?addressdetails=1&q=%location%&polygon_geojson=0&format=jsonv2`
    returnObj.searchMethod = "GET";
    //returnObj.searchParams = null;
    returnObj.searchParser = function (resolve, reject, event) {
      try {
        var rawJSON = event.target.responseText;
        var results = JSON.parse(rawJSON);
        var bestResult = null;
        var resultList = new Array();
        for (var count=0; count < results.length; count++) {
          var result = results[count];
          var resultObj = this.createResultObject(result.display_name, result.category, result.lat, result.lon, result.importance, result);
          resultList.push(resultObj);
          if (bestResult != null) {
            if (resultObj.confidence > bestResult.confidence) {
              bestResult = resultObj;
            }
          } else {
            bestResult = resultObj;
          }
        }
        resolve({bestResult, resultList});
      } catch (err) {
        reject(err);
      }
    }
    return(returnObj);
  }

  /**
  * A standard geocoding search result.
  *
  * @typedef {Object} SearchResult
  * @property {String} name The descriptive search result name.
  * @property {String} category The descriptive search result category.
  * @property {Number} latitude The latitude, in decimal degrees, of
  * the search result.
  * @property {Number} longitude The longitude, in decimal degrees, of
  * the search result.
  * @property {Number} confidence A decmal value between 0 and 1 denoting the fuzzy
  * search confidence of the result (the closer to 1 the more correct the search result
  * is considered to be).
  * @property {Object} data Any additional information included with the search result
  * (e.g. a copy of the raw received result data).
  *
  *
  */
  /**
  * Generates a standard search results data object.
  *
  * @param {String} name The descriptive search result name.
  * @param {String} category The descriptive search result category.
  * @param {String|Number} latitude The latitude, in decimal degrees, of
  * the search result.
  * @param {String|Number} longitude The longitude, in decimal degrees, of
  * the search result.
  * @param {Number} confidence A decmal value between 0 and 1 denoting the fuzzy
  * search confidence of the result (the closer to 1 the more correct the search result
  * match).
  * @param {Object} [data=null] Any additional information included with the search result
  * (e.g. a copy of the raw received result data).
  *
  * @private
  */
  createResultObject(name, category, latitude, longitude, confidence, data = null) {
    var resultObj = new Object();
    resultObj.name = new String(name);
    resultObj.category = new String(category);
    resultObj.confidence = new Number(confidence);
    resultObj.latitude = new Number(latitude);
    resultObj.longitude = new Number(longitude);
    resultObj.data = data;
    return (resultObj);
  }

  /**
  * Parses a parametric URL string, replacing meta-tags with search parameters.
  *
  * @param {String} templateURL The parametric search URL containing meta-tags to be
  * replaced with search parameters.
  * @param {Object} paramsObj Search parameters, as name-value pairs, to replace in
  * the <code>templateURL</code>. Each matching template parameter name, enclosed within
  * percent signs (%), will be replaced with the associated values.
  *
  * @return {String} The resulting search URL with parameters updated.
  * @private
  */
  parseParametricURL(templateURL, paramsObj) {
    for (var paramName in paramsObj) {
      templateURL = templateURL.split("%"+paramName+"%").join(paramsObj[paramName]);
    }
    return (templateURL);
  }

  /**
  * Searches for a generic location and returns the geocoded result.
  *
  * @param {String} location The generic location to geocode. May include any valid
  * search terms accepted by the search provider such as address, intersection, place name,
  * etc.
  *
  * @return {Promise} Resolves with an object containing a <code>bestResult</code> property
  * and <code>resultList</code> array or properties, all of type [SearchResult]{@link SearchResult}.
  * @async
  */
  search (location) {
    var promise = new Promise((resolve, reject) => {
      try {
        var params = {
          location: location
        }
        var url = this.parseParametricURL(this.searchProvider.searchURL, params);
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", this.searchProvider.searchParser.bind(this, resolve, reject));
        xhr.addEventListener("error", (event) => {
          reject (event);
        });
        xhr.open(this.searchProvider.searchMethod, this.proxy + url);
        xhr.send();
      } catch (err) {
        reject (err);
      }
    });
    return (promise);
  }

  /**
  * Optionally geocodes two locations and returns the distance between them in the desired units.
  *
  * @param {String|Object} location1 The first location. If it contains <code>latitude</code> and
  * <code>longitude</code> properties, no additional geocoding is done, otherwise this parameter
  * is assumed to be a search term to be used with the [search]{@link Geocoder#search} function.
  * @param {String|Object} location2 The second location. If it contains <code>latitude</code> and
  * <code>longitude</code> properties, no additional geocoding is done, otherwise this parameter
  * is assumed to be a search term to be used with the [search]{@link Geocoder#search} function.
  * @param {String} [resultUnits="km"] The distance units to return the resulting distance in. Valid
  * values include "km" (or standard variants), or "mi" (or standard variants).
  * @param {Number} [precision=2] The roudned decimal precision to calculate the distance to.
  *
  * @return {Promise} Resolves with an object containing the <code>distance</code>,
  * the <code>units</code> in which the distance is measured in, the <code>precision</code> to which
  * the distance was rounded, and the original <code>location1</code> and <code>location2</code> parameters.
  * Rejects on any errors.
  * @async
  */
  async distanceSearch (location1, location2, resultUnits="km", precision=2) {
    if ((typeof(location1["latitude"]) == "number") && (typeof(location1["longitude"]) == "number")) {
      var lat1 = location1.latitude;
      var lon1 = location1.longitude;
    } else {
      var {bestResult, resultList} = await this.search(location1);
      lat1 = bestResult.latitude;
      lon1 = bestResult.longitude;
    }
    if ((typeof(location2["latitude"]) == "number") && (typeof(location2["longitude"]) == "number")) {
      var lat2 = location2.latitude;
      var lon2 = location2.longitude;
    } else {
      var {bestResult, resultList} = await this.search(location2);
      lat2 = bestResult.latitude;
      lon2 = bestResult.longitude;
    }
    var returnObj = new Object();
    returnObj.distance = this.distanceCoords(lat1, lon1, lat2, lon2, resultUnits, precision);
    returnObj.units = resultUnits;
    returnObj.precision = precision;
    returnObj.location1 = location1;
    returnObj.location2 = location2;
    return (returnObj);
  }

  /**
  * Calculates the distance between two points denoted by decimal latitudes and longitudes
  * using the spherical Haversine formula.
  *
  * @param {Number} lat1 The decimal latitude of the first point.
  * @param {Number} lon1 The decimal longitude of the first point
  * @param {Number} lat2 The decimal latitude of the second point.
  * @param {Number} lon2 The decimal longitude of the second point
  * @param {String} [resultUnits="km"] The distance units to return the resulting distance in. Valid
  * values include "km" (or standard variants), or "mi" (or standard variants).
  * @param {Number} [precision=2] The roudned decimal precision to calculate the distance to.
  *
  * @return {Number} The calculated distance between the two points.
  */
  distanceCoords (lat1, lon1, lat2, lon2, resultUnits="km", precision=2) {
    lon1 = this.toRadians(lon1);
    lon2 = this.toRadians(lon2);
    lat1 = this.toRadians(lat1);
    lat2 = this.toRadians(lat2);
    // Haversine formula
    var dlon =lon2 - lon1;
    var dlat = lat2 - lat1;
    var a = Math.pow(Math.sin(dlat / 2), 2)
             + Math.cos(lat1) * Math.cos(lat2)
             * Math.pow(Math.sin(dlon / 2),2);
    var c = 2 * Math.asin(Math.sqrt(a));
    resultUnits = resultUnits.toLowerCase().split(" ").join("");
    switch (resultUnits) {
      case "kilometers":
        resultUnits = "km";
        break;
      case "kilometer":
        resultUnits = "km";
        break;
      case "kms":
        resultUnits = "km";
        break;
      case "km.":
        resultUnits = "km";
        break;
      case "kms.":
        resultUnits = "km";
        break;
      case "miles":
        resultUnits = "mi";
        break;
      case "mi.":
        resultUnits = "mi";
        break;
    }
    if (resultUnits == "km") {
      var radius = 6371; //earth radius in kilometers...
    } else if (resultUnits == "mi") {
      radius = 3956; //...and in miles
    } else {
      throw (new Error("Unsupported distance unit \""+resultUnits+"\""));
    }
    var rawResult = c * radius;
    var precisionMultiplier = Math.pow(10, precision);
    var result = Math.round(rawResult * precisionMultiplier) / precisionMultiplier;
    return (result);
  }

}
