// Description: Functions to handle Netlify API calls
//

// Imports
import { displayError } from './errorHandling.js';
import { storeInCookies } from './handleTwitchLoginLogout.js';



// Function declaration statement
export function getNetlifyFunctionUrl() {
    // Replace `chrome.runtime.getManifest()` with the URL of the Twitch OAuth function
    const netlifyFunctionUrl = "https://myfunction.netlify.app/.netlify/functions/twitchOAuth";
    if (!netlifyFunctionUrl) {
      console.error('Error: Netlify function URL not found');
      // Remove or define the `displayError()` function
      return;
    }
    return netlifyFunctionUrl;
  }

// Function to get the Twitch access token from the Twitch OAuth function
export async function getTwitchAccessToken(clientId) {
    try {
        //Get access token from netlify function
        const netlifyFunctionUrl = await getNetlifyFunctionUrl();
        const response = await jQuery.ajax({
            url: netlifyFunctionUrl,
            type: 'GET',
            data: { clientId: clientId },
            dataType: 'json'
        });
        if (!response) {
            throw new Error('Error initiating Twitch OAuth: No response received');
        }

        const twitchAccessToken = response.data.twitchAccessToken;
        if (!twitchAccessToken) {
            throw new Error('Error initiating Twitch OAuth: No access token returned');
        } else {
            storeInCookies(twitchAccessToken);
            // Store the encrypted access token securely in Chrome's sync storage
            chrome.storage.sync.set({ twitchAccessToken: twitchAccessToken }, function() {
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

