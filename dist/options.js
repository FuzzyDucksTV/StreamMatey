/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!************************!*\
  !*** ./src/options.js ***!
  \************************/
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
      toxicityThreshold: document.getElementById('toxicitySensitivity'),
      showTopScorersToggle: document.getElementById('showTopScorersToggle'),
      showBottomScorersToggle: document.getElementById('showBottomScorersToggle'),
      leaderboardToggle: document.getElementById('leaderboardToggle'),
      showTopScorers: document.getElementById('showTopScorers'),
      showBottomScorers: document.getElementById('showBottomScorers'),
      leaderboardDuration: document.getElementById('leaderboardDuration')
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
    chrome.runtime.sendMessage({
      type: 'loadPreferences'
    }, function (response) {
      if (response.error) {
        console.error('Error loading preferences:', response.error);
        displayError('Error loading preferences: ' + response.error);
      }
      var decryptedPreferences = response.preferences;
      if (preferences) {
        console.log("Preferences loaded");
        // Set the preferences on the options page
        if (decryptedPreferences.darkMode) {
          document.body.classList.add('dark');
          themeToggle.checked = true;
        } else {
          document.body.classList.remove('dark');
          themeToggle.checked = false;
        }
        for (var feature in decryptedPreferences) {
          if (decryptedPreferences[feature].enabled) {
            features[feature].toggle.checked = true;
          } else {
            features[feature].toggle.checked = false;
          }
          for (var option in decryptedPreferences[feature].options) {
            var input = features[feature][option];
            if (input.type === 'checkbox') {
              input.checked = decryptedPreferences[feature].options[option];
            } else if (input.type === 'range') {
              input.value = decryptedPreferences[feature].options[option];
            } else {
              input.value = decryptedPreferences[feature].options[option];
            }
          }
        }
      }
    });
  }

  // Load the user's preferences when the options page starts
  loadPreferences();

  // Function to save preferences
  function savePreferences() {
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

    // Send the encrypted preferences to the background script to save
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
  }
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
      type: 'initiateTwitchOAuth'
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
      var _preferences = request.preferences;
      if (_preferences) {
        // Decrypt the preferences using the encryption key
        var decryptedPreferences = _preferences;
        if (decryptedPreferences.darkMode) {
          document.body.classList.add('dark');
          themeToggle.checked = true;
        } else {
          document.body.classList.remove('dark');
          themeToggle.checked = false;
        }
        for (var _feature in decryptedPreferences) {
          if (decryptedPreferences[_feature].enabled) {
            features[_feature].toggle.checked = true;
          } else {
            features[_feature].toggle.checked = false;
          }
          for (var _option in decryptedPreferences[_feature].options) {
            var _input = features[_feature][_option];
            if (_input.type === 'checkbox') {
              _input.checked = decryptedPreferences[_feature].options[_option];
            } else if (_input.type === 'range') {
              _input.value = decryptedPreferences[_feature].options[_option];
            } else {
              _input.value = decryptedPreferences[_feature].options[_option];
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
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFHZCxvQkFBb0IsQ0FBQ1EsUUFBTyxDQUFDLENBQUNJLE9BQU8sQ0FBQ0QsT0FBTSxDQUFDO1lBQy9ELENBQUMsTUFBTTtjQUNIRSxNQUFLLENBQUNDLEtBQUssR0FBR2Qsb0JBQW9CLENBQUNRLFFBQU8sQ0FBQyxDQUFDSSxPQUFPLENBQUNELE9BQU0sQ0FBQztZQUMvRDtVQUNKO1FBQ0o7TUFDSjtJQUNKLENBQUMsTUFBTTtNQUNILE1BQU0sSUFBSWlCLEtBQUssMEJBQUFDLE1BQUEsQ0FBMEJKLE9BQU8sQ0FBQzdCLElBQUksQ0FBRSxDQUFDO0lBQzVEO0lBR0EsT0FBTyxJQUFJLENBQUMsQ0FBQztFQUVqQixDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQyIsInNvdXJjZXMiOlsid2VicGFjazovL3N0cmVhbW1hdGV5Ly4vc3JjL29wdGlvbnMuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIChldmVudCkgPT4ge1xyXG4gICAgY29uc3QgZmVhdHVyZXMgPSB7XHJcbiAgICAgICAgc2VudGltZW50OiB7XHJcbiAgICAgICAgICAgIGVuYWJsZVNlbnRpbWVudEFuYWx5c2lzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VudGltZW50VG9nZ2xlJyksXHJcbiAgICAgICAgICAgIHNlbnNpdGl2aXR5OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VudGltZW50U2Vuc2l0aXZpdHknKSxcclxuICAgICAgICAgICAgc2hvd1RvcFNjb3JlcnNUb2dnbGU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93VG9wU2NvcmVyc1RvZ2dsZScpLFxyXG4gICAgICAgICAgICBzaG93Qm90dG9tU2NvcmVyc1RvZ2dsZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3dCb3R0b21TY29yZXJzVG9nZ2xlJyksXHJcbiAgICAgICAgICAgIGxlYWRlcmJvYXJkVG9nZ2xlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGVhZGVyYm9hcmRUb2dnbGUnKSxcclxuICAgICAgICAgICAgc2hvd1RvcFNjb3JlcnM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93VG9wU2NvcmVycycpLFxyXG4gICAgICAgICAgICBzaG93Qm90dG9tU2NvcmVyczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3dCb3R0b21TY29yZXJzJyksXHJcbiAgICAgICAgICAgIGxlYWRlcmJvYXJkRHVyYXRpb246IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsZWFkZXJib2FyZER1cmF0aW9uJylcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRveGljaXR5OiB7XHJcbiAgICAgICAgICAgIGVuYWJsZVRveGljaXR5RGV0ZWN0aW9uOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG94aWNpdHlUb2dnbGUnKSxcclxuICAgICAgICAgICAgY3VzdG9tTWVzc2FnZVRveGljVXNlcjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RveGljaXR5TWVzc2FnZScpLFxyXG4gICAgICAgICAgICBtb2ROb3RpZmljYXRpb25Ub2dnbGU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2ROb3RpZmljYXRpb25Ub2dnbGUnKSxcclxuICAgICAgICAgICAgc2VsZk5vdGlmaWNhdGlvblRvZ2dsZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RveGljaXR5U2VsZk5vdGlmaWNhdGlvblRvZ2dsZScpLFxyXG4gICAgICAgICAgICBtb2RNZXNzYWdlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG94aWNpdHlNb2RNZXNzYWdlJyksXHJcbiAgICAgICAgICAgIHNlbGZNZXNzYWdlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG94aWNpdHlTZWxmTWVzc2FnZScpLFxyXG4gICAgICAgICAgICB0b3hpY2l0eVRocmVzaG9sZDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RveGljaXR5U2Vuc2l0aXZpdHknKSxcclxuICAgICAgICAgICAgc2hvd1RvcFNjb3JlcnNUb2dnbGU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93VG9wU2NvcmVyc1RvZ2dsZScpLFxyXG4gICAgICAgICAgICBzaG93Qm90dG9tU2NvcmVyc1RvZ2dsZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3dCb3R0b21TY29yZXJzVG9nZ2xlJyksXHJcbiAgICAgICAgICAgIGxlYWRlcmJvYXJkVG9nZ2xlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGVhZGVyYm9hcmRUb2dnbGUnKSxcclxuICAgICAgICAgICAgc2hvd1RvcFNjb3JlcnM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG93VG9wU2NvcmVycycpLFxyXG4gICAgICAgICAgICBzaG93Qm90dG9tU2NvcmVyczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nob3dCb3R0b21TY29yZXJzJyksXHJcbiAgICAgICAgICAgIGxlYWRlcmJvYXJkRHVyYXRpb246IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsZWFkZXJib2FyZER1cmF0aW9uJylcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRhcmtNb2RlOiB7XHJcbiAgICAgICAgICAgIGRhcmtNb2RlOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGFya01vZGVUb2dnbGUnKVxyXG4gICAgICAgIH0sXHJcbiAgICB9O1xyXG4gXHJcbiAgICBjb25zdCB0aGVtZVRvZ2dsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkYXJrTW9kZVRvZ2dsZScpO1xyXG4gICAgY29uc3QgdHdpdGNoTG9naW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHdpdGNoTG9naW5CdXR0b24nKTtcclxuICAgIGNvbnN0IHR3aXRjaExvZ291dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0d2l0Y2hMb2dvdXRCdXR0b24nKTtcclxuXHJcbiAgICBmdW5jdGlvbiBkaXNwbGF5RXJyb3IobWVzc2FnZSkge1xyXG4gICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXJyb3ItbWVzc2FnZScpO1xyXG4gICAgICAgIGVycm9yTWVzc2FnZUVsZW1lbnQudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xyXG4gICAgICAgIGVycm9yTWVzc2FnZUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBlcnJvck1lc3NhZ2VFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICwgNTAwMCk7XHJcbiAgICB9XHJcblxyXG4vLyBGdW5jdGlvbiB0byBsb2FkIHByZWZlcmVuY2VzXHJcbmZ1bmN0aW9uIGxvYWRQcmVmZXJlbmNlcygpIHtcclxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHt0eXBlOiAnbG9hZFByZWZlcmVuY2VzJ30sIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgcHJlZmVyZW5jZXM6JywgcmVzcG9uc2UuZXJyb3IpO1xyXG4gICAgICAgICAgICBkaXNwbGF5RXJyb3IoJ0Vycm9yIGxvYWRpbmcgcHJlZmVyZW5jZXM6ICcgKyByZXNwb25zZS5lcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGRlY3J5cHRlZFByZWZlcmVuY2VzID0gcmVzcG9uc2UucHJlZmVyZW5jZXM7XHJcbiAgICAgICAgaWYgKHByZWZlcmVuY2VzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQcmVmZXJlbmNlcyBsb2FkZWRcIik7XHJcbiAgICAgICAgICAgIC8vIFNldCB0aGUgcHJlZmVyZW5jZXMgb24gdGhlIG9wdGlvbnMgcGFnZVxyXG4gICAgICAgICAgICBpZiAoZGVjcnlwdGVkUHJlZmVyZW5jZXMuZGFya01vZGUpIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZGFyaycpO1xyXG4gICAgICAgICAgICAgICAgdGhlbWVUb2dnbGUuY2hlY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ2RhcmsnKTtcclxuICAgICAgICAgICAgICAgIHRoZW1lVG9nZ2xlLmNoZWNrZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgZmVhdHVyZSBpbiBkZWNyeXB0ZWRQcmVmZXJlbmNlcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlY3J5cHRlZFByZWZlcmVuY2VzW2ZlYXR1cmVdLmVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlc1tmZWF0dXJlXS50b2dnbGUuY2hlY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVzW2ZlYXR1cmVdLnRvZ2dsZS5jaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgb3B0aW9uIGluIGRlY3J5cHRlZFByZWZlcmVuY2VzW2ZlYXR1cmVdLm9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSBmZWF0dXJlc1tmZWF0dXJlXVtvcHRpb25dO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC50eXBlID09PSAnY2hlY2tib3gnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBkZWNyeXB0ZWRQcmVmZXJlbmNlc1tmZWF0dXJlXS5vcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC50eXBlID09PSAncmFuZ2UnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gZGVjcnlwdGVkUHJlZmVyZW5jZXNbZmVhdHVyZV0ub3B0aW9uc1tvcHRpb25dO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gZGVjcnlwdGVkUHJlZmVyZW5jZXNbZmVhdHVyZV0ub3B0aW9uc1tvcHRpb25dO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcblxyXG4vLyBMb2FkIHRoZSB1c2VyJ3MgcHJlZmVyZW5jZXMgd2hlbiB0aGUgb3B0aW9ucyBwYWdlIHN0YXJ0c1xyXG5sb2FkUHJlZmVyZW5jZXMoKTtcclxuXHJcbi8vIEZ1bmN0aW9uIHRvIHNhdmUgcHJlZmVyZW5jZXNcclxuICAgIGZ1bmN0aW9uIHNhdmVQcmVmZXJlbmNlcygpIHtcclxuICAgICAgICBsZXQgcHJlZmVyZW5jZXMgPSB7XHJcbiAgICAgICAgICAgIGRhcmtNb2RlOiB0aGVtZVRvZ2dsZS5jaGVja2VkXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgZmVhdHVyZSBpbiBmZWF0dXJlcykge1xyXG4gICAgICAgICAgICBwcmVmZXJlbmNlc1tmZWF0dXJlXSA9IHtcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZlYXR1cmVzW2ZlYXR1cmVdLnRvZ2dsZS5jaGVja2VkLFxyXG4gICAgICAgICAgICAgICAgb3B0aW9uczoge31cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG9wdGlvbiBpbiBmZWF0dXJlc1tmZWF0dXJlXSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbiAhPT0gJ3RvZ2dsZScpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSBmZWF0dXJlc1tmZWF0dXJlXVtvcHRpb25dO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC50eXBlID09PSAnY2hlY2tib3gnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZlcmVuY2VzW2ZlYXR1cmVdLm9wdGlvbnNbb3B0aW9uXSA9IGlucHV0LmNoZWNrZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZXNbZmVhdHVyZV0ub3B0aW9uc1tvcHRpb25dID0gaW5wdXQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFbmNyeXB0IHRoZSBwcmVmZXJlbmNlcyB1c2luZyB0aGUgZW5jcnlwdGlvbiBrZXlcclxuICAgICAgICBjb25zdCB1bmVuY3J5cHRlZFByZWZlcmVuY2VzID0gcHJlZmVyZW5jZXM7XHJcblxyXG4gICAgICAgIC8vIFNlbmQgdGhlIGVuY3J5cHRlZCBwcmVmZXJlbmNlcyB0byB0aGUgYmFja2dyb3VuZCBzY3JpcHQgdG8gc2F2ZVxyXG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHt0eXBlOiAnc2F2ZVByZWZlcmVuY2VzJywgcHJlZmVyZW5jZXM6IHVuZW5jcnlwdGVkUHJlZmVyZW5jZXN9LCBmdW5jdGlvbihyZXNwb25zZSkge1xyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNhdmluZyBwcmVmZXJlbmNlczonLCByZXNwb25zZS5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICBkaXNwbGF5RXJyb3IoJ0Vycm9yIHNhdmluZyBwcmVmZXJlbmNlczogJyArIHJlc3BvbnNlLmVycm9yKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQcmVmZXJlbmNlcyBzYXZlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgdGhlbWVUb2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywoKSA9PiB7XHJcbiAgICAgICAgaWYgKHRoZW1lVG9nZ2xlLmNoZWNrZWQpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdkYXJrJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdkYXJrJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNhdmVQcmVmZXJlbmNlcygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdHdpdGNoTG9naW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgLy8gSW5pdGlhdGUgT0F1dGggZmxvdyB3aXRoIFR3aXRjaCB2aWEgTmV0bGlmeSBmdW5jdGlvblxyXG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHt0eXBlOiAnaW5pdGlhdGVUd2l0Y2hPQXV0aCd9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIGZvciAobGV0IGZlYXR1cmUgaW4gZmVhdHVyZXMpIHtcclxuICAgICAgICBmZWF0dXJlc1tmZWF0dXJlXS50b2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgc2F2ZVByZWZlcmVuY2VzKTtcclxuICAgICAgICBmb3IgKGxldCBvcHRpb24gaW4gZmVhdHVyZXNbZmVhdHVyZV0pIHtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbiAhPT0gJ3RvZ2dsZScpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnB1dCA9IGZlYXR1cmVzW2ZlYXR1cmVdW29wdGlvbl07XHJcbiAgICAgICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBzYXZlUHJlZmVyZW5jZXMoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuLy9DaGVjayBpZiB0aGUgdXNlciBpcyBsb2dnZWQgaW4gdG8gVHdpdGNoXHJcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7dHlwZTogJ2NoZWNrVHdpdGNoTG9naW4nfSwgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoZWNraW5nIFR3aXRjaCBsb2dpbjonLCBkYXRhLmVycm9yKTtcclxuICAgICAgICAgICAgZGlzcGxheUVycm9yKCdFcnJvciBjaGVja2luZyBUd2l0Y2ggbG9naW46ICcgKyBkYXRhLmVycm9yKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGRhdGEubG9nZ2VkSW4pIHtcclxuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgbG9nZ2VkIGluIHRvIFR3aXRjaFxyXG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBsb2dpbiBidXR0b24gYW5kIHNob3cgdGhlIGxvZ291dCBidXR0b25cclxuICAgICAgICAgICAgdHdpdGNoTG9naW5CdXR0b24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgbGV0IHR3aXRjaExvZ291dEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xyXG4gICAgICAgICAgICB0d2l0Y2hMb2dvdXRCdXR0b24uaW5uZXJUZXh0ID0gJ0xvZ291dCBmcm9tIFR3aXRjaCc7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0d2l0Y2hBdXRoJykuYXBwZW5kQ2hpbGQodHdpdGNoTG9nb3V0QnV0dG9uKTtcclxuICAgICAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGxvZ291dCBidXR0b25cclxuICAgICAgICAgICAgdHdpdGNoTG9nb3V0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe3R5cGU6ICdyZW1vdmVUd2l0Y2hBY2Nlc3NUb2tlbid9LCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGUuZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVtb3ZpbmcgVHdpdGNoIGFjY2VzcyB0b2tlbjonLCBkYXRhLmVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheUVycm9yKCdFcnJvciByZW1vdmluZyBUd2l0Y2ggYWNjZXNzIHRva2VuOiAnKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0d2l0Y2hMb2dpbkJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHdpdGNoTG9nb3V0QnV0dG9uLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzIGZyb20gdGhlIGJhY2tncm91bmQgc2NyaXB0XHJcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKHJlcXVlc3QsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgIGlmIChyZXF1ZXN0LnR5cGUgPT09ICd3YXJuaW5nJykge1xyXG4gICAgICAgICAgICBkaXNwbGF5RXJyb3IocmVxdWVzdC5tZXNzYWdlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ2Vycm9yJykge1xyXG4gICAgICAgICAgICBkaXNwbGF5RXJyb3IocmVxdWVzdC5tZXNzYWdlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlcXVlc3QudHlwZSA9PT0gJ3ByZWZlcmVuY2VzJykge1xyXG4gICAgICAgICAgICBjb25zdCBwcmVmZXJlbmNlcyA9IHJlcXVlc3QucHJlZmVyZW5jZXM7XHJcbiAgICAgICAgICAgIGlmIChwcmVmZXJlbmNlcykge1xyXG4gICAgICAgICAgICAgICAgLy8gRGVjcnlwdCB0aGUgcHJlZmVyZW5jZXMgdXNpbmcgdGhlIGVuY3J5cHRpb24ga2V5XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZWNyeXB0ZWRQcmVmZXJlbmNlcyA9IHByZWZlcmVuY2VzO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChkZWNyeXB0ZWRQcmVmZXJlbmNlcy5kYXJrTW9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZGFyaycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoZW1lVG9nZ2xlLmNoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ2RhcmsnKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGVtZVRvZ2dsZS5jaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZmVhdHVyZSBpbiBkZWNyeXB0ZWRQcmVmZXJlbmNlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWNyeXB0ZWRQcmVmZXJlbmNlc1tmZWF0dXJlXS5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZlYXR1cmVzW2ZlYXR1cmVdLnRvZ2dsZS5jaGVja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmZWF0dXJlc1tmZWF0dXJlXS50b2dnbGUuY2hlY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgb3B0aW9uIGluIGRlY3J5cHRlZFByZWZlcmVuY2VzW2ZlYXR1cmVdLm9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0ID0gZmVhdHVyZXNbZmVhdHVyZV1bb3B0aW9uXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdjaGVja2JveCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSBkZWNyeXB0ZWRQcmVmZXJlbmNlc1tmZWF0dXJlXS5vcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQudHlwZSA9PT0gJ3JhbmdlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBkZWNyeXB0ZWRQcmVmZXJlbmNlc1tmZWF0dXJlXS5vcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IGRlY3J5cHRlZFByZWZlcmVuY2VzW2ZlYXR1cmVdLm9wdGlvbnNbb3B0aW9uXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtZXNzYWdlIHR5cGU6ICR7cmVxdWVzdC50eXBlfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEluZGljYXRlIHRoYXQgdGhlIHJlc3BvbnNlIHdpbGwgYmUgc2VudCBhc3luY2hyb25vdXNseVxyXG5cclxuICAgIH0pO1xyXG59KTtcclxuXHJcbiJdLCJuYW1lcyI6WyJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsImZlYXR1cmVzIiwic2VudGltZW50IiwiZW5hYmxlU2VudGltZW50QW5hbHlzaXMiLCJnZXRFbGVtZW50QnlJZCIsInNlbnNpdGl2aXR5Iiwic2hvd1RvcFNjb3JlcnNUb2dnbGUiLCJzaG93Qm90dG9tU2NvcmVyc1RvZ2dsZSIsImxlYWRlcmJvYXJkVG9nZ2xlIiwic2hvd1RvcFNjb3JlcnMiLCJzaG93Qm90dG9tU2NvcmVycyIsImxlYWRlcmJvYXJkRHVyYXRpb24iLCJ0b3hpY2l0eSIsImVuYWJsZVRveGljaXR5RGV0ZWN0aW9uIiwiY3VzdG9tTWVzc2FnZVRveGljVXNlciIsIm1vZE5vdGlmaWNhdGlvblRvZ2dsZSIsInNlbGZOb3RpZmljYXRpb25Ub2dnbGUiLCJtb2RNZXNzYWdlIiwic2VsZk1lc3NhZ2UiLCJ0b3hpY2l0eVRocmVzaG9sZCIsImRhcmtNb2RlIiwidGhlbWVUb2dnbGUiLCJ0d2l0Y2hMb2dpbkJ1dHRvbiIsInR3aXRjaExvZ291dEJ1dHRvbiIsImRpc3BsYXlFcnJvciIsIm1lc3NhZ2UiLCJlcnJvck1lc3NhZ2VFbGVtZW50IiwidGV4dENvbnRlbnQiLCJzdHlsZSIsImRpc3BsYXkiLCJzZXRUaW1lb3V0IiwibG9hZFByZWZlcmVuY2VzIiwiY2hyb21lIiwicnVudGltZSIsInNlbmRNZXNzYWdlIiwidHlwZSIsInJlc3BvbnNlIiwiZXJyb3IiLCJjb25zb2xlIiwiZGVjcnlwdGVkUHJlZmVyZW5jZXMiLCJwcmVmZXJlbmNlcyIsImxvZyIsImJvZHkiLCJjbGFzc0xpc3QiLCJhZGQiLCJjaGVja2VkIiwicmVtb3ZlIiwiZmVhdHVyZSIsImVuYWJsZWQiLCJ0b2dnbGUiLCJvcHRpb24iLCJvcHRpb25zIiwiaW5wdXQiLCJ2YWx1ZSIsInNhdmVQcmVmZXJlbmNlcyIsInVuZW5jcnlwdGVkUHJlZmVyZW5jZXMiLCJkYXRhIiwibG9nZ2VkSW4iLCJjcmVhdGVFbGVtZW50IiwiaW5uZXJUZXh0IiwiYXBwZW5kQ2hpbGQiLCJkYXRlIiwib25NZXNzYWdlIiwiYWRkTGlzdGVuZXIiLCJyZXF1ZXN0Iiwic2VuZGVyIiwic2VuZFJlc3BvbnNlIiwiRXJyb3IiLCJjb25jYXQiXSwic291cmNlUm9vdCI6IiJ9