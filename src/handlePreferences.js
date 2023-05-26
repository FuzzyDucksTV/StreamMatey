     //imports
        import { displayError } from './errorHandling.js';
        import { sendWarningToExtUser } from './handleTwitchChatMessages.js';
        import { encrypt } from './handleEncryption.js';
        import { decrypt } from './handleEncryption.js';
        
     
     // Function to get the user's preferences
     
     export function getPreferences(sendResponse) {
        chrome.storage.sync.get(['preferences'], function(data) {
          if (chrome.runtime.lastError) {
            console.error('Error loading preferences:', chrome.runtime.lastError);
            sendResponse({ error: 'Error loading preferences: ' + chrome.runtime.lastError.message });
          }
          const preferences = data.preferences;
          if (!preferences) {
            setDefaultPreferences();
            sendResponse({ preferences: defaultPreferences });
            return;
            }
          
          // Decrypt the preferences using the encryption key
          chrome.storage.sync.get(['encryptionKey'], function(data) {
            if (chrome.runtime.lastError) {
              console.error('Error loading encryption key:', chrome.runtime.lastError);
              sendResponse({ error: 'Error loading encryption key: ' + chrome.runtime.lastError.message });
              return;
            }
            const encryptionKey = data.encryptionKey;
            if (!encryptionKey) {
              console.error('Error: Encryption key not found');
              sendResponse({ error: 'Error: Encryption key not found' });
              return;
            }
            const decryptedPreferences = decrypt(preferences, encryptionKey);
            sendResponse({ preferences: decryptedPreferences });
          });
        });
        }
       // Set default values for the extension's preferences
     // function to set default values for the extension
    export async function setDefaultPreferences() {
        // Set default values for preferences
        let preferences = {};
        preferences.sentiment = {};
        preferences.toxicity = {};
        preferences.sentiment.options = {};
        preferences.toxicity.options = {};
        preferences.sentiment.options.leaderboard = {};
        preferences.toxicity.options.leaderboard = {};
        preferences.sentiment.options.leaderboard = {};
        
        let leaderboard = {};
        leaderboard.sentiment = [];
        leaderboard.toxicity = [];

        let chatHistory = {};
        chatHistory.sentiment = [];
        chatHistory.toxicity = [];

        let encryptionKey = null;

        // Set default values for the user's preferences
        preferences.sentiment.enabled = true;
        preferences.toxicity.enabled = true;
        preferences.sentiment.options.sensitivity = 0.5;
        preferences.toxicity.options.threshold = 0.5;
        preferences.toxicity.options.customMessagetoMods = "This message from {user} may be toxic.";
        preferences.toxicity.options.warningToxicUser = true;
        preferences.toxicity.options.customMessageToxicUser = "This user may be toxic. Please be respectful.";
        preferences.darkMode = false;
        preferences.sentiment.options.showLeaderboard = true; // top 3 scorers
        preferences.toxicity.options.showLeaderboard = true; // bottom 3 scorers
        preferences.sentiment.options.showTopScorers = true;
        preferences.toxicity.options.showBottomScorers = true;
        preferences.sentiment.options.message = 'This message from {user} may be negative.';
        preferences.toxicity.options.message = 'This message from {user} may be toxic.';
        preferences.sentiment.options.leaderboardDuration = 7;
        preferences.toxicity.options.leaderboardDuration = 7;
        preferences.sentiment.options.leaderboardSize = 6;
        preferences.toxicity.options.leaderboardSize = 6;
        preferences.sentiment.options.leaderboardType = 'top';
        preferences.toxicity.options.leaderboardType = 'bottom';

        // Set default values for the sentiment and toxicity scores
        sentimentScore = null;
        toxicityScore = null;

        // Set default values for the sentiment and toxicity options
        sentimentOptions = {};
        toxicityOptions = {};
        sentimentOptions.sensitivity = 0.5;
        toxicityOptions.threshold = 0.5;
        toxicityOptions.customMessagetoMods = "This message from {user} may be toxic.";
        toxicityOptions.warningToxicUser = true;

        // Set default values for the leaderboard options
        sentimentOptions.showLeaderboard = true;
        toxicityOptions.showLeaderboard = true;
        sentimentOptions.showTopScorers = true;
        toxicityOptions.showBottomScorers = true;
        sentimentOptions.message = 'This message from {user} may be negative.';
        toxicityOptions.message = 'This message from {user} may be toxic.';
        sentimentOptions.leaderboardDuration = 7;
        toxicityOptions.leaderboardDuration = 7;
        sentimentOptions.leaderboardSize = 6;
        toxicityOptions.leaderboardSize = 6;
        sentimentOptions.leaderboardType = 'top';
        toxicityOptions.leaderboardType = 'bottom';

        // Set default values for the leaderboard
        leaderboard.sentiment = [];
        leaderboard.toxicity = [];

        // Set default values for the chat history
        chatHistory.sentiment = [];
        chatHistory.toxicity = [];

        // Set default values for the encryption key
        encryptionKey = null;

        //Encrypt the preferences child values before storing them
        preferences.sentiment.options.customMessagetoMods = encrypt(preferences.sentiment.options.customMessagetoMods, encryptionKey);
        preferences.toxicity.options.customMessagetoMods = encrypt(preferences.toxicity.options.customMessagetoMods, encryptionKey);
        preferences.toxicity.options.customMessageToxicUser = encrypt(preferences.toxicity.options.customMessageToxicUser, encryptionKey);
        preferences.sentiment.options.message = encrypt(preferences.sentiment.options.message, encryptionKey);
        preferences.toxicity.options.message = encrypt(preferences.toxicity.options.message, encryptionKey);

        // Store the default values in Chrome's sync storage
        chrome.storage.sync.set({ preferences: preferences }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error setting preferences:', chrome.runtime.lastError);
                sendWarningToExtUser('Error setting preferences: ' + chrome.runtime.lastError.message);
            }
        }
        );
    }
 
        
        // Function to save the user's preferences
        export function savePreferences(preferenceData) {
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
              let preferences = {
                darkMode: preferenceData.darkMode,
                sentiment: {
                  enabled: preferenceData.sentiment.enabled,
                  options: {
                    sensitivity:    preferenceData.sentiment.options.sensitivity,
                    showTopScorers: preferenceData.sentiment.options.showTopScorers,
                    showBottomScorers: preferenceData.sentiment.options.showBottomScorers,
                    leaderboardDuration: preferenceData.sentiment.options.leaderboardDuration,
                    message: preferenceData.sentiment.options.message,
                    modNotification: preferenceData.sentiment.options.modNotification,
                    selfNotification: preferenceData.sentiment.options.selfNotification,
                    modMessage: preferenceData.sentiment.options.modMessage,
                    selfMessage: preferenceData.sentiment.options.selfMessage
                  }
                },
                toxicity: {
                    enabled: preferenceData.toxicity.enabled,
                    options: {
                        sensitivity:    preferenceData.toxicity.options.sensitivity,
                        showTopScorers: preferenceData.toxicity.options.showTopScorers,
                        showBottomScorers: preferenceData.toxicity.options.showBottomScorers,
                        leaderboardDuration: preferenceData.toxicity.options.leaderboardDuration,
                        message: preferenceData.toxicity.options.message,
                        modNotification: preferenceData.toxicity.options.modNotification,
                        selfNotification: preferenceData.toxicity.options.selfNotification,
                        modMessage: preferenceData.toxicity.options.modMessage,
                        selfMessage: preferenceData.toxicity.options.selfMessage
                }
                }
                };

              // Encrypt the preferences using the encryption key
              const encryptedPreferences = encrypt(preferences, encryptionKey);
              // Store the encrypted preferences securely in Chrome's sync storage
              chrome.storage.sync.set({preferences: encryptedPreferences}, function() {
                if (chrome.runtime.lastError) {
                  console.error('Error saving preferences:', chrome.runtime.lastError);
                  displayError('Error saving preferences: ' + chrome.runtime.lastError.message);
                }
              });
            });
          }
