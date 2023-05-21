// Import required modules
import { Client } from 'tmi.js';
import axios from 'axios';

// Variables for Netlify API
let netlifyAPIKey = 'YOUR_NETLIFY_API_KEY';

// Function to fetch API keys from Netlify
async function fetchAPIKeys() {
  try {
    const response = await axios.get('https://api.netlify.com/api/v1/keys', {
      headers: {
        'Authorization': `Bearer ${netlifyAPIKey}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching API keys from Netlify:', error);
    throw error;
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
    const data = await response.json();
    return data.data[0].login;
  } catch (error) {
    console.error('Error getting current Twitch channel:', error);
    throw error;
  }
}

// Function to display error messages
function displayError(message) {
  chrome.runtime.sendMessage({ type: 'error', message: message });
}

// Fetch API keys when the script is loaded
fetchAPIKeys().catch(error => {
  console.error('Error fetching API keys from Netlify:', error);
  displayError('Error fetching API keys from Netlify: ' + error.message);
});

// Function to handle Twitch chat messages
function handleChatMessage(channel, userstate, message, self) {
  // Ignore messages from the bot itself
  if (self) return;

  // Send the message to the background script for analysis
  try {
    chrome.runtime.sendMessage({ type: 'analyzeMessage', message: message });
  } catch (error) {
    console.error('Error sending message to background script:', error);
    displayError('Error sending message to background script: ' + error.message);
  }
}

// Function to monitor Twitch chat in real-time
async function monitorTwitchChat() {
  try {
    // Fetch API keys
    const keys = await fetchAPIKeys();

    // Get the current Twitch channel
    const channel = await getCurrentChannel(keys.twitchAccessToken, keys.twitchClientID);

    // Create a Twitch client
    const client = new Client({
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
    client.connect().catch(error => {
      console.error('Error connecting to Twitch:', error);
      displayError('Error connecting to Twitch: ' + error.message);
    });

    // Listen for chat messages
    client.on('message', handleChatMessage);
  } catch (error) {
    console.error('Error setting up Twitch chat monitoring:', error);
    displayError('Error setting up Twitch chat monitoring: ' + error.message);
  }
}

// Monitor Twitch chat when the script is loaded
monitorTwitchChat();
