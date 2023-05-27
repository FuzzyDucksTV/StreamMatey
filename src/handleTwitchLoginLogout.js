//Handle  the login and logout of the user
// Path: src\handleTwitchLoginLogout.js
//imports
import { displayError } from './errorHandling.js';
import { sendWarningToExtUser } from './handleTwitchChatMessages.js';
import { setTwitchAccessToken } from './handlePreferences.js';


// Variables for Twitch, Perspective, and Netlify API
let twitchRefreshToken = '';
let netlifyFunctionUrl = 'YOUR_NETLIFY_FUNCTION_URL'; // Add your Netlify function URL here
const twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
let twitchAccessToken = '';




//store client id in chrome storage if this is the first time the extension is being used
chrome.storage.sync.get('clientId', function(data) {
  if (!data.clientId) {

    // Store the Twitch Client ID in Chrome storage
    chrome.storage.sync.set({ clientId: twitchClientId }, function() {
    if (chrome.runtime.lastError) {
        console.error('Error setting Twitch Client ID:', chrome.runtime.lastError);
        sendWarningToExtUser('Error setting Twitch Client ID: ' + chrome.runtime.lastError.message);
    }
    });
  }
  });

// Get Twitch Access Token from Chrome Storage or cookies if it's not found in storage, then the user is not logged in to Twitch yet.
// If the user is logged in to Twitch, the Access Token is stored in Chrome storage.


chrome.storage.sync.get('twitchAccessToken', function(data) {
  twitchAccessToken = data.twitchAccessToken;
  if (!twitchAccessToken) {
    console.log('No Twitch Access Token found in Chrome storage');
    // If no Twitch Access Token is found in Chrome storage, try to get one from the cookies
    chrome.cookies.get({
        url: 'https://www.twitch.tv',
        name: 'twitchAccessToken'
        }, function(cookie) {
        if (cookie) {
            console.log('Twitch Access Token found in cookies:', cookie.value);
            twitchAccessToken = cookie.value;
            // Store the Twitch Access Token in Chrome storage
            chrome.storage.sync.set({ twitchAccessToken: twitchAccessToken }, function() {
                if (chrome.runtime.lastError) {
                console.error('Error setting Twitch Access Token:', chrome.runtime.lastError);
                sendWarningToExtUser('Error setting Twitch Access Token: ' + chrome.runtime.lastError.message);
                }
            });
        } else {
            // If no Twitch Access Token is found in the cookies this means the user is not logged in to Twitch
            console.log('No Twitch Access Token found in cookies');
        }
        }
    );
    } else {
    console.log('Twitch Access Token found in Chrome storage:', twitchAccessToken);
    } 
});


// Handle the login and logout of the user
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.type === 'checkTwitchLogin') {
        await checkTwitchLogin(sendResponse);
        return true; // Needed to make the sendResponse asynchronous
        
      } else if (request.type === 'twitchLogin') {
        await twitchLogin(sendResponse);
        return true; // Needed to make the sendResponse asynchronous
    } else if (request.type === 'twitchLogout') {
        twitchLogout(sendResponse);
        return true; // Needed to make the sendResponse asynchronous
    }
});

// Function to log the user in to Twitch
async function twitchLogin(sendResponse) {
    // Get the client ID
    const clientId = twitchClientId;
    // Generate a random string for the state parameter

    // Save the state and nonce in storage
    await initiateTwitchOAuth(clientId);
    // Send a response
    sendResponse({ loggedIn: true});
}

// Function to log the user out of Twitch
function twitchLogout(sendResponse) {
    // Remove the access token from storage
    chrome.storage.sync.remove(['twitchAccessToken'], function() {
        if (chrome.runtime.lastError) {
            console.error('Error removing access token:', chrome.runtime.lastError);
            sendResponse({ error: 'Error removing access token: ' + chrome.runtime.lastError.message });
            return;
        }
        // Send a message to the content script to reload the page
        chrome.tabs.sendMessage(sender.tab.id, { type: 'reloadPage' });
        // Send a response
        sendResponse({});
    });
}

// Function to check if the user is logged in to Twitch
export async function checkTwitchLogin(sendResponse) {
    chrome.storage.sync.get(['twitchAccessToken'], function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading Twitch access token:', chrome.runtime.lastError);
        sendResponse({loggedIn : false});
        return;
      }
      const twitchAccessToken = data.twitchAccessToken;
      if (!twitchAccessToken) {
        sendResponse({loggedIn : false});
        return;
      }
      // Decrypt the access token using the encryption key
      chrome.storage.sync.get(['encryptionKey'], function(data) {
        if (chrome.runtime.lastError) {
          console.error('Error loading encryption key:', chrome.runtime.lastError);
          sendResponse({ error: 'Error loading encryption key: ' + chrome.runtime.lastError.message, loggedIn: false });
          return;
        }
        const encryptionKey = data.encryptionKey;
        if (!encryptionKey) {
          console.error('Error: Encryption key not found');
          sendResponse({loggedIn : false});
          return;
        }
        const twitchAccessToken = decrypt(twitchAccessToken, encryptionKey);
        // Check if the access token is still valid
        fetch('https://id.twitch.tv/oauth2/validate', {
          headers: {
            'Authorization': `OAuth ${twitchAccessToken}`
          }
        }).then(response => {
          if (response.status === 401) {
            // Access token is invalid, so remove it from storage
            chrome.storage.sync.remove(['twitchAccessToken'], function() {
              if (chrome.runtime.lastError) {
                console.error('Error removing Twitch access token:', chrome.runtime.lastError);
                sendResponse({ error: 'Error removing Twitch access token: ' + chrome.runtime.lastError.message, loggedIn: false });
                return;
              }
              sendResponse({loggedIn : false});
            });
          } else {
            sendResponse({loggedIn : true});

          }
        }).catch(error => {
          console.error('Error validating Twitch access token:', error);
          sendResponse({ error: 'Error validating Twitch access token: ' + error.message,loggedIn: false });
          
        });
      });
    });
}

 

    // Function to initiate the Twitch OAuth flow
    
export async function initiateTwitchOAuth(clientId) {
    try {
        // twitch access token using a netlify function
        const response = await fetch('https://twitch-oauth.netlify.app/.netlify/functions/twitch-oauth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientId: clientId })
        });
        if (!response.ok) {
            throw new Error('Error getting Twitch access token: ' + response.statusText);
        }
        const data = await response.json();
        const encryptedAccessToken = data.access_token;
        // Store the encrypted access token in storage
        chrome.storage.sync.set(['twitchAccessToken'], function() {
            if (chrome.runtime.lastError) {
                console.error('Error setting Twitch access token:', chrome.runtime.lastError);
                sendResponse({ error: 'Error setting Twitch access token: ' + chrome.runtime.lastError.message, loggedIn: false });
                return;
            }
              storeInCookies(encryptedAccessToken);
              // Send a message to the content script to reload the page
              chrome.tabs.sendMessage(sender.tab.id, { type: 'reloadPage' });
              // Send a response
              sendResponse({ loggedIn: true });
            });
        } catch (error) {
          console.error('Error getting Twitch access token:', error);
          displayError('Error getting Twitch access token: ' + error.message);
          sendResponse({ error: 'Error getting Twitch access token: ' + error.message, loggedIn: false });
      }
  }


  //Store the access token securely in Chrome's sync storage
  export function storeInCookies(encryptedAccessToken){
    chrome.cookies.set({
    url: 'https://www.twitch.tv',
    name: 'twitchaccessToken',
    value: encryptedAccessToken,
    secure: true,
    httpOnly: true
  }, function(cookie) {
    if (chrome.runtime.lastError) {
      console.error('Error setting access token cookie:', chrome.runtime.lastError);
      displayError('Error setting access token cookie: ' + chrome.runtime.lastError.message);
    }
  });
  }

  function fetchChatMessages(channel) {
    return new Promise((resolve, reject) => {
      const url = `https://tmi.twitch.tv/api/rooms/${channel}/recent_messages`;
      fetch(url)
      .then(response => response.json())
      .then(data => {
        const messages = data.messages.map(message => message.message.body);
        resolve(messages);
      })
      .catch(error => reject(error));
    });
  }

  