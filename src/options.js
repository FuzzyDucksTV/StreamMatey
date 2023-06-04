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

    async function loadPreferences() {
        //Send a message to the background script to load the preferences. The background script will send a response with the preferences
        chrome.runtime.sendMessage({ type: 'loadPreferences' }, function (response) {
            if (response.error) {
                console.error('Error loading preferences:', response.error);
                displayError('Error loading preferences: ' + response.error);
            } else if (response.preferences) {
                // Preferences loaded successfully
                console.log('Preferences loaded successfully');
                // Set the preferences
                const preferences = response.preferences;
                if (preferences.darkMode) {
                    document.body.classList.add('dark');
                    themeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark');
                    themeToggle.checked = false;
                }

                for (let feature in preferences) {
                    if (preferences[feature].enabled) {
                        features[feature].toggle.checked = true;
                    } else {
                        features[feature].toggle.checked = false;
                    }

                    for (let option in preferences[feature].options) {
                        let input = features[feature][option];
                        if (input.type === 'checkbox') {
                            input.checked = preferences[feature].options[option];
                        } else if (input.type === 'range') {
                            input.value = preferences[feature].options[option];
                        } else {
                            input.value = preferences[feature].options[option];
                        }
                    }    
        

            }
            } else {
                console.log("No preferences saved");
                // No preferences saved, so set the default preferences
                setDefaultPreferences();
                }
        });
    };

    loadPreferences();


        

// Function to save preferences
    const savePreferences = () =>{
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

            // Send the unencrypted preferences to the background script to save
            chrome.runtime.sendMessage({ type: 'savePreferences', preferences: unencryptedPreferences }, function (response) {
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
        chrome.runtime.sendMessage({type: 'initiateTwitchOAuth', clientId: '1' }, function(response) {
            if (response.error) {
                console.error('Error initiating Twitch OAuth:', response.error);
                displayError('Error initiating Twitch OAuth: ');
            } else {
                console.log('Twitch OAuth initiated successfully')
            }
        });
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
                if (preferences.darkMode) {
                    document.body.classList.add('dark');
                    themeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark');
                    themeToggle.checked = false;
                }

                for (let feature in preferences) {
                    if (preferences[feature].enabled) {
                        features[feature].toggle.checked = true;
                    } else {
                        features[feature].toggle.checked = false;
                    }

                    for (let option in preferences[feature].options) {
                        let input = features[feature][option];
                        if (input.type === 'checkbox') {
                            input.checked = preferences[feature].options[option];
                        } else if (input.type === 'range') {
                            input.value = preferences[feature].options[option];
                        } else {
                            input.value = preferences[feature].options[option];
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

