// Import required modules

const tmi = require('tmi.js');
const jQuery = require('jquery');
const $ = jQuery;

// Global variables
let client;
let preferences;
let chatHistory;
let encryptionKey;
let enableSentimentAnalysis;
let enableToxicityDetection;
let sentimentSensitivity;
let toxicitySensitivity;
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
const handleTwitchChatMessages = require('./handleTwitchChatMessages');
const handleSentimentAnalysis = require('./handleSentimentAnalysis');
const handleNetlifyAPI = require('./handleNetlifyAPI');
const handlePreferences = require('./handlePreferences');
const handleEncryption = require('./handleEncryption');
const handleTwitchLoginLogout = require('./handleTwitchLoginLogout');
const errorHandling = require('./errorHandling');

// Function to initialize the extension
async function init() {
    // Get the user's preferences
    preferences = await handlePreferences.getPreferences();
    if (!preferences) {
      // If no preferences are found, set the default preferences
      preferences = handlePreferences.setDefaultPreferences();
    }

    // Get the user's encryption key
    encryptionKey = await handleEncryption.getEncryptionKey();
    if (!encryptionKey) {
      // If no encryption key is found, generate a new one
      encryptionKey = handleEncryption.generateEncryptionKey();
    }

    // Get the user's Twitch access token
    twitchAccessToken = await handleTwitchLoginLogout.getTwitchAccessToken();
    if (!twitchAccessToken) {
      // If no Twitch access token is found, get one from the Twitch OAuth function
      twitchAccessToken = await handleTwitchLoginLogout.getTwitchAccessTokenFromOAuth();
    }

    // Initialize the chat history
    chatHistory = [];

    // Initialize the sentiment analysis options
    sentimentAnalysisOptions = preferences.sentiment.options;

    // Initialize the toxicity detection options
    toxicityDetectionOptions = preferences.toxicity.options;

    // Initialize the sentiment score
    sentimentScore = 0;

    // Initialize the toxicity score
    toxicityScore = 0;

    // Initialize the client
    client = new tmi.Client({
        connection: {
            secure: true,
            reconnect: true
        },
        channels: ['mychannel']
    });

    // Register our event handlers (defined below)
    client.on('message', handleTwitchChatMessages.handleTwitchChatMessages);  // Handle incoming chat messages
    client.on('connected', handleTwitchLoginLogout.onConnectedHandler);  // Handle successful connection  
    client.on('disconnected', handleTwitchLoginLogout.onDisconnectedHandler);  // Handle disconnection  
    client.on('reconnect', handleTwitchLoginLogout.onReconnectHandler);  // Handle reconnection
    client.on('join', handleTwitchLoginLogout.onJoinHandler);  // Handle joining a channel
    client.on('part', handleTwitchLoginLogout.onPartHandler);  // Handle leaving a channel

    // Connect to Twitch
    client.connect();
}

// Initialize the extension
init();

// Function to get the user's preferences
export async function getPreferences() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['preferences'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.preferences);
            }
        });
    });
}

// Function to set the user's preferences
export async function setPreferences(preferences) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ 'preferences': preferences }, function() {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// Function to get the default preferences
export function getDefaultPreferences() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['defaultPreferences'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.defaultPreferences);
            }
        });
    });
}

// Function to get the user's encryption key
export async function getEncryptionKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['encryptionKey'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.encryptionKey);
            }
        });
    });
}

// Function to set the user's encryption key
export async function setEncryptionKey(encryptionKey) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ 'encryptionKey': encryptionKey }, function() {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}


// Function to get the Twitch access token from the Twitch OAuth function
export async function getTwitchAccessToken(clientId) {

    try {
        //Get access token from netlify function
        const netlifyFunctionUrl = await handleNetlifyAPI.getNetlifyFunctionUrl();
        const response = await jQuery.ajax({

            url: netlifyFunctionUrl,
            type: 'GET',
            data: { clientId: clientId },
            dataType: 'json'
        });
        if (!response) {

            throw new Error('Error initiating Twitch OAuth: No response received');
        }

        const accessToken = response.data.access_token;
        if (!accessToken) {

            throw new Error('Error initiating Twitch OAuth: No access token returned');
        }

        // Encrypt the access token using the encryption key
        chrome.storage.sync.get(['encryptionKey'], function(data) {
            if (chrome.runtime.lastError) {
                console.error('Error loading encryption key:', chrome.runtime.lastError);
                return;
            }
            const encryptionKey = data.encryptionKey;
            if (!encryptionKey) {

                throw new Error('Error initiating Twitch OAuth: Encryption key not found');
            }

            const encryptedAccessToken = handleEncryption.encrypt(accessToken, encryptionKey);

            // Save the encrypted access token to Chrome storage
            chrome.storage.sync.set({ 'twitchAccessToken': encryptedAccessToken }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving Twitch access token:', chrome.runtime.lastError);
                    return;
                }
            });
        });

        return accessToken;
    } catch (error) {
        console.error(error);
    }
}




// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => chrome.tabs.create({url: 'options.html'}));

// Check if the encryption key exists when the extension starts
checkEncryptionKeyExists();

//set default preferences
await handlePreferences.setDefaultPreferences();

 
// Start monitoring Twitch chat when the extension is installed or updated
chrome.runtime.onInstalled.addListener(monitorTwitchChat);

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(handleBackgroundMessages);

// Get Twitch Access Token from Chrome Storage
chrome.storage.sync.get('twitchAccessToken', function(result) {
    // If the user is logged in
    if (result.twitchAccessToken) {
        // Get Twitch User ID from Chrome Storage
        chrome.storage.sync.get('twitchUserId', function(result) {
            // If the user is currently streaming
            if (result.twitchUserId) {
                // Get Twitch Stream ID from Chrome Storage
                chrome.storage.sync.get('twitchStreamId', function(result) {
                    
                    // If the user is currently streaming
                    if (result.twitchStreamId) {
                        // Start monitoring Twitch chat
                        handleTwitchChatMessages.monitorTwitchChat();
                      }
                });
            }
        });
    }
});

// Function to check if the encryption key exists
function checkEncryptionKeyExists() {
    // Get encryption key from Chrome storage
    chrome.storage.sync.get('encryptionKey', function(result) {

        // If the encryption key does not exist
        if (!result.encryptionKey) {

            // Send a warning to the extension user
            sendWarningToExtUser('StreamMatey has detected that the encryption key is missing. Please log out of Twitch and log back in to generate a new encryption key.');
            
            // Log the error
            console.error('StreamMatey has detected that the encryption key is missing. Please log out of Twitch and log back in to generate a new encryption key.');
        }
    });
}


// Function to send a warning to the extension user
export function sendWarningToExtUser(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'StreamMatey Warning',
        message: message
    });
}


 // Monitor changes in Chrome's sync storage
chrome.storage.onChanged.addListener(logStorageChanges);


// Function to log changes in Chrome's sync storage
function logStorageChanges(changes, areaName) {
    
    for (let key in changes) {
      let storageChange = changes[key];

      console.log(`Storage key "${key}" in namespace "${areaName}" changed. Old value was "${storageChange.oldValue}", new value is "${storageChange.newValue}".`);
      handleChromeStorageChanges.handleStorageChanges(key, storageChange.oldValue, storageChange.newValue);
    }
  }
  
    // Monitor changes in Chrome's sync storage

  chrome.storage.onChanged.addListener(handleChromeStorageChanges.handleStorageChanges);  // Monitor changes in Chrome's sync storage
