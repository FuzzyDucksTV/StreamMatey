/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!************************!*\
  !*** ./src/options.js ***!
  \************************/
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
document.addEventListener('DOMContentLoaded', function (event) {
  var features = {
    sentiment: {
      enableSentimentAnalysis: document.getElementById('sentimentToggle'),
      sensitivity: document.getElementById('sentimentSensitivity'),
      showTopScorersToggle: document.getElementById('showTopScorersToggle'),
      showBottomScorersToggle: document.getElementById('showBottomScorersToggle'),
      leaderboardToggle: document.getElementById('leaderboardToggle'),
      showTopScorers: document.getElementById('showTopScorers'),
      showBottomScorers: document.getElementById('showBottomScorers'),
      leaderboardDuration: document.getElementById('leaderboardDuration')
    },
    toxicity: {
      enableToxicityDetection: document.getElementById('toxicityToggle'),
      customMessageToxicUser: document.getElementById('toxicityMessage'),
      modNotificationToggle: document.getElementById('modNotificationToggle'),
      selfNotificationToggle: document.getElementById('toxicitySelfNotificationToggle'),
      modMessage: document.getElementById('toxicityModMessage'),
      selfMessage: document.getElementById('toxicitySelfMessage'),
      toxicityThreshold: document.getElementById('toxicitySensitivity')
    },
    darkMode: {
      darkMode: document.getElementById('darkModeToggle')
    }
  };
  var themeToggle = document.getElementById('darkModeToggle');
  var twitchLoginButton = document.getElementById('twitchLoginButton');
  var twitchLogoutButton = document.getElementById('twitchLogoutButton');
  function displayError(message) {
    var errorMessageElement = document.getElementById('error-message');
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
    setTimeout(function () {
      errorMessageElement.style.display = 'none';
    }, 5000);
  }

  // Function to load preferences
  function loadPreferences() {
    return _loadPreferences.apply(this, arguments);
  }
  function _loadPreferences() {
    _loadPreferences = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            //Send a message to the background script to load the preferences. The background script will send a response with the preferences
            chrome.runtime.sendMessage({
              type: 'loadPreferences'
            }, function (response) {
              if (response.error) {
                console.error('Error loading preferences:', response.error);
                displayError('Error loading preferences: ' + response.error);
              } else if (response.preferences) {
                // Preferences loaded successfully
                console.log('Preferences loaded successfully');
                // Set the preferences
                var preferences = response.preferences;
                if (preferences.darkMode) {
                  document.body.classList.add('dark');
                  themeToggle.checked = true;
                } else {
                  document.body.classList.remove('dark');
                  themeToggle.checked = false;
                }
                for (var _feature2 in preferences) {
                  if (preferences[_feature2].enabled) {
                    features[_feature2].toggle.checked = true;
                  } else {
                    features[_feature2].toggle.checked = false;
                  }
                  for (var _option2 in preferences[_feature2].options) {
                    var _input2 = features[_feature2][_option2];
                    if (_input2.type === 'checkbox') {
                      _input2.checked = preferences[_feature2].options[_option2];
                    } else if (_input2.type === 'range') {
                      _input2.value = preferences[_feature2].options[_option2];
                    } else {
                      _input2.value = preferences[_feature2].options[_option2];
                    }
                  }
                }
              } else {
                console.log("No preferences saved");
                // No preferences saved, so set the default preferences
                setDefaultPreferences();
              }
            });
          case 1:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return _loadPreferences.apply(this, arguments);
  }
  ;
  loadPreferences();

  // Function to save preferences
  var savePreferences = function savePreferences() {
    var preferences = {
      darkMode: themeToggle.checked
    };
    for (var feature in features) {
      preferences[feature] = {
        enabled: features[feature].toggle.checked,
        options: {}
      };
      for (var option in features[feature]) {
        if (option !== 'toggle') {
          var input = features[feature][option];
          if (input.type === 'checkbox') {
            preferences[feature].options[option] = input.checked;
          } else {
            preferences[feature].options[option] = input.value;
          }
        }
      }
    }

    // Encrypt the preferences using the encryption key
    var unencryptedPreferences = preferences;

    // Send the unencrypted preferences to the background script to save
    chrome.runtime.sendMessage({
      type: 'savePreferences',
      preferences: unencryptedPreferences
    }, function (response) {
      if (response.error) {
        console.error('Error saving preferences:', response.error);
        displayError('Error saving preferences: ' + response.error);
      } else {
        console.log('Preferences saved successfully');
      }
    });
  };
  themeToggle.addEventListener('change', function () {
    if (themeToggle.checked) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    savePreferences();
  });
  twitchLoginButton.addEventListener('click', function () {
    // Initiate OAuth flow with Twitch via Netlify function
    chrome.runtime.sendMessage({
      type: 'initiateTwitchOAuth',
      clientId: '1'
    }, function (response) {
      if (response.error) {
        console.error('Error initiating Twitch OAuth:', response.error);
        displayError('Error initiating Twitch OAuth: ');
      } else {
        console.log('Twitch OAuth initiated successfully');
      }
    });
  });
  for (var feature in features) {
    features[feature].toggle.addEventListener('change', savePreferences);
    for (var option in features[feature]) {
      if (option !== 'toggle') {
        var input = features[feature][option];
        input.addEventListener('input', function () {
          savePreferences();
        });
      }
    }
  }

  //Check if the user is logged in to Twitch
  chrome.runtime.sendMessage({
    type: 'checkTwitchLogin'
  }, function (data) {
    if (data.error) {
      console.error('Error checking Twitch login:', data.error);
      displayError('Error checking Twitch login: ' + data.error);
    } else if (data.loggedIn) {
      // The user is logged in to Twitch
      // Hide the login button and show the logout button
      twitchLoginButton.style.display = 'none';
      var _twitchLogoutButton = document.createElement('button');
      _twitchLogoutButton.innerText = 'Logout from Twitch';
      document.getElementById('twitchAuth').appendChild(_twitchLogoutButton);
      // Add event listener to logout button
      _twitchLogoutButton.addEventListener('click', function () {
        chrome.runtime.sendMessage({
          type: 'removeTwitchAccessToken'
        }, function (data) {
          if (date.error) {
            console.error('Error removing Twitch access token:', data.error);
            displayError('Error removing Twitch access token: ');
          } else {
            twitchLoginButton.style.display = 'block';
            _twitchLogoutButton.remove();
          }
        });
      });
    }
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'warning') {
      displayError(request.message);
    } else if (request.type === 'error') {
      displayError(request.message);
    } else if (request.type === 'preferences') {
      var preferences = request.preferences;
      if (preferences) {
        if (preferences.darkMode) {
          document.body.classList.add('dark');
          themeToggle.checked = true;
        } else {
          document.body.classList.remove('dark');
          themeToggle.checked = false;
        }
        for (var _feature in preferences) {
          if (preferences[_feature].enabled) {
            features[_feature].toggle.checked = true;
          } else {
            features[_feature].toggle.checked = false;
          }
          for (var _option in preferences[_feature].options) {
            var _input = features[_feature][_option];
            if (_input.type === 'checkbox') {
              _input.checked = preferences[_feature].options[_option];
            } else if (_input.type === 'range') {
              _input.value = preferences[_feature].options[_option];
            } else {
              _input.value = preferences[_feature].options[_option];
            }
          }
        }
      }
    } else {
      throw new Error("Unknown message type: ".concat(request.type));
    }
    return true; // Indicate that the response will be sent asynchronously
  });
});

/***/ })  