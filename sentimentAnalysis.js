// Import required modules
import axios from 'axios';
import Sentiment from 'sentiment';

// Variables for Twitch API
const twitchAPIKey = process.env.TWITCH_API_KEY;

// Create a new instance of the Sentiment Analyzer
const sentiment = new Sentiment();

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

// Function to analyze a chat message for sentiment
function analyzeMessage(message) {
  try {
    const result = sentiment.analyze(message);
    return result.comparative;
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

// Variables to store the user's preferences
let enableSentimentAnalysis = true;

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

// Load the user's preferences when the service worker starts
loadPreferences();
