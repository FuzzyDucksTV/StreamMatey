// Import required modules
import axios from 'axios';
import perspective from 'perspective-api-client';

// Variables for Twitch and Perspective API
const twitchAPIKey = process.env.TWITCH_API_KEY;
const perspectiveAPIKey = process.env.PERSPECTIVE_API_KEY;

// Create a new instance of the Perspective API client
const client = new perspective.ApiClient(perspectiveAPIKey);

// Function to fetch chat messages from Twitch
async function fetchChatMessages(channel) {
  try {
    const response = await axios.get(`https://api.twitch.tv/kraken/channels/${channel}/chat`, {
      headers: {
        'Client-ID': twitchAPIKey,
        'Authorization': `Bearer ${twitchAPIKey}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching chat messages from Twitch:', error);
    throw error; // Throw the error after logging it
  }
}

// Function to analyze a chat message for toxicity
async function analyzeMessage(message) {
  try {
    const result = await client.analyze({ comment: { text: message } });
    return result.attributeScores.TOXICITY.summaryScore.value;
  } catch (error) {
    console.error('Error analyzing message:', error);
    throw error; // Throw the error after logging it
  }
}

// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
  try {
    if (request.action === 'fetchChatMessages') {
      const messages = await fetchChatMessages(request.channel);
      sendResponse({ messages });
    } else if (request.action === 'analyzeMessage') {
      const score = await analyzeMessage(request.message);
      sendResponse({ score });
    } else {
      throw new Error(`Unknown action: ${request.action}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  return true; // Indicate that the response will be sent asynchronously
}

// Variables to store the user's preferences and access token
let enableSentimentAnalysis = true;
let enableToxicityDetection = true;
let accessToken = null;
let refreshToken = null;
let expiryTime = null;

// Function to load the user's preferences
function loadPreferences() {
  chrome.storage.sync.get('preferences', (data) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading preferences:', chrome.runtime.lastError);
      return;
    }

    const preferences = data.preferences;
    if (preferences) {
      enableSentimentAnalysis = preferences.sentiment.enabled;
      enableToxicityDetection = preferences.toxicity.enabled;
    }
  });
}

// Function to handle user authentication
function handleAuthentication(request, sender, sendResponse) {
  
  const authUrl = 'https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=YOUR_SCOPES';
  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Error during authentication:', chrome.runtime.lastError);
      return;
    }

    // Extract the authorization code from the redirect URL
   const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');
    
    // Exchange the authorization code for an access token
    const tokenUrl = 'https://id.twitch.tv/oauth2/token';
    const body = `grant_type=authorization_code&code=${code}&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=YOUR_REDIRECT_URI`;
    fetch(tokenUrl, { method: 'POST', body: body }).then((response) => {
      if (!response.ok) {
        throw new Error('Error during token exchange: ' + response.statusText);
      }
      return response.json();
    }).then((data) => {
      // Store the access token, refresh token, and expiry time
      accessToken = data.access_token;
      refreshToken = data.refresh_token;
      expiryTime = data.expires_in;

      // Set up a timer to refresh the access token before it expires
      setTimeout(refreshAccessToken, (expiryTime - 60) * 1000); // Refresh 60 seconds before expiry
    }).catch((error) => {
      console.error('Error during token exchange:', error);
    });
  });
}

// Function to refresh the access token
function refreshAccessToken() {
  const tokenUrl = 'https://id.twitch.tv/oauth2/token';
  const body = `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET`;
  fetch(tokenUrl, { method: 'POST', body: body }).then((response) => {
    if (!response.ok) {
      throw new Error('Error during token refresh: ' + response.statusText);
    }
    return response.json();
  }).then((data) => {
    // Update the access token, refresh token, and expiry time
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    expiryTime = data.expires_in;

    // Set up the next refresh timer
    setTimeout(refreshAccessToken, (expiryTime - 60) * 1000); // Refresh 60 seconds before expiry
  }).catch((error) => {
    console.error('Error during token refresh:', error);
  });
}

// Listen for messages from the content script and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'initiateOAuth') {
    handleAuthentication(request, sender, sendResponse);
  } else if (request.type === 'updatePreferences') {
    loadPreferences();
  } else {
    handleMessage(request, sender, sendResponse); // Handle other actions
  }
  return true; // Indicate that the response will be sent asynchronously
});

// Load the user's preferences when the service worker starts
loadPreferences();
