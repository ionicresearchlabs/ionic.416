/**
* @file Handles a single IndexedDB database in a supporting browser.
*
* @version 0.1.0
* @author IONIC Research Labs, a division of TSG.
* @copyright MIT License
*/
/**
* @class Handles a single IndexedDB database in a supporting browser.
* @extends EventTarget
*/
class Database extends EventTarget {

  /**
  * Creates a new instance.
  */
  constructor() {
    super();
    this._busy = false;
    this._ready = false;
  }

  /**
  * @property {Boolean} ready=false <code>true</code> if the managed database is ready
  * for operations (successfully opened), <code>false</code> otherwise.
  *
  * @readonly
  */
  get ready() {
    return (this._ready);
  }

  /**
  * @property {String} databaseName=null The name of the database being managed
  * by this instance, as set by the [open]{@link Database#open} or [create]{@link Database#create}
  * functions.
  *
  * @readonly
  */
  get databaseName() {
    if (this._databaseName == undefined) {
      this._databaseName = null;
    }
    return (this._databaseName);
  }

  /**
  * @property {IndexedDB} db=null Reference to the database being managed
  * by this instance. Will only be set when [open]{@link Database#open} or
  * [create]{@link Database#create} are successfully called.
  *
  * @readonly
  */
  get db() {
    if (this._db == undefined) {
      this._db = null;
    }
    return (this._db);
  }

  /**
  * Creates an asynchronous hold queue to process actions that can't
  * be executed simultaneously (such as [create]{@link Database#create}).
  *
  * @return {Promise} Will resolve immediately if there are no queued items,
  * or wait until previous queued items are resolved
  * (via [releaseQueue]{@link Database#releaseQueue}).
  * @private
  */
  holdOnQueue() {
    if (this._actionQueue == undefined) {
      this._actionQueue = new Array();
    }
    var promise = new Promise((resolve, reject) => {
      if (this._busy == false) {
        this._busy = true;
        resolve(true);
      } else {
        var queueObj = new Object();
        queueObj.resolve = resolve;
        queueObj.reject = reject;
        this._actionQueue.push(queueObj);
      }
    })
    return (promise);
  }

  /**
  * Releases the next hold queued by [holdOnQueue]{@link Database#holdOnQueue}.
  * This function should be invoked only after a queued action has fully completed.
  * @private
  */
  releaseQueue() {
    if (this._actionQueue.length > 0) {
      var holdItem = this._actionQueue.shift();
      this._busy = true;
      holdItem.resolve(true);
    } else {
      this._busy = false;
    }
  }

  /**
  * Opens or creates a new database. Most subsequent operations require the database
  * to be opened before it can be used. A database open operation will still resolve
  * when there are no object stores but a warning will be posted to the JavaScript console.
  *
  * @param {String} dbName The name of the database to open or create.
  * @param {String|Array} [objectStoreName=null] The default object store name(s) to use
  * with subsequent operations. Note that providing this value does <i>not</i> create the object store
  * (for this use [create]{@link Database#create} but only stores it for subsequent operations.
  * @param {Number} [dbVersion=0] The database version to open the database at. If omitted or <code>null</code>,
  * the newest version is assumed. Note that providing a version higher than the highest current version will
  * cause the returned promise to be rejected.
  *
  * @return {Promise} Resolves with the success event or rejects with an error event.
  * @async
  */
  open(dbName, objectStoreName=null, dbVersion=0) {
    var promise=new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject (new Error("Browser does not support standard implementation of IndexedDB."));
        return;
      }
      this._ready = false;
      try {
        this._db.close();
      } catch (err) {}
      this._databaseName = dbName;
      if (dbVersion != 0) {
        var openRequest = window.indexedDB.open(dbName, dbVersion);
      } else {
        openRequest = window.indexedDB.open(dbName);
      }
      openRequest.onerror = event => {
        reject(event);
      }
      openRequest.onsuccess = event => {
        this._db = event.target.result;
        if (objectStoreName != null) {
          this._storeName = objectStoreName;
        }
        this._ready = true;
        resolve(event);
      }
      openRequest.onupgradeneeded = event => {
        console.warn (`Database "${dbName}" has no object stores. Use <create> to make some.`);
        this._ready = true;
        resolve(event);
      }
    });
    return (promise);
  }

  /**
  * Creates or opens a database with an initial object store, or creates a new object store in an existing database.
  * If the object store already exists, the returned promise simply resolves. If the database was previously opened,
  * this function will close it first. If this function is called more than once before the first invocation has completed,
  * subsequent create actions are queued and invoked in turn.
  * Note that this function will automatically increment the database version, and the database will remain open for
  * subsequent operations.
  *
  * @param {String} dbName The database name to create if it doesn't exist.
  * @param {String} objectStoreName The name of the object store to create.
  * @param {String|Number} id The primary indexed id, or key, with which to create
  * the object store.
  * @param {Object} [indexes=null] An array containing name-value pairs of other index properties
  * of the object store. Each value must contain an object containing the <code>objectParameters</code>
  * of the index, as specified in the <code>IDBObjectStore.createIndex</code> function definition.
  *
  * @return {Promise} Resolves with a success event when the object store is created or rejects
  * with a error event / object.
  *
  * @async
  */
  create(dbName, objectStoreName, id, indexes=null) {
    var promise=new Promise((resolve, reject) => {
      this.holdOnQueue().then(_ => {
        if (!window.indexedDB) {
          reject (new Error("Browser does not support standard implementation of IndexedDB."));
          return;
        }
        this._ready = false;
        try {
          this._db.close();
        } catch (err) {}
        var openRequest = window.indexedDB.open(dbName); //current version
        //don't handle onerror; causes an "abort" error to be raised (because of close->open combo?)
        openRequest.onsuccess = event => {
          var dbObj = event.target.result;
          this._db = dbObj;
          this._databaseName = dbName;
          var storeNames = dbObj.objectStoreNames;
          for (var count=0; count < storeNames.length; count++) {
            if (storeNames[count] == objectStoreName) {
              this._ready = true;
              resolve (new Error("Object store \""+objectStoreName+"\" already exists."));
              this.releaseQueue();
              return;
            }
          }
          var dbVersion = dbObj.version;
          dbVersion++;
          this._db.close();
          var createRequest = window.indexedDB.open(dbName, dbVersion);
          //don't handle onerror; causes an "abort" error to be raised (because of close->open combo?)
          createRequest.onupgradeneeded = event => {
            var dbCObj = event.target.result;
            this._db = dbCObj;
            this.createObjectStore(dbCObj, objectStoreName, id, indexes).then(event => {
              this._ready = true;
              resolve(event);
              this.releaseQueue();
            }).catch (event => {
              reject(event);
              this.releaseQueue();
            })
          }
        }
        openRequest.onupgradeneeded = event => {
          this._databaseName = dbName;
          var dbObj = event.target.result;
          this._db = dbObj;
          openRequest.onsuccess = null; //otherwise it gets called after successful creation
          this.createObjectStore(dbObj, objectStoreName, id, indexes).then(event => {
            this._ready = true;
            resolve(event);
            this.releaseQueue();
          }).catch (event => {
            reject(event);
            this.releaseQueue();
          })
        }
      });
    });
    return (promise);
  }

  /**
  * Creates an object store in an open database.
  *
  * @param {IndexedDB} dbObj The opened database in which to create the object store.
  * @param {String} objectStoreName The name of the object store to create.
  * @param {String|Number} id The primary indexed id, or key, with which to create
  * the object store.
  * @param {Object} indexes An array containing name-value pairs of other index properties
  * of the object store. Each value must contain an object containing the <code>objectParameters</code>
  * of the index, as specified in the <code>IDBObjectStore.createIndex</code> function definition.
  *
  * @return {Promise} Resolves with <code>true</code> when the object store is created.
  *
  * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/createIndex
  * @private
  * @async
  */
  createObjectStore(dbObj, objectStoreName, id, indexes) {
    var promise = new Promise((resolve, reject) => {
      try {
        var objectStore = dbObj.createObjectStore(objectStoreName, {keyPath: id});
        if ((indexes != null) && (indexes != undefined)) {
          for (var item in indexes) {
            objectStore.createIndex(item, item, indexes[item]);
          }
        }
        objectStore.transaction.oncomplete = event => {
          resolve(true);
        }
      } catch (err) {
        reject (err);
      }
    })
    return (promise);
  }

  /**
  * Closes an opened database. The database must have previously been
  * [opened]{@link Database#open} or [created]{@link Database#create}.
  */
  close () {
    try {
      this.db.close();
    } catch (err) {
    } finally {
      this._ready = false;
    }
  }

  /**
  * Inserts one or more entries into an open database's object store.
  *
  * @param {Array} insertArr An array of objects to insert into the open database. Note that
  * each entry's id (key), must be unique.
  * @param {String|Array} [objectStoreName=null] The object store(s) to insert into. May either
  * be a single store (String), or multiple stores (Array). If omitted or <code>null</null>,
  * the store name must be specified when the database is [opened]{@link Database#open} or
  * [created]{@link Database#create}.
  *
  * @return {Promise} The returned promise resolves with the result event, or rejects
  * with an error event / object.
  *
  * @async
  */
  insert (insertArr, objectStoreName=null) {
    var promise = new Promise((resolve, reject) => {
      if (this.ready == false) {
        reject (new Error("Database not ready / opened."));
        return;
      }
      if (objectStoreName == null) {
        objectStoreName = this.storeName;
      }
      if (objectStoreName == null) {
        reject (new Error("No object store name defined."));
        return;
      }
      var transaction = this.db.transaction(objectStoreName, "readwrite");
      transaction.oncomplete = function(event) {
        resolve(event);
      };
      transaction.onerror = function(event) {
        reject(event);
      };
      var objectStore = transaction.objectStore(objectStoreName);
      insertArr.forEach(function(data) {
        var request = objectStore.add(data);
        request.onsuccess = function(event) {
          //maybe dispatch an event?
        };
      });
    });
    return (promise);
  }

  /**
  * Deletes an entry from an open database's object store based on its key (id).
  *
  * @param {String|Number} itemId The id, or key, of the entry to delete. If a numeric
  * value is supplied it will be cast to a string.
  * @param {String|Array} [objectStoreName=null] The object store(s) to delete from. May either
  * be a single store (String), or multiple stores (Array). If omitted or <code>null</null>,
  * the store name must be specified when the database is [opened]{@link Database#open} or
  * [created]{@link Database#create}.
  *
  * @return {Promise} The returned promise resolves with the result event, or rejects
  * with an error event / object.
  *
  * @async
  */
  deleteById (itemId, objectStoreName=null) {
    var promise = new Promise((resolve, reject) => {
      if (objectStoreName == null) {
        objectStoreName = this.storeName;
      }
      if (objectStoreName == null) {
        reject (new Error("No object store name defined."));
        return;
      }
      if (this.ready == false) {
        reject (new Error("Database not ready / opened."));
        return;
      }
      var request = this.db.transaction(storeName, "readwrite").objectStore(storeName).delete(itemId);
      request.onsuccess = function(event) {
        resolve(event);
      };
      request.onerror = function(event) {
        reject(event);
      };
    })
    return (promise);
  }

  /**
  * Retrieves an entry from an open database's object store based on its key (id).
  *
  * @param {String|Number} itemId The id, or key, of the entry to retrieve. If a numeric
  * value is supplied it will be cast to a string.
  * @param {String|Array} [objectStoreName=null] The object store(s) to retrieve from. May either
  * be a single store (String), or multiple stores (Array). If omitted or <code>null</null>,
  * the store name must be specified when the database is [opened]{@link Database#open} or
  * [created]{@link Database#open}.
  *
  * @return {Promise} The returned promise resolves with the result event (with resulting data contained
  * in the <code>target.result</code> property), or rejects with an error event / object. Note that if
  * no matching data is found, the promise will still resolve but the <code>target.result</code>
  * property will be absent.
  *
  * @async
  */
  getById (itemId, objectStoreName=null) {
    var promise = new Promise((resolve, reject) => {
      if (this.ready == false) {
        reject (new Error("Database not ready / opened."));
        return;
      }
      if (objectStoreName == null) {
        objectStoreName = this.storeName;
      }
      if (objectStoreName == null) {
        reject (new Error("No object store name defined."));
        return;
      }
      var transaction = this.db.transaction(objectStoreName, "readonly");
      var objectStore = transaction.objectStore(objectStoreName);
      var request = objectStore.get(itemId);
      request.onerror = function(event) {
        reject(event);
      };
      request.onsuccess = function(event) {
        resolve(event);
      };
    });
    return (promise);
  }

  /**
  * Updates an entry in an open database's object store based on its key (id).
  *
  * @param {String|Number} itemId The id, or key, of the entry to update. If a numeric
  * value is supplied it will be cast to a string.
  * @param {Object} updateData Contains the data (name-value pairs), to update in the
  * target entry.
  * @param {String|Array} [objectStoreName=null] The object store(s) to update in. May either
  * be a single store (String), or multiple stores (Array). If omitted or <code>null</null>,
  * the store name must be specified when the database is [opened]{@link Database#open} or
  * [created]{@link Database#open}.
  *
  * @return {Promise} The returned promise resolves with the post-update event, or rejects
  * with an error event / object.
  *
  * @async
  */
  updateById (itemId, updateData, objectStoreName=null) {
    var promise = new Promise((resolve, reject) => {
      if (this.ready == false) {
        reject (new Error("Database not ready / opened."));
        return;
      }
      if (objectStoreName == null) {
        objectStoreName = this.storeName;
      }
      if (objectStoreName == null) {
        reject (new Error("No object store name defined."));
        return;
      }
      var objectStore = this.db.transaction(objectStoreName, "readwrite").objectStore(objectStoreName);
      var request = objectStore.get(itemId);
      request.onerror = function(event) {
        reject(event);
      };
      request.onsuccess = function(event) {
        var data = event.target.result;
        data = updateData;
        var requestUpdate = objectStore.put(data);
        requestUpdate.onerror = function(event) {
         reject(event);
        };
        requestUpdate.onsuccess = function(event) {
         resolve(event);
        };
      };
    });
    return (promise);
  }

  /**
  * Searches an open database.
  *
  * @param {String} term The term for which to search.
  * @param {String|Array} [searchNames="*"] The names of object properties to search.
  * Can either be single property (String), or multiple properties (Array). A wildcard
  * property ("*") indicates a search through all (any), properties.
  * @param {String|Array} [objectStoreName=null] The object store(s) to search in. May either
  * be a single store (String), or multiple stores (Array). If omitted or <code>null</null>,
  * the store name must be specified when the database is [opened]{@link Database#open} or
  * [created]{@link Database#open}.
  * @param {Number} [limit=0] The maximum number of search results to return. A value of 0
  * returns all matches.
  * @param {Boolean} [caseSensitive=false] If true, the search is conducted with a case-sensitive
  * <code>term</code>.
  *
  * @return {Promise} The returned promise resolves with an array of search results, or an empty
  * array of no matches are found.
  *
  * @async
  */
  search (term, searchNames="*", objectStoreName=null, limit=0, caseSensitive=false) {
    var promise = new Promise ((resolve, reject) => {
      if (this.ready == false) {
        reject (new Error("Database not ready / opened."));
        return;
      }
      if (objectStoreName == null) {
        objectStoreName = this.storeName;
      }
      if (objectStoreName == null) {
        reject (new Error("No object store name defined."));
        return;
      }
      var objectStore = this.db.transaction(objectStoreName, "readonly").objectStore(objectStoreName);
      var cursorRequest = objectStore.openCursor();
      var results = new Array();
      var searchTerm = String(term);
      if (caseSensitive == false) {
        searchTerm = searchTerm.toLowerCase();
      }
      cursorRequest.onsuccess = event => {
        var cursor = event.target.result;
        if (cursor) {
          var currentObj = cursor.value;
          if (typeof(searchNames) == "string") {
            if (searchNames == "*") {
              //global search
              var objStr = JSON.stringify(currentObj);
              if (caseSensitive == false) {
                objStr = objStr.toLowerCase();
              }
              if (objStr.indexOf(searchTerm) > -1) {
                results.push (currentObj);
              }
            } else {
              //single name/value search
              var valueStr = String(currentObj[searchNames]);
              if (caseSensitive == false) {
                valueStr = valueStr.toLowerCase();
              }
              if (valueStr.indexOf(searchTerm) > -1) {
                results.push (currentObj);
              }
            }
          } else {
            //multiple name/value search
            for (var count=0; count < searchNames.length; count++) {
              var searchName = searchNames[count];
              valueStr = String(currentObj[searchName]);
              if (caseSensitive == false) {
                valueStr = valueStr.toLowerCase();
              }
              if (valueStr.indexOf(searchTerm) > -1) {
                results.push (currentObj);
                count = searchNames.length; //redundant?
                break;
              }
            }
          }
          if ((results.length == limit) && (limit > 0)) {
            resolve(results);
          } else {
            //note that cursors can also be used to delete() and update() multiple objects
            cursor.continue();
          }
        } else {
          resolve(results);
        }
      }
    });
    return (promise);
  }

  static close(dbName) {

  }

  /**
  * Deletes an object store in a database. The database must be [closed]{@link Database#close} before
  * calling this function. Note that this is a static function (class, not instance-based). Additionally,
  * the database version is automatically incremented when deleting the object store.
  *
  * @param {String} dbName The name of the database containing the object store to delete.
  * @param {String} objectStoreName The name of the object store to delete.
  *
  * @return {Promise} The returned promise resolves with the <code>true</code> on successful
  * deletion, <code>false</code> otherwise.
  *
  * @async
  */
  deleteObjectStore (objectStoreName) {
    var promise = new Promise((resolve, reject) => {
      try {
        this._db.close();
      } catch (err) {}
      var openRequest = window.indexedDB.open(this.databaseName);
      openRequest.onerror = event => {
        reject(event);
      }
      openRequest.onsuccess = event => {
        event.target.result.close();
        var dbVersion = event.target.result.version;
        dbVersion++;
        var deleteRequest = window.indexedDB.open(this.databaseName, dbVersion);
        deleteRequest.onupgradeneeded = event => {
          try {
            event.target.result.close();
            event.target.result.deleteObjectStore(objectStoreName);
            this._ready = false;
            resolve(true);
          } catch (err) {
            reject (err);
          }
        }
      }
    });
    return (promise);
  }

  /**
  * Deletes a database and all of its object stores. The database must be [closed]{@link Database#close}
  * before calling this function. Note that this is a static function (class, not instance-based).
  *
  * @param {Database|String} dbRef A reference to the instance whose database should be deleted, or the
  * name of the database to delete
  *
  * @return {Promise} The returned promise resolves with the <code>true</code> on successful
  * deletion, <code>false</code> otherwise.
  *
  * @async
  * @static
  */
  static deleteDatabase (dbRef) {
    var promise = new Promise((resolve, reject) => {
      if (typeof(dbRef) != "string") {
        try {
          //does it also need to be cleared?
          dbRef.db.close();
        } catch (err) {}
        var deleteRequest = window.indexedDB.deleteDatabase(dbRef.databaseName);
        dbRef._ready = false;
      } else {
        var deleteRequest = window.indexedDB.deleteDatabase(dbRef);
      }
      deleteRequest.onsuccess = function () {
        resolve(true);
      };
      deleteRequest.onerror = function (event) {
        reject(event);
      };
      deleteRequest.onblocked = function (event) {
        reject(event);
      };
    });
    return (promise);
  }

  /**
  * @private
  */
  toString() {
    return ("[object Database]");
  }

}
