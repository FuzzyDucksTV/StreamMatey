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
       

        const features = {
          sentiment: {
              enableSentimentAnalysis: true,
              sensitivity: 0.5,
              showTopScorersToggle: true,
              showBottomScorersToggle: true,
              leaderboardToggle: true,
              showTopScorers: 3,
              showBottomScorers: 3,
              leaderboardDuration: 7
          },
          toxicity: {
              enableToxicityDetection: true,
              customMessageToxicUser: "You may be toxic. Please be respectful.",
              modNotificationToggle: true,
              selfNotificationToggle: true,
              modMessage: "This message from {user} may be toxic.",
              selfMessage: "This message from {user} may be toxic.",
              toxicityThreshold: 0.5,
              showTopScorersToggle: true,
              showBottomScorersToggle: true,
              leaderboardToggle: true,
              showTopScorers: 3,
              showBottomScorers: 3,
              leaderboardDuration: 7
          },
          darkMode: {
              enableDarkMode: false,
          }

      };
      let preferences = { features: features };

        //Encrypt the preferences child values before storing them
        preferences = encrypt(preferences, encryptionKey);

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
                features: {
                  sentiment: {
                    enableSentimentAnalysis: preferenceData.features.sentiment.enableSentimentAnalysis,
                    sensitivity: preferenceData.features.sentiment.sensitivity,
                    showTopScorersToggle: preferenceData.features.sentiment.showTopScorersToggle,
                    showBottomScorersToggle: preferenceData.features.sentiment.showBottomScorersToggle,
                    leaderboardToggle: preferenceData.features.sentiment.leaderboardToggle,
                    showTopScorers: preferenceData.features.sentiment.showTopScorers,
                    showBottomScorers: preferenceData.features.sentiment.showBottomScorers,
                    leaderboardDuration: preferenceData.features.sentiment.leaderboardDuration
                    },
                  toxicity: {
                    enableToxicityDetection: preferenceData.features.toxicity.enableToxicityDetection,
                    customMessageToxicUser: preferenceData.features.toxicity.customMessageToxicUser,
                    modNotificationToggle: preferenceData.features.toxicity.modNotificationToggle,
                    selfNotificationToggle: preferenceData.features.toxicity.selfNotificationToggle,
                    modMessage: preferenceData.features.toxicity.modMessage,
                    selfMessage: preferenceData.features.toxicity.selfMessage,
                    toxicityThreshold: preferenceData.features.toxicity.toxicityThreshold,
                    showTopScorersToggle: preferenceData.features.toxicity.showTopScorersToggle,
                    showBottomScorersToggle: preferenceData.features.toxicity.showBottomScorersToggle,
                    leaderboardToggle: preferenceData.features.toxicity.leaderboardToggle,
                    showTopScorers: preferenceData.features.toxicity.showTopScorers,
                    showBottomScorers: preferenceData.features.toxicity.showBottomScorers,
                    leaderboardDuration: preferenceData.features.toxicity.leaderboardDuration
                    },
                  darkMode: {
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

          