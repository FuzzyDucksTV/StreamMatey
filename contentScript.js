// Import required modules
import axios from 'axios';
import Sentiment from 'sentiment';
import perspective from 'perspective-api-client';

// Variables for Twitch API
const twitchAPIKey = process.env.TWITCH_API_KEY;

// Create a new instance of the Sentiment Analyzer and Perspective API client
const sentiment = new Sentiment();
const client = new perspective.ApiClient(perspectiveAPIKey);

// Variables to store the user's preferences
let enableSentimentAnalysis = true;
let enableToxicityDetection = true;

// Additional options
let sentimentOptions = {};
let toxicityOptions = {};

// Function to fetch chat messages from Twitch
async function fetchChatMessages(channel) {
  const response = await axios.get(`https://api.twitch.tv/kraken/channels/${channel}/chat`, {
    headers: {
      'Client-ID': twitchAPIKey,
      'Authorization': `Bearer ${twitchAPIKey}`
    }
  });
  return response.data;
}

// Function to analyze a chat message for sentiment
function analyzeSentiment(message) {
  const result = sentiment.analyze(message);
  return result.comparative;
}

// Function to analyze a chat message for toxicity
async function analyzeToxicity(message) {
  const result = await client.analyze({ comment: { text: message } });
  return result.attributeScores.TOXICITY.summaryScore.value;
}

// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
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
  return true; // Indicate that the response will be sent asynchronously
}

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
      sentimentOptions = preferences.sentiment.options;
      toxicityOptions = preferences.toxicity.options;
    }
  });
}

// Listen for messages from the content script and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updatePreferences') {
    loadPreferences();
  } else {
    handleMessage(request, sender, sendResponse); // Handle other actions
  }
  return true; // Indicate that the response will be sent asynchronously
});

// Load the user's preferences when the content script starts
loadPreferences();
