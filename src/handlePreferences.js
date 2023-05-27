     //imports
        import { displayError } from './errorHandling.js';
        import { sendWarningToExtUser } from './handleTwitchChatMessages.js';
        import { encrypt, decrypt } from './handleEncryption.js';
  
        
     
     // Function to get the user's preferences
     
     export async function getPreferences(sendResponse) {
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
    export function setDefaultPreferences() {
        // Set default values for preferences
        let preferences = {};
        preferences.sentiment = {};
        preferences.toxicity = {};
        preferences.sentiment.options = {};
        preferences.toxicity.options = {};
        preferences.sentiment.options.leaderboard = {};
        preferences.toxicity.options.leaderboard = {};
        preferences.darkMode = false;

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
        preferences.toxicity.options.message = 'This message from {user} may be toxic.';
        preferences.sentiment.options.leaderboardDuration = 7;
        preferences.toxicity.options.leaderboardDuration = 7;
        preferences.sentiment.options.leaderboardSize = 6;
        preferences.toxicity.options.leaderboardSize = 6;
        preferences.sentiment.options.leaderboardType = 'top';
        preferences.toxicity.options.leaderboardType = 'bottom';



        //Encrypt the preferences child values before storing them
        preferences = encrypt(preferences, encryptionKey);
        leaderboard = encrypt(leaderboard, encryptionKey);
        chatHistory = encrypt(chatHistory, encryptionKey);

        // Store the default values in Chrome's sync storage
        chrome.storage.sync.set({ preferences: preferences, leaderboard: leaderboard, chatHistory: chatHistory }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error setting preferences:', chrome.runtime.lastError);
                sendWarningToExtUser('Error setting preferences:'+ chrome.runtime.lastError.message);
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

          