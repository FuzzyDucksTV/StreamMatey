// Import required modules
import axios from 'axios';
import Sentiment from 'sentiment';
import perspective from 'perspective-api-client';

// Variables for Twitch API
let twitchAPIKey;

// Create a new instance of the Sentiment Analyzer and Perspective API client
const sentiment = new Sentiment();
let client;

// Load the Twitch API key from the Netlify function
axios.get('/.netlify/functions/twitchAPIKey')
  .then((response) => {
    twitchAPIKey = response.data;
    client = new perspective({ apiKey: response.data });
  })
  .catch((error) => {
    console.error('Error loading Twitch API key:', error);
    sendWarningToExtUser('Error loading Twitch API key: ' + error.message);
  });

// Variables to store the user's preferences
let enableSentimentAnalysis = true;
let enableToxicityDetection = true;
let sentimentSensitivity = null;
let toxicitySensitivity = null;

// Additional options
let sentimentOptions = {};
let toxicityOptions = {};

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
    console.error('Error fetching chat messages:', error);
    sendWarningToExtUser('Error fetching chat messages: ' + error.message);
  }
}

// Function to analyze a chat message for sentiment
function analyzeSentiment(message) {
  try {
    const result = sentiment.analyze(message);
    return result.comparative;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    sendWarningToExtUser('Error analyzing sentiment: ' + error.message);
    return null;
  }
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
      toxicitySensitivity = preferences.toxicity.options.sensitivity;
    }
  });
}

// Load the user's preferences when the content script starts
loadPreferences();

// Listen for messages from the content script and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updatePreferences') {
    loadPreferences();
  } else {
    handleMessage(request, sender, sendResponse); // Handle other actions
  }
  return true; // Indicate that the response will be sent asynchronously
});

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

// Function to decrypt data
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
      sendWarningToExtUser('Error decrypting data: ' + err.message);
      throw err; // Propagate the error
  }
}

// Function to update the sentiment and toxicity meters in the HTML
function updateMeters(sentimentScore, toxicityScore) {
  const sentimentMeter = document.getElementById('gigerMeter');
  const toxicityMeter = document.getElementById('toxicityMeter');

  // Update the sentiment meter
  if (sentimentScore !== null) {
    sentimentMeter.style.width = `${sentimentScore * 100}%`;
  }

  // Update the toxicity meter
  if (toxicityScore !== null) {
    toxicityMeter.style.width = `${toxicityScore * 100}%`;
  }
}

// Function to handle chat messages
async function handleChatMessage(message) {
  let sentimentScore = null;
  let toxicityScore = null;

  // Analyze the message for sentiment and toxicity
  if (enableSentimentAnalysis) {
    sentimentScore = analyzeSentiment(message);
  }
  if (enableToxicityDetection) {
    toxicityScore = await analyzeToxicity(message);
  }

  // Update the meters in the HTML
  updateMeters(sentimentScore, toxicityScore);
}

// Listen for chat messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'chatMessage') {
    handleChatMessage(request.message);
  }
  return true; // Indicate that the response will be sent asynchronously
});
