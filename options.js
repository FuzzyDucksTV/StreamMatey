document.addEventListener('DOMContentLoaded', (event) => {
    const features = {
        sentiment: {
            toggle: document.getElementById('sentimentToggle'),
            sensitivity: document.getElementById('sentimentSensitivity'),
            sensitivityValue: document.getElementById('sentimentSensitivityValue'),
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
                        features[feature].sensitivityValue.textContent = input.value;
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

    const loginButton = document.getElementById('loginButton');

    loginButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({type: 'initiateOAuth'});
    });

    for (let feature in features) {
        features[feature].toggle.addEventListener('change', savePreferences);
        for (let option in features[feature]) {
            if (option !== 'toggle') {
                let input = features[feature][option];
                input.addEventListener('input', () => {
                    if (input.type === 'range') {
                        features[feature].sensitivityValue.textContent = input.value;
                    }
                    savePreferences();
                });
            }
        }
    }

    chrome.storage.sync.get(['accessToken'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading access token:', chrome.runtime.lastError);
            displayError('Error loading access token: ' + chrome.runtime.lastError.message);
            return;
        }

        if (data.accessToken) {
            loginButton.style.display = 'none';
            let logoutButton = document.createElement('button');
            logoutButton.innerText = 'Logout';
            document.getElementById('twitchAuth').appendChild(logoutButton);

            logoutButton.addEventListener('click', () => {
                chrome.storage.sync.remove('accessToken', function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error removing access token:', chrome.runtime.lastError);
                        displayError('Error removing access token: ' + chrome.runtime.lastError.message);
                    } else {
                        loginButton.style.display = 'block';
                        logoutButton.remove();
                    }
                });
            });
        }
    });
});
