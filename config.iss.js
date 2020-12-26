/**
* @file Global IONIC configuration file served by the IONIC Services Server.
*
* @author IONIC Research Labs, a division of TSG.
* @version 0.1.0
* @license MIT license
*/

window.usingISS = true;
window.ISSProxy = function() {
  var proxyObj = new Object();
  proxyObj.url = "/api/proxy/?url=";
  proxyObj.action = "append";
  proxyObj.encodeURIComponent = true;
  return (proxyObj);
}

window.settings = new Object();

window.settings.save = (componentName, settingsCategory, settingsName, settingsObj, version="416") => {
  try {
    var currentSettings = window.localStorage.getItem("IONIC");
    if (currentSettings == null) {
      currentSettings = new Object();
    }
    if ((currentSettings[version] == undefined) || (currentSettings[version] == null)) {
      currentSettings[version] = new Object();
    }
    var versionObj = currentSettings[version];
    if ((versionObj[componentName] == undefined) || (versionObj[componentName] == null)) {
      versionObj[componentName] = new Object();
    }
    var componentObj = versionObj[componentName];
    if ((componentObj[settingsCategory] == undefined) || (componentObj[settingsCategory] == null)) {
      componentObj[settingsCategory] = new Object();
    }
    var categoryObj = componentObj[settingsCategory];
    categoryObj[settingsName] = settingsObj;
    window.localStorage.setItem("IONIC", JSON.stringify(currentSettings));
  } catch (err) {
    console.error(err);
  }
}

window.settings.load = (componentName, settingsCategory=null, settingsName=null, version="416") => {
  try {
    var currentSettingsStr = window.localStorage.getItem("IONIC");
    var currentSettings = JSON.parse(currentSettingsStr);
    if (currentSettings == null) {
      return (null);
    }
    if ((currentSettings[version] == undefined) || (currentSettings[version] == null)) {
      return (null);
    }
    var versionObj = currentSettings[version];
    if ((versionObj[componentName] == undefined) || (versionObj[componentName] == null)) {
      return (null);
    }
    var componentObj = versionObj[componentName];
    if (settingsCategory == null) {
      //return component and all contained categories if no category name provided
      return (componentObj);
    }
    if ((componentObj[settingsCategory] == undefined) || (componentObj[settingsCategory] == null)) {
      return (null);
    }
    var categoryObj = componentObj[settingsCategory];
    if (settingsName == null) {
      //return category if no setting name provided
      return (categoryObj);
    }
    if (categoryObj[settingsName] == undefined) {
      return (null);
    }
    return (categoryObj[settingsName]);
  } catch (err) {
    return (null);
  }
}
