// Import required modules
const tmi = require('tmi.js');
const axios = require('axios');

// Variables for Twitch, Perspective, and Netlify API
let twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
let netlifyFunctionUrl = 'YOUR_NETLIFY_FUNCTION_URL'; // Add your Netlify function URL here

// Create a new instance of the Perspective API client
const client = new perspective.ApiClient();

chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({url: 'options.html'});
});

// Listen for messages from the options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'initiateTwitchOAuth') {
    initiateTwitchOAuth();
  }
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
}
// Other message handling...
});

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


// Listen for messages from the options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
if (request.message === 'initiateTwitchOAuth') {
  initiateTwitchOAuth();
} else if (request.message === 'fetchChatMessages') {
  fetchChatMessages(request.channel)
  .then(chatMessages => sendResponse(chatMessages))
  .catch(error => console.error('Error fetching chat messages:', error));
} else if (request.message === 'monitorTwitchChat') {
  monitorTwitchChat();
}

});

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
