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
    const googleLoginButton = document.getElementById('googleLoginButton');
    const twitchLoginButton = document.getElementById('twitchLoginButton');

    function displayError(message) {
        const errorMessageElement = document.getElementById('error-message');
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }

    chrome.storage.sync.get(['preferences'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading preferences:', chrome.runtime.lastError);
            displayError('Error loading preferences: ' + chrome.runtime.lastError.message);
            return;
        }

        const preferences = data.preferences;

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
    });

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

        chrome.storage.sync.set({ preferences }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving preferences:', chrome.runtime.lastError);
                displayError('Error saving preferences: ' + chrome.runtime.lastError.message);
            }
        });
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        savePreferences();
    });
    googleLoginButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({type: 'initiateGoogleOAuth'});
    });

    twitchLoginButton.addEventListener('click', () => {
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

    chrome.storage.sync.get(['googleAccessToken', 'twitchAccessToken'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading access tokens:', chrome.runtime.lastError);
            displayError('Error loading access tokens: ' + chrome.runtime.lastError.message);
            return;
        }

        if (data.googleAccessToken) {
            googleLoginButton.style.display = 'none';
            let googleLogoutButton = document.createElement('button');
            googleLogoutButton.innerText = 'Logout from Google';
            document.getElementById('googleAuth').appendChild(googleLogoutButton);

            googleLogoutButton.addEventListener('click', () => {
                chrome.storage.sync.remove('googleAccessToken', function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error removing Google access token:', chrome.runtime.lastError);
                        displayError('Error removing Google access token: ' + chrome.runtime.lastError.message);
                    } else {
                        googleLoginButton.style.display = 'block';
                        googleLogoutButton.remove();
                    }
                });
            });
        }

        if (data.twitchAccessToken) {
            twitchLoginButton.style.display = 'none';
            let twitchLogoutButton = document.createElement('button');
            twitchLogoutButton.innerText = 'Logout from Twitch';
            document.getElementById('twitchAuth').appendChild(twitchLogoutButton);

            twitchLogoutButton.addEventListener('click', () => {
                chrome.storage.sync.remove('twitchAccessToken', function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error removing Twitch access token:', chrome.runtime.lastError);
                        displayError('Error removing Twitch access token: ' + chrome.runtime.lastError.message);
                    } else {
                        twitchLoginButton.style.display = 'block';
                        twitchLogoutButton.remove();
                    }
                });
            });
        }
    });
});
