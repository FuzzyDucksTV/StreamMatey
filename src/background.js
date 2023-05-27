// Import required modules

const tmi = require('tmi.js');
const jQuery = require('jquery');
const $ = jQuery;

// Global variables
let client;
let preferences;
let encryptionKey;

// Perspective API variables
const perspectiveApiUrl = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=';

// Netlify function variables
const netlifyFunctionUrl = 'https://myfunction.netlify.app/.netlify/functions/twitchOAuth';


//imports

import { getPreferences, savePreferences, setDefaultPreferences } from './handlePreferences.js';
import { getEncryptionKey } from './handleEncryption.js';
import { monitorTwitchChat } from './handleTwitchChatMessages.js';
import { handleStorageChanges } from './handleChromeStorageChanges.js';
import { handleMessages } from './handleBackgroundMessages.js';



// Function to initialize the extension
async function init() {
    // Get the user's preferences
    preferences = getPreferences();
    encryptionKey = getEncryptionKey();

    }


// Initialize the extension
await init();

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => chrome.tabs.create({url: 'options.html'}));
// send the preferences to the content script when the extension icon is clicked, instructing the content script to update the preferences on the options.html page
//chrome.action.onClicked.addListener(() => chrome.tabs.sendMessage({type: 'updatePreferences', preferences: preferences}));

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

