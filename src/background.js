// Import required modules
const tmi = require('tmi.js');
const axios = require('axios');

// Variables for Twitch, Perspective, and Netlify API
let twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
let netlifyFunctionUrl = 'YOUR_NETLIFY_FUNCTION_URL'; // Add your Netlify function URL here

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => chrome.tabs.create({url: 'options.html'}));

// Handle messages from the content script
chrome.runtime.onMessage.addListener(handleMessages);

// Monitor changes in Chrome's sync storage
chrome.storage.onChanged.addListener(logStorageChanges);

// Check if the encryption key exists when the extension starts
checkEncryptionKeyExists();

// Set default values for the extension's preferences
setDefaultValues()
// Start monitoring Twitch chat when the extension is installed or updated
chrome.runtime.onInstalled.addListener(monitorTwitchChat);

// Get Twitch Access Token from Chrome Storage
chrome.storage.sync.get('twitchAccessToken', handleTwitchAccessToken);

// Function to handle Twitch access token
function handleTwitchAccessToken(data) {
  let twitchAccessToken = data.twitchAccessToken;
  if (!twitchAccessToken) {
    displayError('Error: Twitch access token not found');
  }
}

// Function to send a warning to the extension user
function sendWarningToExtUser(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'StreamMatey Warning',
        message: message
    });
    }

// Function to handle messages from the content script
function handleMessages(request, sender, sendResponse) {
  switch (request.type) {
    case 'checkTwitchLogin':
      checkTwitchLogin(sendResponse);
      break;
    case 'getPreferences':
      getPreferences(sendResponse);
      break;
    case 'initiateTwitchOAuth':
      initiateTwitchOAuth();
      break;
    case 'savePreferences':
      savePreferences();
      break;
    default:
      console.error('Unknown request type:', request.type);
  }
}

// Function to log changes in Chrome's sync storage
function logStorageChanges(changes, areaName) {
  for (let key in changes) {
    let storageChange = changes[key];
    console.log(`Storage key "${key}" in namespace "${areaName}" changed. Old value was "${storageChange.oldValue}", new value is "${storageChange.newValue}".`);
  }
}

// Function to check if the encryption key exists
function checkEncryptionKeyExists() {
  chrome.storage.sync.get(['encryptionKey'], data => {
    if (!data.encryptionKey) {
      generateNewEncryptionKey(); // Generate a new encryption key if it doesn't exist
    } else {
      loadEncryptionKey(); // Load the encryption key if it exists
    }
    setTimeout(checkEncryptionKeyExists, 5000); // Check again after 5 seconds
  });
}

// Function to load the encryption key
function loadEncryptionKey() {
  chrome.storage.sync.get(['encryptionKey'], data => {
    if (data.encryptionKey) {
      // Convert the encryption key to a usable format
      window.crypto.subtle.importKey('jwk', data.encryptionKey, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
        .then(key => encryptionKey = key)
        .catch(err => displayError('Error loading encryption key: ' + err.message));
    } else {
      displayError('Error: Encryption key not found');
    }
  });
}

// Function to generate a new encryption key
function generateNewEncryptionKey() {
  window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
    .then(key => window.crypto.subtle.exportKey('jwk', key)) // Convert key to a storable format
    .then(keyData => {
        // Save the key data to Chrome's sync storage
        chrome.storage.sync.set({ encryptionKey: keyData }, () => {
          if (chrome.runtime.lastError) {
            displayError('Error saving encryption key: ' + chrome.runtime.lastError.message);
          } else {
            console.log('Encryption key saved successfully');
            loadEncryptionKey(); // Load the new encryption key
          }
        });
      })
      .catch(err => displayError('Error generating encryption key: ' + err.message));
  }
  
  // Function to display error messages
  function displayError(message) {
    console.error(message);
    // You can also display the error message to the user in some way
    
    // Send a notification to the user
    chrome.notifications.create(
        'errorNotification',
        {
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Twitch Chat Filter',
            message: message
        }
        );
  }
  
  // Function to monitor Twitch chat
  function monitorTwitchChat() {
    // Get the user's Twitch username and OAuth token from Chrome's sync storage
    chrome.storage.sync.get(['twitchUsername', 'twitchOAuthToken'], data => {
      if (data.twitchUsername && data.twitchOAuthToken) {
        // Create a new Twitch client
        const client = new tmi.Client({
          options: { debug: true },
          connection: {
            secure: true,
            reconnect: true
          },
          identity: {
            username: data.twitchUsername,
            password: data.twitchOAuthToken
          },
          channels: [ data.twitchUsername ]
        });
  
        // Connect to Twitch
        client.connect();
  
        // Listen for chat messages
        client.on('message', (channel, tags, message, self) => {
          // Ignore messages from the bot itself
          if (self) return;
  
          // TODO: Handle the chat message
        });
      } else {
        displayError('Error: Twitch username or OAuth token not found');
      }
    });
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
  

  function checkTwitchLogin(sendResponse) {
    chrome.storage.sync.get(['twitchAccessToken'], function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading Twitch access token:', chrome.runtime.lastError);
        sendResponse({ loggedIn: false });
        return;
      }
      const twitchAccessToken = data.twitchAccessToken;
      if (!twitchAccessToken) {
        //console.error('Error: Twitch access token not found');
        sendResponse({ loggedIn: false });
        return;
      }
      // Decrypt the access token using the encryption key
      chrome.storage.sync.get(['encryptionKey'], function(data) {
        if (chrome.runtime.lastError) {
          console.error('Error loading encryption key:', chrome.runtime.lastError);
          sendResponse({ error: 'Error loading encryption key: ' + chrome.runtime.lastError.message });
          return;
        }
        const encryptionKey = data.encryptionKey;
        if (!encryptionKey) {
          console.error('Error: Encryption key not found');
          sendResponse({ loggedIn: false });
          return;
        }
        const accessToken = decrypt(twitchAccessToken, encryptionKey);
        // Check if the access token is still valid
        fetch('https://id.twitch.tv/oauth2/validate', {
          headers: {
            'Authorization': `OAuth ${accessToken}`
          }
        }).then(response => {
          if (response.status === 401) {
            // Access token is invalid, so remove it from storage
            chrome.storage.sync.remove(['twitchAccessToken'], function() {
              if (chrome.runtime.lastError) {
                console.error('Error removing Twitch access token:', chrome.runtime.lastError);
                sendResponse({ error: 'Error removing Twitch access token: ' + chrome.runtime.lastError.message });
                return;
              }
              sendResponse({ loggedIn: false });
            });
          } else {
            sendResponse({ loggedIn: true });
          }
        }).catch(error => {
          console.error('Error validating Twitch access token:', error);
          sendResponse({ error: 'Error validating Twitch access token: ' + error.message });
        });
      });
    });
  }

  // Function to get the user's preferences
  function getPreferences(sendResponse) {
    chrome.storage.sync.get(['preferences'], function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading preferences:', chrome.runtime.lastError);
        sendResponse({ error: 'Error loading preferences: ' + chrome.runtime.lastError.message });
        return;
      }
      const preferences = data.preferences;
      if (!preferences) {
        console.error('Error: Preferences not found');
        sendResponse({ error: 'Error: Preferences not found' });
        return;
      }
      // Decrypt the preferences using the encryption key
      chrome.storage.sync.get(['encryptionKey'], function(data) {
        if (chrome.runtime.lastError) {
          console.error('Error loading encryption key:', chrome.runtime.lastError);
          sendResponse({ error: 'Error loading encryption key: ' + chrome.runtime.lastError.message });
          return;
        }
        const encryptionKey = data.encryptionKey;
        if (!encryptionKey) {
          console.error('Error: Encryption key not found');
          sendResponse({ error: 'Error: Encryption key not found' });
          return;
        }
        const decryptedPreferences = decrypt(preferences, encryptionKey);
        sendResponse({ preferences: decryptedPreferences });
      });
    });
    }

    // Function to initiate the Twitch OAuth flow
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
            storeInCookies(decryptedAccessToken);
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

        // Function to save the user's preferences
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



  //Store the access token securely in Chrome's sync storage
  function storeInCookies(decryptedAccessToken){
    chrome.cookies.set({
    url: 'https://www.twitch.tv',
    name: 'accessToken',
    value: decryptedAccessToken,
    secure: true,
    httpOnly: true
  }, function(cookie) {
    if (chrome.runtime.lastError) {
      console.error('Error setting access token cookie:', chrome.runtime.lastError);
      displayError('Error setting access token cookie: ' + chrome.runtime.lastError.message);
    }
  });
  }

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

  // Function to analyze a chat message for toxicity
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
  
  // function to set default values for the extension
    function setDefaultValues() {
        // Set default values for preferences
        preferences.sentiment.enabled = true;
        preferences.toxicity.enabled = true;
        preferences.sentiment.options.sensitivity = 0.5;
        preferences.toxicity.options.threshold = 0.5;
        preferences.toxicity.options.warningMessageToxic = "This message may be toxic. Please be respectful.";
        preferences.toxicity.options.warningMessageNegative = "This message may be negative. Please be respectful.";
        preferences.toxicity.options.customMessageToxic = "This message may be toxic. Please be respectful.";
        preferences.toxicity.options.customMessageNegative = "This message may be negative. Please be respectful.";
        preferences.toxicity.options.warningToxicUser = true;
        preferences.toxicity.options.warningNegativeUser = true;
        preferences.toxicity.options.customMessageToxicUser = "This user may be toxic. Please be respectful.";
        preferences.toxicity.options.customMessageNegativeUser = "This user may be negative. Please be respectful.";
        preferences.darkMode = false;
        preferences.sentiment.options.showLeaderboard = true;
        preferences.toxicity.options.showLeaderboard = true;
        //preferences.sentiment.options.leaderboardDuration is set to 7 days by default
        preferences.sentiment.options.leaderboardDuration = 7;
        preferences.toxicity.options.leaderboardDuration = 7;
        preferences.sentiment.options.leaderboardSize = 10;
        preferences.toxicity.options.leaderboardSize = 10;
        preferences.sentiment.options.leaderboardType = 'top';
        preferences.toxicity.options.leaderboardType = 'top';

        // Set default values for the leaderboard
        leaderboard.sentiment = [];
        leaderboard.toxicity = [];

        // Set default values for the user's chat history
        chatHistory.sentiment = [];
        chatHistory.toxicity = [];

        // Store the default values in Chrome's sync storage
        chrome.storage.sync.set({ preferences: preferences }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error setting preferences:', chrome.runtime.lastError);
                sendWarningToExtUser('Error setting preferences: ' + chrome.runtime.lastError.message);
            }
        }
        );
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



