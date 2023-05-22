// Import required modules
const tmi = require('tmi.js');
const axios = require('axios');
const perspective = require('perspective-api-client');
const { google } = require('googleapis');

// Variables for Twitch, Perspective, and Netlify API
let twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
let googleClientId = 'YOUR_GOOGLE_CLIENT_ID';

// Create a new instance of the Perspective API client
const client = new perspective.ApiClient();
chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({url: 'options.html'});
});

chrome.identity.getAuthToken({interactive: true}, function(token) {
  // Use the token to access the Twitch and Perspective APIs
});

// Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  googleClientId,
  'urn:ietf:wg:oauth:2.0:oob'
);

// Function to initiate Google OAuth process
function initiateGoogleOAuth() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile']
  });

  // Open the authUrl in a new tab
  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function(redirectUrl) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      let url = new URL(redirectUrl);
      let code = url.searchParams.get('code');
      handleGoogleOAuthResponse(code);
    }
  });
}

// Function to handle Google OAuth response
function handleGoogleOAuthResponse(code) {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error getting access token:', err);
      return;
    }

    // Store the access token in the Chrome storage
    chrome.storage.sync.set({ googleAccessToken: token.access_token }, () => {
      console.log('Google access token stored.');
    });
  });
}

// Listen for messages from the options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'initiateGoogleOAuth') {
    initiateGoogleOAuth();
  } else if (request.message === 'handleGoogleOAuthResponse') {
    handleGoogleOAuthResponse(request.code);
  }
});

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

// Function to handle Twitch chat messages
async function handleChatMessage(channel, userstate, message, self) {
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
        // If both sentiment analysis and toxicity detection are enabled, handle the message based on both scores
        if (sentimentScore < sentimentOptions.threshold && toxicityScore > toxicityOptions.threshold) {
            // If the message is both negative and toxic, take appropriate actions based on the options set in options.html.
            // Send a warning to the toxic user
            if (warningToxicUser) {
                sendWarning(userstate.username, warningMessageToxicUser);
            }
            // Send a custom message to the mods
            if (customMessageToMods) {
                sendMessageToMods(customMessage);
            }
            // Send a warning to the extension user
            if (warningExtUser) {
                sendWarningToExtUser(warningMessageExtUser);
            }
        }
    } else if (sentimentScore !== null) {
        // If only sentiment analysis is enabled, handle the message based on the sentiment score
        if (sentimentScore < sentimentOptions.threshold) {
            // If the message is negative, take appropriate action , take appropriate actions based on the options set in options.html.
            // Send a warning to the toxic user
            if (warningToxicUser) {
                sendWarning(userstate.username, warningMessageToxicUser);
            }
            // Send a custom message to the mods
            if (customMessageToMods) {
                sendMessageToMods(customMessage);
            }
            // Send a warning to the extension user
            if (warningExtUser) {
                sendWarningToExtUser(warningMessageExtUser);
            }
        }
    } else if (toxicityScore !== null) {
        // If only toxicity detection is enabled, handle the message based on the toxicity score
        if (toxicityScore > toxicityOptions.threshold) {
            // If the message is toxic, take appropriate action,  take appropriate actions based on the options set in options.html.
            // Send a warning to the toxic user
            if (warningToxicUser) {
                sendWarning(userstate.username, warningMessageToxicUser);
            }
            // Send a custom message to the mods
            if (customMessageToMods) {
                sendMessageToMods(customMessage);
            }
            // Send a warning to the extension user
            if (warningExtUser) {
                sendWarningToExtUser(warningMessageExtUser);
            }
        }
    }
    // If neither sentiment analysis nor toxicity detection are enabled, just display the message as is
}

// Function to send a warning to a user
function sendWarning(username, warningMessage) {
    // Send the warning message to the user
    tmiClient.say(channel, `@${username} ${warningMessage}`);
}

// Function to send a message to the mods
function sendMessageToMods(customMessage) {
    // Send the custom message to the mods
    tmiClient.say(channel, `/mods ${customMessage}`);
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

// Function to monitor Twitch chat in real-time
async function monitorTwitchChat() {
  try {
    // Get the current Twitch channel
    const channel = await getCurrentChannel(twitchAccessToken, twitchClientId);

    // Create a Twitch client
    const client = new tmi.Client({
      options: { debug: true },
      connection: {
        secure: true,
        reconnect: true
      },
      identity: {
        username: twitchClientId,
        password: `oauth:${twitchAccessToken}`
      },
      channels: [channel]
    });

    // Connect to Twitch
    try {
      await client.connect();
    }
      catch (error) {
      console.error('Error connecting to Twitch:', error);
      // Handle the error appropriately, e.g. by sending a message to the mods or the extension user
      sendWarningToExtUser('Error connecting to Twitch: ' + error.message);
    }

    // Listen for chat messages
    client.on('message', handleChatMessage);
  } catch (error) {
    console.error('Error setting up Twitch chat monitoring:', error);
    // Handle the error appropriately, e.g. by sending a message to the mods or the extension user
    sendWarningToExtUser('Error setting up Twitch chat monitoring: ' + error.message);
  }
}

// Monitor Twitch chat when the script is loaded
monitorTwitchChat();
