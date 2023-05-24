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

    function displayError(message) {
        const errorMessageElement = document.getElementById('error-message');
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }

    chrome.storage.sync.get(['preferences', 'encryptionKey'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading preferences:', chrome.runtime.lastError);
            displayError('Error loading preferences: ' + chrome.runtime.lastError.message);
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

        chrome.storage.sync.set({ preferences: encryptedPreferences}, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving preferences:', chrome.runtime.lastError);
                displayError('Error saving preferences: ' + chrome.runtime.lastError.message);
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
        chrome.cookies.set({
            url: 'https://www.twitch.tv',
            name: 'accessToken',
            value: decryptedAccessToken,
            secure: true,
            httpOnly: true
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

    chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading access tokens:', chrome.runtime.lastError);
            displayError('Error loading access tokens: ' + chrome.runtime.lastError.message);
            return;
        }

        if (data.twitchAccessToken && data.encryptionKey) {
            const decryptedAccessToken = decrypt(data.twitchAccessToken, data.encryptionKey);
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

// Check if encryption key already exists
chrome.storage.sync.get(['encryptionKey'], function(data) {
    if (chrome.runtime.lastError) {
        console.error('Error loading encryption key:', chrome.runtime.lastError);
        displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
        return;
    }

    if (!data.encryptionKey) {
        // Generate encryption key
        let key;
        window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        )
        .then(newKey => {
            key = newKey;
            // Convert key to a storable format
            return window.crypto.subtle.exportKey('jwk', key);
        })
        .then(exportedKey => {
            // Store key in chrome.storage.sync for future use
            chrome.storage.sync.set({ encryptionKey: exportedKey }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving encryption key:', chrome.runtimelastError);
                    displayError('Error saving encryption key: ' + chrome.runtime.lastError.message);
                }
            }); 
        })
        .catch(err => {
            console.error(err);
            displayError('Error generating encryption key: ' + err.message);
        });
    }
});

// Encryption function
async function encrypt(data, jwk) {
    // Import the JWK back to a CryptoKey
    const key = await window.crypto.subtle.importKey('jwk', jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

    let encoded = new TextEncoder().encode(JSON.stringify(data));
    let iv = window.crypto.getRandomValues(new Uint8Array(12));

    try {
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encoded
        );
       // Convert to Base64 and prepend IV for storage
       let encryptedStr = btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(encrypted)))));
       return btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, iv)))) + ',' + encryptedStr;
    } catch (err) {
        console.error(err);
        displayError('Error encrypting data: ' + err.message);
        throw err; // Propagate the error
    }
}

async function decrypt(data, jwk) {
    // Import the JWK back to a CryptoKey
    const key = await window.crypto.subtle.importKey('jwk', jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

    let parts = data.split(',');
        let iv = new Uint8Array(decodeURIComponent(escape(atob(parts[0]))).split('').map(c => c.charCodeAt(0)));
        let encrypted = new Uint8Array(decodeURIComponent(escape(atob(parts[1]))).split('').map(c => c.charCodeAt(0)));

    try {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encrypted
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (err) {
        console.error(err);
        displayError('Error decrypting data: ' + err.message);
        throw err; // Propagate the error
    }
}
});
