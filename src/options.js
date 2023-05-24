document.addEventListener('DOMContentLoaded', (event) => {
    const features = {
        sentiment: {
            toggle: document.getElementById('sentimentToggle'),
            sensitivity: document.getElementById('sentimentSensitivity'),
            showTopScorers: document.getElementById('showTopScorers'),
            showBottomScorers: document.getElementById('showBottomScorers'),
            leaderboardDuration: document.getElementById('leaderboardDuration')
        },
        toxicity: {
            toggle: document.getElementById('toxicityToggle'),
            message: document.getElementById('toxicityMessage'),
            modNotification: document.getElementById('toxicityModNotification'),
            selfNotification: document.getElementById('toxicitySelfNotification'),
            modMessage: document.getElementById('toxicityModMessage'),
            selfMessage: document.getElementById('toxicitySelfMessage')
        }
    };

    const themeToggle = document.getElementById('themeToggle');
    const twitchLoginButton = document.getElementById('twitchLoginButton');
    function sendWarningToExtUser(warningMessage) {
        // Display the warning message to the extension user
       //Send a message to the background script to display the warning message.
         chrome.runtime.sendMessage({type: 'warning', message: warningMessage});
    }
    
    function displayError(message) {
        const errorMessageElement = document.getElementById('error-message');
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }
    function loadEncryptionKey() {
        // Load the encryption key when the options page starts
        chrome.runtime.sendMessage({type: 'loadEncryptionKey'}, function(data) {
            if (data.error) {
                console.error('Error loading encryption key:', data.error);
                displayError('Error loading encryption key: ' + data.error);
                return;
            }

            const preferences = data.preferences;
            const encryptionKey = data.encryptionKey;
    
            if (preferences && encryptionKey) {
                // Decrypt the preferences using the encryption key
                const decryptedPreferences = decrypt(preferences, encryptionKey);
    
                if (decryptedPreferences.darkMode) {
                    document.body.classList.add('dark');
                    themeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark');
                    themeToggle.checked = false;
                }
    
                for (let feature in decryptedPreferences) {
                    if (decryptedPreferences[feature].enabled) {
                        features[feature].toggle.checked = true;
                    } else {
                        features[feature].toggle.checked = false;
                    }
    
                    for (let option in decryptedPreferences[feature].options) {
                        let input = features[feature][option];
                        if (input.type === 'checkbox') {
                            input.checked = decryptedPreferences[feature].options[option];
                        } else if (input.type === 'range') {
                            input.value = decryptedPreferences[feature].options[option];
                        } else {
                            input.value = decryptedPreferences[feature].options[option];
                        }
                    }
                }
            }
        });
    }

    let encryptionKey = null;

    function checkEncryptionKeyexists() {
        chrome.runtime.sendMessage({type: 'checkEncryptionKeyExists'}, function(data) {
            if (data.error) {
                console.error('Error checking if encryption key exists:', data.error);
                displayError('Error checking if encryption key exists: ' + data.error);
                return;
            }

            if (!data.exists) {
                setTimeout(5000); // Wait 5 seconds before checking again
                generateEncryptionKey(); // Generate a new encryption key
            } else {
                loadEncryptionKey(); // Load the encryption key
                setTimeout(5000) // Wait 5 seconds before checking again
            }
        });
    }

    checkEncryptionKeyexists(); // Check if the encryption key exists when the options page starts


// Function to generate an encryption key
function generateEncryptionKey() {
    chrome.runtime.sendMessage({type: 'generateEncryptionKey'}, function(response) {
        if (response.error) {
            console.error('Error generating encryption key:', response.error);
            displayError('Error generating encryption key: ' + response.error);
        }

 
    });
}

// Function to load preferences
function loadPreferences() {
    chrome.runtime.sendMessage({type: 'loadPreferences'}, function(response) {
        if (response.error) {
            console.error('Error loading preferences:', response.error);
            displayError('Error loading preferences: ' + response.error);
        }
        
        const preferences = response.preferences;
        const encryptionKey = response.encryptionKey;
        
        if (preferences && encryptionKey) {
            // Decrypt the preferences using the encryption key
            const decryptedPreferences = decrypt(preferences, encryptionKey);

            if (decryptedPreferences.darkMode) {
                document.body.classList.add('dark');
                themeToggle.checked = true;
            } else {
                document.body.classList.remove('dark');
                themeToggle.checked = false;
            }

            for (let feature in decryptedPreferences) {
                if (decryptedPreferences[feature].enabled) {
                    features[feature].toggle.checked = true;
                } else {
                    features[feature].toggle.checked = false;
                }

                for (let option in decryptedPreferences[feature].options) {
                    let input = features[feature][option];
                    if (input.type === 'checkbox') {
                        input.checked = decryptedPreferences[feature].options[option];
                    } else if (input.type === 'range') {
                        input.value = decryptedPreferences[feature].options[option];
                    } else {
                        input.value = decryptedPreferences[feature].options[option];
                    }
                }
            }
        }
    });
}

// Load the user's preferences when the options page starts
loadPreferences();



// Function to save preferences
    function savePreferences() {
        let preferences = {
            darkMode: themeToggle.checked
        };

        for (let feature in features) {
            preferences[feature] = {
                enabled: features[feature].toggle.checked,
                options: {}
            };

            for (let option in features[feature]) {
                if (option !== 'toggle') {
                    let input = features[feature][option];
                    if (input.type === 'checkbox') {
                        preferences[feature].options[option] = input.checked;
                    } else {
                        preferences[feature].options[option] = input.value;
                    }
                }
            }
        }

        // Encrypt the preferences using the encryption key
        const encryptedPreferences = encrypt(preferences, encryptionKey);

        // Send the encrypted preferences to the background script to save
        chrome.runtime.sendMessage({type: 'savePreferences', preferences: encryptedPreferences}, function(response) {
            if (response.error) {
                console.error('Error saving preferences:', response.error);
                displayError('Error saving preferences: ' + response.error);
            }
        });
    }
    

    themeToggle.addEventListener('change',() => {
        if (themeToggle.checked) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        savePreferences();
    });

    twitchLoginButton.addEventListener('click', () => {
        // Initiate OAuth flow with Twitch via Netlify function
        chrome.runtime.sendMessage({type: 'initiateTwitchOAuth'});

        
    });

    for (let feature in features) {
        features[feature].toggle.addEventListener('change', savePreferences);
        for (let option in features[feature]) {
            if (option !== 'toggle') {
                let input = features[feature][option];
                input.addEventListener('input', () => {
                    savePreferences();
                });
            }
        }
    }

    //get twitch access token
    chrome.runtime.sendMessage({type: 'getTwitchAccessToken'}, function(data) {
        if (data.error) {
            console.error('Error getting Twitch access token:', data.error);
            displayError('Error getting Twitch access token: ' + data.error);
            return;
        }
    });

    //get the encryption key
    chrome.runtime.sendMessage({type: 'getEncryptionKey'}, function(data) {
        if (data.error) {
            console.error('Error getting encryption key:', data.error);
            displayError('Error getting encryption key: ' + data.error);
            return;
        }
    });


        if (data.twitchAccessToken && data.encryptionKey) {
            const decryptedAccessToken = decrypt(data.twitchAccessToken, data.encryptionKey);
            twitchLoginButton.style.display = 'none';
            let twitchLogoutButton = document.createElement('button');
            twitchLogoutButton.innerText = 'Logout from Twitch';
            document.getElementById('twitchAuth').appendChild(twitchLogoutButton);

            twitchLogoutButton.addEventListener('click', () => {
                chrome.runtime.sendMessage({type: 'removeTwitchAccessToken'}, function(data) {
                    
                    if (date.error) {
                        console.error('Error removing Twitch access token:', data.error);
                        displayError('Error removing Twitch access token: ');
                    } else {
                        twitchLoginButton.style.display = 'block';
                        twitchLogoutButton.remove();
                    }
                });
            });
        }
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'encryptionKey') {
            encryptionKey = request.key;
        } else if (request.type === 'twitchAccessToken') {
            const accessToken = request.accessToken;
            const encryptionKey = request.encryptionKey;

            
            // Save the access token and encryption key
            chrome.runtime.sendMessage({type: 'saveTwitchAccessToken', accessToken: accessToken, encryptionKey: encryptionKey}, function(response) {
                if (response.error) {
                    console.error('Error saving Twitch access token:', response.error);
                    displayError('Error saving Twitch access token: ' + response.error);
                } else {
                    twitchLoginButton.style.display = 'none';
                    let twitchLogoutButton = document.createElement('button');
                    twitchLogoutButton.innerText = 'Logout from Twitch';
                    document.getElementById('twitchAuth').appendChild(twitchLogoutButton);
                    
                    twitchLogoutButton.addEventListener('click', () => {
                        chrome.runtime.sendMessage({type: 'removeTwitchAccessToken'}, function(response) {
                            if (response.error) {
                                console.error('Error removing Twitch access token:', response.error);
                                displayError('Error removing Twitch access token: ' + response.error);
                            } else {
                                twitchLoginButton.style.display = 'block';
                                twitchLogoutButton.remove();
                            }
                        });
                    });
                }
            });
        } else if (request.type === 'warning') {
            displayError(request.message);
        } else if (request.type === 'error') {
            displayError(request.message);
        } else if (request.type === 'success') {
            const successMessageElement = document.getElementById('success-message');
            successMessageElement.textContent = request.message;
            successMessageElement.style.display = 'block';
        } else if (request.type === 'preferences') {
            const preferences = request.preferences;
            const encryptionKey = request.encryptionKey;

            if (preferences && encryptionKey) {
                // Decrypt the preferences using the encryption key
                const decryptedPreferences = decrypt(preferences, encryptionKey);

                if (decryptedPreferences.darkMode) {
                    document.body.classList.add('dark');
                    themeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark');
                    themeToggle.checked = false;
                }

                for (let feature in decryptedPreferences) {
                    if (decryptedPreferences[feature].enabled) {
                        features[feature].toggle.checked = true;
                    } else {
                        features[feature].toggle.checked = false;
                    }

                    for (let option in decryptedPreferences[feature].options) {
                        let input = features[feature][option];
                        if (input.type === 'checkbox') {
                            input.checked = decryptedPreferences[feature].options[option];
                        } else if (input.type === 'range') {
                            input.value = decryptedPreferences[feature].options[option];
                        } else {
                            input.value = decryptedPreferences[feature].options[option];
                        }
                    }
                }
            }
        } else {
            throw new Error(`Unknown message type: ${request.type}`);
        }
        

        return true; // Indicate that the response will be sent asynchronously

    });




// Encryption function
async function encrypt(data, jwk) {
    // Check if data is an object
    if (typeof data !== 'object') {
        console.error('Error: data to encrypt is not an object');
        sendWarningToExtUser('Error: data to encrypt is not an object');
        return null; // Return null or a default value
        }
    //send the data and jwk to the background script to encrypt
    chrome.runtime.sendMessage({type: 'encrypt', data: data, jwk: jwk}, function(response) {
        if (response.error) {
            console.error('Error encrypting data:', response.error);
            displayError('Error encrypting data: ' + response.error);
        }
    });
}


// Function to decrypt data
async function decrypt(data, jwk) {
    // Check if data is a string
    if (typeof data !== 'string') {
      console.error('Error: data to decrypt is not a string');
      sendWarningToExtUser('Error: data to decrypt is not a string');
      return null; // Return null or a default value
    }
   //send the data and jwk to the background script to decrypt
    chrome.runtime.sendMessage({type: 'decrypt', data: data, jwk: jwk}, function(response) {
        if (response.error) {
            console.error('Error decrypting data:', response.error);
            displayError('Error decrypting data: ' + response.error);
        }
    }
    );
    }

    