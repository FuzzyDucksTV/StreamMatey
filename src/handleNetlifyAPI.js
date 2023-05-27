// Description: Functions to handle Netlify API calls
//

// Imports
import { displayError } from './errorHandling.js';
import { storeInCookies } from './handleTwitchLoginLogout.js';
    


// Function declaration statement
export default function getNetlifyFunctionUrl(actionChosen) {
    const functionUrls = {
      getEncryptionKey: "https://myfunction.netlify.app/.netlify/functions/getEncryptionKey",
      getTwitchAccessToken: "https://myfunction.netlify.app/.netlify/functions/getTwitchAccessToken",
      getTwitchClientId: "https://myfunction.netlify.app/.netlify/functions/getTwitchClientId",
      getTwitchRefreshToken: "https://myfunction.netlify.app/.netlify/functions/getTwitchRefreshToken",
      getTwitchUserName: "https://myfunction.netlify.app/.netlify/functions/getTwitchUserName",
      getTwitchUserStreamingChannel: "https://myfunction.netlify.app/.netlify/functions/getTwitchUserStreamingChannel"
    };
  
    const netlifyFunctionUrl = functionUrls[actionChosen];
    if (!netlifyFunctionUrl) {
      console.error('Error: Netlify function URL not found');
      // Remove or define the `displayError()` function
      return;
    }
  
    return netlifyFunctionUrl;
  }
  function getExtensionIdofChromeExtension() {
    //Get the extension ID of the Chrome extension
    return chrome.runtime.id;
  }

// Function to get the Twitch access token from the Twitch OAuth function
export async function getTwitchAccessToken( ) {
    try {
      const netlifyFunctionUrl = getNetlifyFunctionUrl('getTwitchAccessToken');
        // Get the Twitch access token from the netlify API function
        const response = await fetch(netlifyFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            extensionId: chrome.runtime.id
          })
        });
  
      if (!response.ok) {
        throw new Error('Error initiating Twitch OAuth: Invalid response');
      }
  
      const responseData = await response.json();
      const twitchAccessToken = responseData.data.twitchAccessToken;
  
      if (!twitchAccessToken) {
        throw new Error('Error initiating Twitch OAuth: No access token returned');
      } else {
        storeInCookies(twitchAccessToken);
        chrome.storage.sync.set({ twitchAccessToken }, function () {
          if (chrome.runtime.lastError) {
            console.error('Error storing Twitch access token:', chrome.runtime.lastError);
            displayError('Error storing Twitch access token: ' + chrome.runtime.lastError.message);
          }
        });
      }
    } catch (error) {
      console.error('Error initiating Twitch OAuth:', error);
      displayError('Error initiating Twitch OAuth: ' + error.message);
    }
  }
  