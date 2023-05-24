// Import required modules
const tmi = require('tmi.js');
const axios = require('axios');

// Variables for Twitch, Perspective, and Netlify API
let twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
let netlifyFunctionUrl = 'YOUR_NETLIFY_FUNCTION_URL'; // Add your Netlify function URL here



chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({url: 'options.html'});
});


async function initiateTwitchOAuth() {
  try {
    const response = await axios.get(netlifyFunctionUrl);
    if (response.status !== 200) {
      throw new Error(`Error initiating Twitch OAuth: HTTP ${response.status}`);
    }
    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error('Error initiating Twitch OAuth: No access token returned');
    }
    // Encrypt the access token using the encryption key
    chrome.storage.sync.get(['encryptionKey'], function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading encryption key:', chrome.runtime.lastError);
        displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
        return;
      }
      const encryptionKey = data.encryptionKey;
      if (!encryptionKey) {
        console.error('Error: Encryption key not found');
        displayError('Error: Encryption key not found');
        return;
      }
      const encryptedAccessToken = encrypt(accessToken, encryptionKey);
      // Store the encrypted access token securely in Chrome's sync storage
      chrome.storage.sync.set({twitchAccessToken: encryptedAccessToken}, function() {
        if (chrome.runtime.lastError) {
          console.error('Error storing Twitch access token:', chrome.runtime.lastError);
          displayError('Error storing Twitch access token: ' + chrome.runtime.lastError.message);
        }
      });
    });
  } catch (error) {
    console.error('Error initiating Twitch OAuth:', error);
    displayError('Error initiating Twitch OAuth: ' + error.message);
  }
}

function savePreferences() {
  chrome.storage.sync.get(['encryptionKey'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading encryption key:', chrome.runtime.lastError);
      displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
      return;
    }
    
    const encryptionKey = data.encryptionKey;
    if (!encryptionKey) {
      console.error('Error: Encryption key not found');
      displayError('Error: Encryption key not found');
      return;
    }
    let preferences = {
      darkMode: themeToggle.checked,
      sentiment: {
        enabled: features.sentiment.toggle.checked,
        options: {
          sensitivity: features.sentiment.sensitivity.value,
          showTopScorers: features.sentiment.showTopScorers.checked,
          showBottomScorers: features.sentiment.showBottomScorers.checked,
          leaderboardDuration: features.sentiment.leaderboardDuration.value
        }
      },
      toxicity: {
        enabled: features.toxicity.toggle.checked,
        options: {
          message: features.toxicitymessage.value,
          modNotification: features.toxicity.modNotification.checked,
          selfNotification: features.toxicity.selfNotification.checked,
          modMessage: features.toxicity.modMessage.value,
          selfMessage: features.toxicity.selfMessage.value
        }
      }
    };
    // Encrypt the preferences using the encryption key
    const encryptedPreferences = encrypt(preferences, encryptionKey);
    // Store the encrypted preferences securely in Chrome's sync storage
    chrome.storage.sync.set({preferences: encryptedPreferences}, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving preferences:', chrome.runtime.lastError);
        displayError('Error saving preferences: ' + chrome.runtime.lastError.message);
      }
    });
  });
}

// Function to get the current Twitch channel
async function getCurrentChannel(token, clientId) {
    try {
        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': clientId
            }
        });
        if (response.status !== 200) {
            throw new Error(`Error getting current Twitch channel: HTTP ${response.status}`);
        }
        const data = await response.json();
        return data.data[0].login;
    } catch (error) {
        console.error('Error getting current Twitch channel:', error);
        sendWarningToExtUser('Error getting current Twitch channel: ' + error.message);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
if ((request.type === 'analyzeSentiment') || (request.type === 'analyzeToxicity')) {
    const comment = request.comment;
    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${OAUTH_CLIENT_ID}`;
    const data = {
        comment: { text: comment },
        languages: ['en'],
        requestedAttributes: { TOXICITY: {} }
    };

    fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        const score = data.attributeScores.TOXICITY.summaryScore.value;
        sendResponse({ score });
    })
    .catch(error => {
        console.error('Error:', error);
        sendResponse({ error: 'Error analyzing comment' });
    });

    return true;  // Will respond asynchronously.
} else if (request.message === 'initiateTwitchOAuth') {
  initiateTwitchOAuth();
  chrome.cookies.set({
    url: 'https://www.twitch.tv',
    name: 'accessToken',
    value: decryptedAccessToken,
    secure: true,
    httpOnly: true
} else if (request.message === 'fetchChatMessages') {
  fetchChatMessages(request.channel)
  .then(chatMessages => sendResponse(chatMessages))
  .catch(error => console.error('Error fetching chat messages:', error));
} else if (request.message === 'monitorTwitchChat') {
  monitorTwitchChat();
} else if (request.message === 'savePreferences') {
  // Save the user's preferences
  savePreferences();
} else if (request.message === 'getPreferences') {
  // Get the user's preferences
  chrome.storage.sync.get(['preferences'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading preferences:', chrome.runtime.lastError);
      displayError('Error loading preferences: ' + chrome.runtime.lastError.message);
      return;
    }
    const preferences = data.preferences;
    if (!preferences) {
      console.error('Error: Preferences not found');
      displayError('Error: Preferences not found');
      return;
    }
    // Decrypt the preferences using the encryption key
    chrome.storage.sync.get(['encryptionKey'], function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading encryption key:', chrome.runtime.lastError);
        displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
        return;
      }
      const encryptionKey = data.encryptionKey;
      if (!encryptionKey) {
        console.error('Error: Encryption key not found');
        displayError('Error: Encryption key not found');
        return;
      }
      const decryptedPreferences = decrypt(preferences, encryptionKey);
      sendResponse(decryptedPreferences);
    }, function(error) {
      console.error('Error loading preferences:', error);
      displayError('Error loading preferences: ' + error.message);
    });
  });
} else if (request.message === 'getEncryptionKey') {
  // Get the encryption key
  chrome.storage.sync.get(['encryptionKey'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading encryption key:', chrome.runtime.lastError);
      displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
      return;
    }
    const encryptionKey = data.encryptionKey;
    if (!encryptionKey) {
      console.error('Error: Encryption key not found');
      displayError('Error: Encryption key not found');
      return;
    }
    sendResponse(encryptionKey);
  });
} else if (request.message === 'setEncryptionKey') {
  // Set the encryption key
  chrome.storage.sync.set({encryptionKey: request.encryptionKey}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error setting encryption key:', chrome.runtime.lastError);
      displayError('Error setting encryption key: ' + chrome.runtime.lastError.message);
    }
  }, function(error) {
    console.error('Error setting encryption key:', error);
    displayError('Error setting encryption key: ' + error.message);
  });

} else if (request.message === 'getTwitchAccessToken') {
  // Get the Twitch access token
  chrome.storage.sync.get(['twitchAccessToken'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading Twitch access token:', chrome.runtime.lastError);
      displayError('Error loading Twitch access token: ' + chrome.runtime.lastError.message);
      return;
    }
    const twitchAccessToken = data.twitchAccessToken;
    if (!twitchAccessToken) {
      console.error('Error: Twitch access token not found');
      displayError('Error: Twitch access token not found');
      return;
    }
    sendResponse(twitchAccessToken);
  });
} else if (request.message === 'setTwitchAccessToken') {
  // Set the Twitch access token
  chrome.storage.sync.set({twitchAccessToken: request.twitchAccessToken}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error setting Twitch access token:', chrome.runtime.lastError);
      displayError('Error setting Twitch access token: ' + chrome.runtime.lastError.message);
    }
  });
} else if (request.message === 'getTwitchClientId') {
  // Get the Twitch client ID
  sendResponse(twitchClientId);
} else if (request.message === 'setTwitchClientId') {
  // Set the Twitch client ID
  twitchClientId = request.twitchClientId;
} else if (request.message === 'getNetlifyFunctionUrl') {
  // Get the Netlify function URL
  sendResponse(netlifyFunctionUrl);
} else if (request.message === 'setNetlifyFunctionUrl') {
  // Set the Netlify function URL
  netlifyFunctionUrl = request.netlifyFunctionUrl;
} else if (request.message === 'getSentimentSensitivity') {
  // Get the sentiment sensitivity
  sendResponse(sentimentSensitivity);
} else if (request.message === 'setSentimentSensitivity') {
  // Set the sentiment sensitivity
  sentimentSensitivity = request.sentimentSensitivity;
} else if (request.message === 'getSentimentThreshold') {
  // Get the sentiment threshold
  sendResponse(sentimentThreshold);
} else if (request.message === 'setSentimentThreshold') {
  // Set the sentiment threshold
  sentimentThreshold = request.sentimentThreshold;
} else if (request.message === 'getToxicityThreshold') {
  // Get the toxicity threshold
  sendResponse(toxicityThreshold);
} else if (request.message === 'setToxicityThreshold') {
  // Set the toxicity threshold
  toxicityThreshold = request.toxicityThreshold;
} else if (request.message === 'getWarningMessageToxic') {
  // Get the warning message for toxic users
  sendResponse(warningMessageToxic);
} else if (request.message === 'setWarningMessageToxic') {
  // Set the warning message for toxic users
  warningMessageToxic = request.warningMessageToxic;
} else if (request.message === 'getWarningMessageNegative') {
  // Get the warning message for negative users
  sendResponse(warningMessageNegative);
} else if (request.message === 'setWarningMessageNegative') {
  // Set the warning message for negative users
  warningMessageNegative = request.warningMessageNegative;
} else if (request.message === 'getCustomMessageToxic') {
  // Get the custom message for toxic users
  sendResponse(customMessageToxic);
} else if (request.message === 'setCustomMessageToxic') {
  // Set the custom message for toxic users
  customMessageToxic = request.customMessageToxic;
} else if (request.message === 'getCustomMessageNegative') {
  // Get the custom message for negative users
  sendResponse(customMessageNegative);
} else if (request.message === 'setCustomMessageNegative') {
  // Set the custom message for negative users
  customMessageNegative = request.customMessageNegative;
} else if (request.message === 'getWarningToxicUser') {
  // Get the warning for toxic users
  sendResponse(warningToxicUser);
} else if (request.message === 'setWarningToxicUser') {
  // Set the warning for toxic users
  warningToxicUser = request.warningToxicUser;
} else if (request.message === 'getWarningNegativeUser') {
  // Get the warning for negative users
  sendResponse(warningNegativeUser);
} else if (request.message === 'setWarningNegativeUser') {
  // Set the warning for negative users
  warningNegativeUser = request.warningNegativeUser;
} else if (request.message === 'getCustomMessageToxicUser') {
  // Get the custom message for toxic users
  sendResponse(customMessageToxicUser);
} else if (request.message === 'setCustomMessageToxicUser') {
  // Set the custom message for toxic users
  customMessageToxicUser = request.customMessageToxicUser;
} else if (request.message === 'getCustomMessageNegativeUser') {
  // Get the custom message for negative users
  sendResponse(customMessageNegativeUser);
} else if (request.message === 'setCustomMessageNegativeUser') {
  // Set the custom message for negative users
  customMessageNegativeUser = request.customMessageNegativeUser;
} else if (request.message === 'getEnableSentimentAnalysis') {
  // Get whether sentiment analysis is enabled
  sendResponse(enableSentimentAnalysis);
} else if (request.message === 'setEnableSentimentAnalysis') {
  // Set whether sentiment analysis is enabled
  enableSentimentAnalysis = request.enableSentimentAnalysis;
} else if (request.message === 'getEnableToxicityDetection') {
  // Get whether toxicity detection is enabled
  sendResponse(enableToxicityDetection);
} else if (request.message === 'setEnableToxicityDetection') {
  // Set whether toxicity detection is enabled
  enableToxicityDetection = request.enableToxicityDetection;
} else if (request.message === 'getEnableDarkMode') {
  // Get whether dark mode is enabled
  sendResponse(enableDarkMode);
} else if (request.message === 'setEnableDarkMode') {
  // Set whether dark mode is enabled
  enableDarkMode = request.enableDarkMode;
} else if (request.message === 'warningMessage') {
  // Send a warning message to the extension user
  sendWarningToExtUser(request.warningMessage);
} else if (request.message === 'errorMessage') {
  // Display an error message to the extension user
  displayError(request.errorMessage);
} else if (request.message === 'getSentimentLeaderboard') {
  // Get the sentiment leaderboard
  sendResponse(sentimentLeaderboard);
} else if (request.message === 'setSentimentLeaderboard') {
  // Set the sentiment leaderboard
  sentimentLeaderboard = request.sentimentLeaderboard;
} else if (request.message === 'getToxicityLeaderboard') {
  // Get the toxicity leaderboard
  sendResponse(toxicityLeaderboard);
} else if (request.message === 'setToxicityLeaderboard') {
  // Set the toxicity leaderboard
  toxicityLeaderboard = request.toxicityLeaderboard;
} else if (request.message === 'getSentimentLeaderboardDuration') {
  // Get the sentiment leaderboard duration
  sendResponse(sentimentLeaderboardDuration);
} else if (request.message === 'setSentimentLeaderboardDuration') {
  // Set the sentiment leaderboard duration
  sentimentLeaderboardDuration = request.sentimentLeaderboardDuration;
} else if (request.message === 'getToxicityLeaderboardDuration') {
  // Get the toxicity leaderboard duration
  sendResponse(toxicityLeaderboardDuration);
} else if (request.message === 'setToxicityLeaderboardDuration') {
  // Set the toxicity leaderboard duration
  toxicityLeaderboardDuration = request.toxicityLeaderboardDuration;
} else if (request.message === 'generateEncryptionKey') {
  // Generate an encryption key
  const encryptionKey = generateEncryptionKey();
  sendResponse(encryptionKey);
} else if (request.message === 'checkEncryptionKeyExists') {
  // Check whether an encryption key exists
  chrome.storage.sync.get(['encryptionKey'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading encryption key:', chrome.runtime.lastError);
      displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
      return;
    }
    const encryptionKey = data.encryptionKey;
    if (!encryptionKey) {
      sendResponse(false);
    } else {
      sendResponse(true);
    }
  });
} else if (request.message === 'decrypt') {
  // Decrypt a message
  const decryptedMessage = decrypt(request.encryptedMessage, request.encryptionKey);
  sendResponse(decryptedMessage);
} else if (request.message === 'encrypt') {
  // Encrypt a message
  const encryptedMessage = encrypt(request.message, request.encryptionKey);
  sendResponse(encryptedMessage);
} else if (request.message === 'decryptPreferences') {
  // Decrypt the user's preferences
  chrome.storage.sync.get(['preferences', 'encryptionKey'], async (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading preferences:', chrome.runtime.lastError);
      displayError('Error loading preferences: ' + chrome.runtime.lastError.message);
      return;
    }
    const encryptedPreferences = data.preferences;
    const encryptionKey = data.encryptionKey;
    if (!encryptedPreferences || !encryptionKey) {
      
      console.error('Error: Encrypted preferences or encryption key not found');
      displayError('Error: Encrypted preferences or encryption key not found');
      return;
    }
    const decryptedPreferences = await decrypt(encryptedPreferences, encryptionKey);
    sendResponse(decryptedPreferences);
  });
} else if (request.message === 'encryptPreferences') {
  // Encrypt the user's preferences
  chrome.storage.sync.get(['preferences', 'encryptionKey'], async (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading preferences:', chrome.runtime.lastError);
      displayError('Error loading preferences: ' + chrome.runtime.lastError.message);
      return;
    }
    const preferences = data.preferences;
    const encryptionKey = data.encryptionKey;
    if (!preferences || !encryptionKey) {
      console.error('Error: Preferences or encryption key not found');
      displayError('Error: Preferences or encryption key not found');
      return;
    }
    const encryptedPreferences = await encrypt(preferences, encryptionKey);
    sendResponse(encryptedPreferences);
  });
} else if (request.message === 'decryptTwitchAccessToken') {
  // Decrypt the Twitch access token
  chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], async (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading Twitch access token:', chrome.runtime.lastError);
      displayError('Error loading Twitch access token: ' + chrome.runtime.lastError.message);
      return;
    }
    const encryptedAccessToken = data.twitchAccessToken;
    const encryptionKey = data.encryptionKey;
    if (!encryptedAccessToken || !encryptionKey) {
      console.error('Error: Encrypted access token or encryption key not found');
      displayError('Error: Encrypted access token or encryption key not found');
      return;
    }
    const decryptedAccessToken = await decrypt(encryptedAccessToken, encryptionKey);
    sendResponse(decryptedAccessToken);
  });
} else if (request.message === 'encryptTwitchAccessToken') {
  // Encrypt the Twitch access token
  chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], async (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading Twitch access token:', chrome.runtime.lastError);
      displayError('Error loading Twitch access token: ' + chrome.runtime.lastError.message);
      return;
    }
    const accessToken = data.twitchAccessToken;
    const encryptionKey = data.encryptionKey;
    if (!accessToken || !encryptionKey) {
      console.error('Error: Access token or encryption key not found');
      displayError('Error: Access token or encryption key not found');
      return;
    }
    const encryptedAccessToken = await encrypt(accessToken, encryptionKey);
    sendResponse(encryptedAccessToken);
  });
} else if (request.message === 'loadEncryptionKey') {
  // Load the encryption key
  chrome.storage.sync.get(['encryptionKey'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading encryption key:', chrome.runtime.lastError);
      displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
      return;
    }
    const encryptionKey = data.encryptionKey;
    if (!encryptionKey) {
      console.error('Error: Encryption key not found');
      displayError('Error: Encryption key not found');
      return;
    }
    sendResponse(encryptionKey);
  });
} else if (request.message === 'saveEncryptionKey') {
  // Save the encryption key
  chrome.storage.sync.set({encryptionKey: request.encryptionKey}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving encryption key:', chrome.runtime.lastError);
      displayError('Error saving encryption key: ' + chrome.runtime.lastError.message);
    }
  });
} else if (request.message === 'loadTwitchAccessToken') {
  // Load the Twitch access token
  chrome.storage.sync.get(['twitchAccessToken'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading Twitch access token:', chrome.runtime.lastError);
      displayError('Error loading Twitch access token: ' + chrome.runtime.lastError.message);
      return;
    }
    const twitchAccessToken = data.twitchAccessToken;
    if (!twitchAccessToken) {
      console.error('Error: Twitch access token not found');
      displayError('Error: Twitch access token not found');
      return;
    }
    sendResponse(twitchAccessToken);
  });
} else if (request.message === 'saveTwitchAccessToken') {
  // Save the Twitch access token
  chrome.storage.sync.set({twitchAccessToken: request.twitchAccessToken}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving Twitch access token:', chrome.runtime.lastError);
      displayError('Error saving Twitch access token: ' + chrome.runtime.lastError.message);
    }
  });
} else if (request.message === 'loadPreferences') {
  // Load the user's preferences
  loadPreferences();
} else if (request.message === 'savePreferences') {
  // Save the user's preferences
  savePreferences();
} else if (request.message === 'loadTwitchClientId') {
  // Load the Twitch client ID
  sendResponse(twitchClientId);
} else if (request.message === 'saveTwitchClientId') {
  // Save the Twitch client ID
  twitchClientId = request.twitchClientId;
} else if (request.message === 'loadNetlifyFunctionUrl') {
  // Load the Netlify function URL
  sendResponse(netlifyFunctionUrl);
} else if (request.message === 'saveNetlifyFunctionUrl') {
  // Save the Netlify function URL
  netlifyFunctionUrl = request.netlifyFunctionUrl;
} else if (request.message === 'loadSentimentSensitivity') {
  
return true;
}

function generateEncryptionKey() {
  // Generate encryption key
  let key;
  window.crypto.subtle.generateKey(
      {
          name: "AES-GCM",
          length: 256,
      },
      true,
      ["encrypt", "decrypt"]
  )
  .then(newKey => {
      key = newKey;
      // Convert key to a storable format
      return window.crypto.subtle.exportKey('jwk', key);
  })
  .then(exportedKey => {
      // Store key in chrome.storage.sync for future use
      chrome.storage.sync.set({ encryptionKey: exportedKey }, function() {
          if (chrome.runtime.lastError) {
              console.error('Error saving encryption key:', chrome.runtimelastError);
              displayError('Error saving encryption key: ' + chrome.runtime.lastError.message);
          }
      }); 
  })
  .catch(err => {
      console.error(err);
      displayError('Error generating encryption key: ' + err.message);
  });
  return encryptionKey;
});
function fetchChatMessages(channel) {
  return new Promise((resolve, reject) => {
    const url = `https://tmi.twitch.tv/api/rooms/${channel}/recent_messages`;
    fetch(url)
    .then(response => response.json())
    .then(data => {
      const messages = data.messages.map(message => message.message.body);
      resolve(messages);
    })
    .catch(error => reject(error));
  });
}
function analyzeSentiment(message) {
  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${OAUTH_CLIENT_ID}`;
  const data = {
    comment: { text: message },
    languages: ['en'],
    requestedAttributes: { TOXICITY: {} }
  };
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
      const score = data.attributeScores.TOXICITY.summaryScore.value;
      resolve(score);
    })
    .catch(error => reject(error));
  });
}

// Function to analyze a chat message for toxicity
async function analyzeToxicity(message) {
  try {
    const result = await client.analyze({ comment: { text: message } });
    return result.attributeScores.TOXICITY.summaryScore.value;
  } catch (error) {
    console.error('Error analyzing toxicity:', error);
    sendWarningToExtUser('Error analyzing toxicity: ' + error.message);
    return null;
  }
}

// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
  try {
    if (request.action === 'fetchChatMessages') {
      const messages = await fetchChatMessages(request.channel);
      sendResponse({ messages });
    } else if (request.action === 'analyzeSentiment') {
      const score = analyzeSentiment(request.message);
      sendResponse({ score });
    } else if (request.action === 'analyzeToxicity') {
      const score = await analyzeToxicity(request.message);
      sendResponse({ score });
    } else {
      throw new Error(`Unknown action: ${request.action}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendWarningToExtUser('Error handling message: ' + error.message);
  }
  return true; // Indicate that the response will be sent asynchronously
}

// Function to load preferences
function loadPreferences() {
  chrome.storage.sync.get(['preferences', 'encryptionKey'], async (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading preferences:', chrome.runtime.lastError);
      sendWarningToExtUser('Error loading preferences: ' + chrome.runtime.lastError.message);
      return;
    }

    const encryptedPreferences = data.preferences;
    const encryptionKey = data.encryptionKey;
    
    if (!encryptedPreferences || !encryptionKey) {
      console.error('Error: Encrypted preferences or encryption key not found');
      sendWarningToExtUser('Error: Encrypted preferences or encryption key not found');
      return;
    }

    // Decrypt the preferences using the encryption key
    const preferences = await decrypt(encryptedPreferences, encryptionKey);

    if (preferences) {
      enableSentimentAnalysis = preferences.sentiment.enabled;
      enableToxicityDetection = preferences.toxicity.enabled;
      sentimentSensitivity = preferences.sentiment.options.sensitivity;
      toxicityThreshold = preferences.toxicity.options.threshold;
      warningMessageToxic = preferences.toxicity.options.warningMessageToxic;
      warningMessageNegative = preferences.toxicity.options.warningMessageNegative;
      customMessageToxic = preferences.toxicity.options.customMessageToxic;
      customMessageNegative = preferences.toxicity.options.customMessageNegative;
      warningToxicUser = preferences.toxicity.options.warningToxicUser;
      warningNegativeUser = preferences.toxicity.options.warningNegativeUser;
      customMessageToxicUser = preferences.toxicity.options.customMessageToxicUser;
      customMessageNegativeUser = preferences.toxicity.options.customMessageNegativeUser;
      enableDarkMode = preferences.darkMode;
      sentimentLeaderboard = preferences.sentiment.options.showLeaderboard;
      toxicityLeaderboard = preferences.toxicity.options.showLeaderboard;
      sentimentLeaderboardDuration = preferences.sentiment.options.leaderboardDuration;
      toxicityLeaderboardDuration = preferences.toxicity.options.leaderboardDuration;
    }
  });
}

// Function to save preferences
function savePreferences() {
  chrome.storage.sync.get(['encryptionKey'], function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading encryption key:', chrome.runtime.lastError);
      displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
      return;
    }

    const encryptionKey = data.encryptionKey;
    if (!encryptionKey) {
      console.error('Error: Encryption key not found');
      displayError('Error: Encryption key not found');
      return;
    }

    let preferences = {
      darkMode: themeToggle.checked,
      sentiment: {
        enabled: features.sentiment.toggle.checked,
        options: {
          sensitivity: features.sentiment.sensitivity.value,
          showLeaderboard: features.sentiment.showLeaderboard.checked,
          leaderboardDuration: features.sentiment.leaderboardDuration.value
        }
      },
      toxicity: {
        enabled: features.toxicity.toggle.checked,
        options: {
          threshold: features.toxicity.threshold.value,
          warningMessageToxic: features.toxicity.warningMessageToxic.value,
          warningMessageNegative: features.toxicity.warningMessageNegative.value,
          customMessageToxic: features.toxicity.customMessageToxic.value,
          customMessageNegative: features.toxicity.customMessageNegative.value,
          warningToxicUser: features.toxicity.warningToxicUser.checked,
          warningNegativeUser: features.toxicity.warningNegativeUser.checked,
          customMessageToxicUser: features.toxicity.customMessageToxicUser.checked,
          customMessageNegativeUser: features.toxicity.customMessageNegativeUser.checked,
          showLeaderboard: features.toxicity.showLeaderboard.checked,
          leaderboardDuration: features.toxicity.leaderboardDuration.value
        }
      }
    };

    // Encrypt the preferences using the encryption key
    const encryptedPreferences = encrypt(preferences, encryptionKey);
    
    // Store the encrypted preferences securely in Chrome's sync storage
    chrome.storage.sync.set({preferences: encryptedPreferences}, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving preferences:', chrome.runtime.lastError);
        displayError('Error saving preferences: ' + chrome.runtime.lastError.message);
      }
    });
  });
}

// Function to get the current Twitch channel
async function getCurrentChannel(token, clientId) {
  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': clientId
      }
    });
    if (response.status !== 200) {
      throw new Error(`Error getting current Twitch channel: HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.data[0].login;
  } catch (error) {
    console.error('Error getting current Twitch channel:', error);
    sendWarningToExtUser('Error getting current Twitch channel: ' + error.message);
  }
}

// Function to monitor Twitch chat
async function monitorTwitchChat() {
  try {
    // Get the encrypted Twitch access token and encryption key from Chrome's sync storage
    chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], async function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading Twitch access token or encryption key:', chrome.runtime.lastError);
        displayError('Error loading Twitch access token or encryption key: ' + chrome.runtime.lastError.message);
        return;
      }
      const encryptedAccessToken = data.twitchAccessToken;
      const encryptionKey = data.encryptionKey;
      if (!encryptedAccessToken || !encryptionKey) {
        console.error('Error: Twitch access token or encryption key not found');
        displayError('Error: Twitch access token or encryption key not found');
        return;
      }
      // Decrypt the Twitch access token using the encryption key
      const twitchAccessToken = await decrypt(encryptedAccessToken, encryptionKey);
      // Get the current Twitch channel
      const channel = await getCurrentChannel(twitchAccessToken, twitchClientId);
      // Configure the Twitch chat client
      const options = {
        options: { debug: true },
        connection: { reconnect: true },

        identity: { username: channel, password: `oauth:${twitchAccessToken}` },
        channels: [channel]
      };
      const client = new tmi.client(options);
      // Connect to the Twitch chat
      client.connect();
      // Listen for chat messages
      client.on('message', handleChatMessage);
    });
  } catch (error) {
    console.error('Error monitoring Twitch chat:', error);
    sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
  }
}

// Function to handle Twitch chat messages
const handleChatMessage = async (channel, userstate, message, self) => {
  // Ignore messages from the bot itself
  if (self) return;

  // Variables to store the sentiment and toxicity scores
  let sentimentScore = null;
  let toxicityScore = null;

  try {
      if (enableSentimentAnalysis) {
          sentimentScore = analyzeSentiment(message);
      }
      if (enableToxicityDetection) {
          toxicityScore = await analyzeToxicity(message);
      }
  } catch (error) {
      console.error('Error analyzing message:', error);
  }

  // Handle the message based on the sentiment and toxicity scores
  if (sentimentScore !== null && toxicityScore !== null) {
      handleBothScores(sentimentScore, toxicityScore, userstate.username);
  } else if (sentimentScore !== null) {
      handleSentimentScore(sentimentScore, userstate.username);
  } else if (toxicityScore !== null) {
      handleToxicityScore(toxicityScore, userstate.username);
  }
  // If neither sentiment analysis nor toxicity detection are enabled, just display the message
  // as is
}

const handleBothScores = (sentimentScore, toxicityScore, username) => {
  if (sentimentScore < sentimentOptions.threshold && toxicityScore > toxicityOptions.threshold) {
      takeAction(username);
  }
}

const handleSentimentScore = (sentimentScore, username) => {
  if (sentimentScore < sentimentOptions.threshold) {
      takeAction(username);
  }
}

const handleToxicityScore = (toxicityScore, username) => {
  if (toxicityScore > toxicityOptions.threshold) {
      takeAction(username);
  }
}

const takeAction = (username) => {
  if (warningToxicUser) {
      sendWarning(username, warningMessageToxic);
  }

  if (customMessageToxicUser) {
      sendCustomMessage(username, customMessageToxic);
  }
  if (customMessageNegativeUser) {
      sendCustomMessage(username, customMessageNegative);
  }
}



// Function to send a warning to the extension user

function sendWarningToExtUser(warningMessage) {

  // Display the warning message to the extension user
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'StreamMatey Warning',
    message: warningMessage
  });


}

async function monitorTwitchChat() {
  try {
    // Get the encrypted Twitch access token and encryption key from Chrome's sync storage
    chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], async function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading Twitch access token or encryption key:', chrome.runtime.lastError);
        displayError('Error loading Twitch access token or encryption key: ' + chrome.runtime.lastError.message);
        return;
      }
      const encryptedAccessToken = data.twitchAccessToken;
      const encryptionKey = data.encryptionKey;
      if (!encryptedAccessToken || !encryptionKey) {
        console.error('Error: Twitch access token or encryption key not found');
        displayError('Error: Twitch access token or encryption key not found');
        return;
      }
      // Decrypt the Twitch access token using the encryption key
      const twitchAccessToken = await decrypt(encryptedAccessToken, encryptionKey);
      // Get the current Twitch channel
      const channel = await getCurrentChannel(twitchAccessToken, twitchClientId);
      // Configure the Twitch chat client
      const options = {
        options: { debug: true },
        connection: { reconnect: true },
        identity: { username: channel, password: `oauth:${twitchAccessToken}` },
        channels: [channel]
      };
      const client = new tmi.client(options);
      // Connect to the Twitch chat
      client.connect();
      // Listen for chat messages
      client.on('message', handleChatMessage);
    });
  } catch (error) {
    console.error('Error monitoring Twitch chat:', error);
    displayError('Error monitoring Twitch chat: ' + error.message);
  }

}

// Start monitoring Twitch chat when the extension is installed or updated
chrome.runtime.onInstalled.addListener(monitorTwitchChat);


// Get Twitch Access Token from Chrome Storage
let twitchAccessToken;
chrome.storage.sync.get('twitchAccessToken', function(data) {
  twitchAccessToken = data.twitchAccessToken;
  if (!twitchAccessToken) {
    console.error('Error: Twitch access token not found');
    displayError('Error: Twitch access token not found');
  }
});

chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({url: 'options.html'});
});

// Function to handle errors
function handleError(error, message) {
  console.error(message, error);
  sendWarningToExtUser(`${message}: ${error.message}`);
}

// Function to display an error to the extension user
function displayError(message) {
  chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'StreamMatey Error',
      message: message
  });
}

// Function to convert ArrayBuffer to Hexadecimal
function buf2hex(buffer) { 
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Encryption function
async function encrypt(data, jwk) {
  // Import the JWK back to a CryptoKey
  const key = await window.crypto.subtle.importKey('jwk', jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

  let encoded = new TextEncoder().encode(JSON.stringify(data));
  let iv = window.crypto.getRandomValues(new Uint8Array(12));

  try {
      const encrypted = await window.crypto.subtle.encrypt(
          {
              name: "AES-GCM",
              iv: iv,
          },
          key,
          encoded
      );
     // Convert to Base64 and prepend IV for storage
     let encryptedStr = btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(encrypted)))));
     return btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, iv)))) + ',' + encryptedStr;
  } catch (err) {
      console.error(err);
      displayError('Error encrypting data: ' + err.message);
      throw err; // Propagate the error
  }
}

async function decrypt(data, jwk) {
  // Import the JWK back to a CryptoKey
  const key = await window.crypto.subtle.importKey('jwk', jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

  let parts = data.split(',');
  let iv = new Uint8Array(decodeURIComponent(escape(atob(parts[0]))).split('').map(c => c.charCodeAt(0)));
  let encrypted = new Uint8Array(decodeURIComponent(escape(atob(parts[1]))).split('').map(c => c.charCodeAt(0)));

  try {
      const decrypted = await window.crypto.subtle.decrypt(
          {
              name: "AES-GCM",
              iv: iv,
          },
          key,
          encrypted
      );
      return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
      console.error(err);
      displayError('Error decrypting data: ' + err.message);
      throw err; // Propagate the error
  }

}

