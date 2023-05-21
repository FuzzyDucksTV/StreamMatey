// Import required modules
const tmi = require('tmi.js');
const axios = require('axios');
const perspective = require('perspective-api-client');

// Variables for Twitch, Perspective, and Netlify API
let twitchAPIKey = 'YOUR_TWITCH_API_KEY';
let perspectiveAPIKey = 'YOUR_PERSPECTIVE_API_KEY';
let netlifyAPIKey = 'YOUR_NETLIFY_API_KEY';

// Create a new instance of the Perspective API client
const client = new perspective.ApiClient(perspectiveAPIKey);

// Function to fetch API keys from Netlify
async function fetchAPIKeys() {
  try {
    const response = await axios.get('https://api.netlify.com/api/v1/keys', {
      headers: {
        'Authorization': `Bearer ${netlifyAPIKey}`
      }
    });
    if (response.status !== 200) {
      throw new Error(`Error fetching API keys from Netlify: HTTP ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching API keys from Netlify:', error);
    // Handle the error appropriately, e.g. by sending a message to the mods or the extension user
    sendWarningToExtUser('Error fetching API keys from Netlify: ' + error.message);
  }
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
    // Handle the error appropriately, e.g. by sending a message to the mods or the extension user
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
    // Handle the error appropriately, e.g. by sending a message to the mods or the extension user
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
  // This will depend on how you're interfacing with the Twitch chat
  // For example, you might use the tmi.js library to send a message to the chat
  tmiClient.say(channel, `@${username} ${warningMessage}`);
}

// Function to send a message to the mods
function sendMessageToMods(customMessage) {
  // Send the custom message to the mods
  // This will depend on how you're interfacing with the Twitch chat
  // For example, you might use the tmi.js library to send a message to the chat
  tmiClient.say(channel, `/mods ${customMessage}`);
}

// Function to send a warning to the extension user
function sendWarningToExtUser(warningMessage) {
  // Display the warning message to the extension user
  // This could be done using a browser notification, for example
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png', // Replace with the path to your icon
    title: 'StreamMatey Warning',
    message: warningMessage
  });
}

// Function to monitor Twitch chat in real-time
async function monitorTwitchChat() {
  try {
    // Fetch API keys
    const keys = await fetchAPIKeys();

    // Get the current Twitch channel
    const channel = await getCurrentChannel(keys.twitchAccessToken, keys.twitchClientID);

    // Create a Twitch client
    const client = new tmi.Client({
      options: { debug: true },
      connection: {
        secure: true,
        reconnect: true
      },
      identity: {
        username: keys.twitchClientID,
        password: keys.twitchAccessToken
      },
      channels: [channel]
    });

    // Connect to Twitch
    try {
      await client.connect();
    } catch (error) {
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