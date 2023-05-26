// Import required modules

const tmi = require('tmi.js');
const jQuery = require('jquery');
const $ = jQuery;

// Global variables
let client;
let preferences;
let chatHistory;
let encryptionKey;
let sentimentScore;
let toxicityScore;
let sentimentAnalysisOptions;
let toxicityDetectionOptions;
let twitchAccessToken;


// Perspective API variables
const perspectiveApiUrl = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=';

// Netlify function variables
const netlifyFunctionUrl = 'https://myfunction.netlify.app/.netlify/functions/twitchOAuth';


//imports

import { getPreferences, savePreferences, getDefaultPreferences } from './handlePreferences.js';
import { getEncryptionKey } from './handleEncryption.js';
import { monitorTwitchChat } from './handleTwitchChatMessages.js';
import { setDefaultPreferences } from './handlePreferences.js';
import { handleStorageChanges } from './handleChromeStorageChanges.js';
import { handleMessages } from './handleBackgroundMessages.js';



// Function to initialize the extension
async function init() {
    // Get the user's preferences
    preferences = getPreferences();
    if (!preferences) {
      // If no preferences are found, set the default preferences
      setDefaultPreferences()();
      preferences = getPreferences();
      savePreferences(preferences);
    } else {
        // If preferences are found, set the encryption key
        encryptionKey = getEncryptionKey();

    }

    // Initialize the client
    client = new tmi.Client({
        connection: {
            secure: true,
            reconnect: true
        },
        channels: [preferences.twitchChannel]
    });

    // Register our event handlers (defined below)
    //client.on('message', handleTwitchChatMessages.handleTwitchChatMessages);  // Handle incoming chat messages
    //client.on('connected', handleTwitchLoginLogout.onConnectedHandler);  // Handle successful connection  
    //client.on('disconnected', handleTwitchLoginLogout.onDisconnectedHandler);  // Handle disconnection  
    //client.on('reconnect', handleTwitchLoginLogout.onReconnectHandler);  // Handle reconnection
    //client.on('join', handleTwitchLoginLogout.onJoinHandler);  // Handle joining a channel
    //client.on('part', handleTwitchLoginLogout.onPartHandler);  // Handle leaving a channel

    // Connect to Twitch
    client.connect();

}

// Initialize the extension
init();

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => chrome.tabs.create({url: 'options.html'}));

// Start monitoring Twitch chat when the extension is installed or updated
chrome.runtime.onInstalled.addListener(monitorTwitchChat);

// Listen for messages from the content script
// Handle messages from the content script
chrome.runtime.onMessage.addListener(handleMessages);

// Listen for changes in Chrome's sync storage
  chrome.storage.onChanged.addListener(handleStorageChanges);  // Monitor changes in Chrome's sync storage

// Listen for changes in Chrome's local storage
 //   chrome.storage.onChanged.addListener(handleChromeStorageChanges.handleStorageChanges);  // Monitor changes in Chrome's local storage

// Listen for changes in Chrome's managed storage
 //   chrome.storage.onChanged.addListener(handleChromeStorageChanges.handleStorageChanges);  // Monitor changes in Chrome's managed storage

