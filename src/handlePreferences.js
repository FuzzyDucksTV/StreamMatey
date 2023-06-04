     //imports
    import { sendWarningToExtUser } from './handleTwitchChatMessages.js';

        
  
        
     
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
            sendResponse({ preferences: preferences });
          });
        }

        
       // Set default values for the extension's preferences
     // function to set default values for the extension
    export function setDefaultPreferences() {

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
          },
          darkMode: {
              enableDarkMode: false,
          }
      };
          
      let preferences = { features: features };
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
export async function savePreferences(preferenceData, sendResponse) {
  

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
        },
      darkMode: {
        enableDarkMode: preferenceData.features.darkMode.enableDarkMode
        }
    }
  };
  // Store the preferences securely in Chrome's sync storage
  chrome.storage.sync.set({ preferences: preferences }, function() {
    if (chrome.runtime.lastError) {
        console.error('Error saving preferences:', chrome.runtime.lastError);
        sendWarningToExtUser('Error saving preferences:'+ chrome.runtime.lastError.message);
    }
  });
  sendResponse({ savePreferences: true });
}


          