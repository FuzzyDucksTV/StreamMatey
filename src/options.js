document.addEventListener('DOMContentLoaded', (event) => {
    const features = {
        sentiment: {
            enableSentimentAnalysis: document.getElementById('sentimentToggle'),
            sensitivity: document.getElementById('sentimentSensitivity'),
            showTopScorersToggle: document.getElementById('showTopScorersToggle'),
            showBottomScorersToggle: document.getElementById('showBottomScorersToggle'),
            leaderboardToggle: document.getElementById('leaderboardToggle'),
            showTopScorers: document.getElementById('showTopScorers'),
            showBottomScorers: document.getElementById('showBottomScorers'),
            leaderboardDuration: document.getElementById('leaderboardDuration')
        },
        toxicity: {
            enableToxicityDetection: document.getElementById('toxicityToggle'),
            customMessageToxicUser: document.getElementById('toxicityMessage'),
            modNotificationToggle: document.getElementById('modNotificationToggle'),
            selfNotificationToggle: document.getElementById('toxicitySelfNotificationToggle'),
            modMessage: document.getElementById('toxicityModMessage'),
            selfMessage: document.getElementById('toxicitySelfMessage'),
            toxicityThreshold: document.getElementById('toxicitySensitivity'),
            showTopScorersToggle: document.getElementById('showTopScorersToggle'),
            showBottomScorersToggle: document.getElementById('showBottomScorersToggle'),
            leaderboardToggle: document.getElementById('leaderboardToggle'),
            showTopScorers: document.getElementById('showTopScorers'),
            showBottomScorers: document.getElementById('showBottomScorers'),
            leaderboardDuration: document.getElementById('leaderboardDuration')
        },
        darkMode: {
            darkMode: document.getElementById('darkModeToggle')
        },
    };
 
    const themeToggle = document.getElementById('darkModeToggle');
    const twitchLoginButton = document.getElementById('twitchLoginButton');
    const twitchLogoutButton = document.getElementById('twitchLogoutButton');

    function displayError(message) {
        const errorMessageElement = document.getElementById('error-message');
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';

        setTimeout(() => {
            errorMessageElement.style.display = 'none';
        }
        , 5000);
    }

// Function to load preferences
function loadPreferences() {
    chrome.runtime.sendMessage({type: 'loadPreferences'}, function(response) {
        if (response.error) {
            console.error('Error loading preferences:', response.error);
            displayError('Error loading preferences: ' + response.error);
        }
        const decryptedPreferences = response.preferences;
        if (preferences)
        {
            console.log("Preferences loaded");
            // Set the preferences on the options page
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
        const unencryptedPreferences = preferences;

        // Send the encrypted preferences to the background script to save
        chrome.runtime.sendMessage({type: 'savePreferences', preferences: unencryptedPreferences}, function(response) {
            if (response.error) {
                console.error('Error saving preferences:', response.error);
                displayError('Error saving preferences: ' + response.error);
            } else {
                console.log('Preferences saved successfully');
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

//Check if the user is logged in to Twitch
    chrome.runtime.sendMessage({type: 'checkTwitchLogin'}, function(data) {
        if (data.error) {
            console.error('Error checking Twitch login:', data.error);
            displayError('Error checking Twitch login: ' + data.error);
        } else if (data.loggedIn) {
            // The user is logged in to Twitch
            // Hide the login button and show the logout button
            twitchLoginButton.style.display = 'none';
            let twitchLogoutButton = document.createElement('button');
            twitchLogoutButton.innerText = 'Logout from Twitch';
            document.getElementById('twitchAuth').appendChild(twitchLogoutButton);
            // Add event listener to logout button
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
         if (request.type === 'warning') {
            displayError(request.message);
        } else if (request.type === 'error') {
            displayError(request.message);
        } else if (request.type === 'preferences') {
            const preferences = request.preferences;
            if (preferences) {
                // Decrypt the preferences using the encryption key
                const decryptedPreferences = preferences;

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
});

