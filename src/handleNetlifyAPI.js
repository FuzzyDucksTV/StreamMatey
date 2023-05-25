// Description: Functions to handle Netlify API calls
//

// Function declaration statement
function getNetlifyFunctionUrl() {
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
async function getTwitchAccessToken(clientId) {
    try {
        //Get access token from netlify function
        const netlifyFunctionUrl = await getNetlifyFunctionUrl();
        const response = await axios.get(netlifyFunctionUrl + '/twitch-oauth' + '?client_id=' + clientId);
        if (response.status !== 200) {
            throw new Error(`Error initiating Twitch OAuth: HTTP ${response.status}`);
        }
        const accessToken = response.data.access_token;
        if (!accessToken) {
            throw new Error('Error initiating Twitch OAuth: No access token returned');
        }

        // Encrypt the access token using the encryption key
        chrome.storage.sync.get(['encryptionKey'], function(data) {
            if (chrome.runtime.lastError) {
                console.error('Error loading encryption key:', chrome.runtime.lastError);
                displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
                return;
            }
            const encryptionKey = data.encryptionKey;
            if (!encryptionKey) {
                console.error('Error: Encryption key not found');
                displayError('Error: Encryption key not found');
                return;
            }
            const encryptedAccessToken = encrypt(accessToken, encryptionKey);
            storeInCookies(encryptedAccessToken);
            // Store the encrypted access token securely in Chrome's sync storage
            chrome.storage.sync.set({ twitchAccessToken: encryptedAccessToken }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error storing Twitch access token:', chrome.runtime.lastError);
                    displayError('Error storing Twitch access token: ' + chrome.runtime.lastError.message);
                }
            });
        });
    } catch (error) {
        console.error('Error initiating Twitch OAuth:', error);
        displayError('Error initiating Twitch OAuth: ' + error.message);
    }
}

// Function to display error messages
function displayError(message) {
    console.error(message);
    // You can also display the error message to the user in some way
    
    // Send a notification to the user
    chrome.notifications.create(
        'errorNotification',
        {
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Twitch Chat Filter',
            message: message
        }
        );
  }