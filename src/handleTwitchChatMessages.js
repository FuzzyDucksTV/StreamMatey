// Function to monitor Twitch chat
// Start monitoring Twitch chat when the extension is installed or updated and the user is logged in, and stop monitoring Twitch chat when the user is logged out.
       // Also, make sure the user is currently streaming before monitoring Twitch chat.
async function monitorTwitchChat() {
    try {
        // Get the Twitch client ID from Chrome's sync storage
        chrome.storage.sync.get(['twitchClientId'], function(data) {
            if (chrome.runtime.lastError) {
                console.error('Error loading Twitch client ID:', chrome.runtime.lastError);
                displayError('Error loading Twitch client ID: ' + chrome.runtime.lastError.message);
                return;
            }
            const twitchClientId = data.twitchClientId;
            if (!twitchClientId) {
                console.error('Error: Twitch client ID not found');
                displayError('Error: Twitch client ID not found');
                return;
            }
        });
        
      // Get the encrypted Twitch access token and encryption key from Chrome's sync storage
      chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], async function(data) {
        if (chrome.runtime.lastError) {
          console.error('Error loading Twitch access token or encryption key:', chrome.runtime.lastError);
          displayError('Error loading Twitch access token or encryption key: ' + chrome.runtime.lastError.message);
          return;
        }
        const encryptedAccessToken = data.twitchAccessToken;
        const encryptionKey = data.encryptionKey;
        if (!encryptedAccessToken || !encryptionKey) {
          console.error('Error: Twitch access token or encryption key not found');
          displayError('Error: Twitch access token or encryption key not found');
          return;
        }
        // Decrypt the Twitch access token using the encryption key
        const twitchAccessToken = await decrypt(encryptedAccessToken, encryptionKey);
        // Get the current Twitch channel
        const channel = await getCurrentChannel(twitchAccessToken, twitchClientId);
        // Configure the Twitch chat client
        const options = {
          options: { debug: true },
          connection: { reconnect: true },
  
          identity: { username: channel, password: `oauth:${twitchAccessToken}` },
          channels: [channel]
        };
        const client = new tmi.client(options);
        // Connect to the Twitch chat
        client.connect();
        // Listen for chat messages
        client.on('message', handleChatMessage);
      });
    } catch (error) {
      console.error('Error monitoring Twitch chat:', error);
      sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
    }
  }
  
// Function to handle Twitch chat messages
const handleChatMessage = async (channel, userstate, message, self) => {
    // Ignore messages from the bot itself
    if (self) return;
  
    // Variables to store the sentiment and toxicity scores
    let sentimentScore = null;
    let toxicityScore = null;
  
    try {
        if (enableSentimentAnalysis) {
            sentimentScore = await analyzeSentiment(message);
        }
        if (enableToxicityDetection) {
            toxicityScore = await analyzeToxicity(message);
        }
    } catch (error) {
        console.error('Error analyzing message:', error);
    }
  
    // Handle the message based on the sentiment and toxicity scores
    if (sentimentScore !== null && toxicityScore !== null) {
        handleBothScores(sentimentScore, toxicityScore, userstate.username);
        // Update the sentiment score in the UI
        updateSentimentScore(sentimentScore);
        updateToxicityScore(toxicityScore);

    } else if (sentimentScore !== null) {
        handleSentimentScore(sentimentScore, userstate.username);
        // Update the sentiment score in the UI
        updateSentimentScore(sentimentScore);

    } else if (toxicityScore !== null) {
        handleToxicityScore(toxicityScore, userstate.username);
        updateToxicityScore(toxicityScore);
    }
    // If neither sentiment analysis nor toxicity detection are enabled take no action
  }
  
  const handleBothScores = (sentimentScore, toxicityScore, username) => {
    if (sentimentScore < sentimentOptions.threshold && toxicityScore > toxicityOptions.threshold) {
        //if mods are online, send them a message (check if message mods is enabled)
        if (sendmessagetomods) {
            sendCustomMessagetoMods(username, customMessageToMods);
        }
        //if send custom message to toxic user is enabled, send them a message
        if (customMessageToxicUser) {
            sendCustomMessageToxicUser(username, customMessageToxic);
        }
        //if extention user has enabled toxicitySelfNotification send them a message
        if (toxicitySelfNotification) {
            sendWarningToExtUser(warningMessageToxic);
        }
    }
  }
  
  const handleSentimentScore = (sentimentScore, username) => {
    if (sentimentScore < sentimentOptions.threshold) {
        //takeAction(username);
    }
  }
  
  const handleToxicityScore = (toxicityScore, username) => {
    if (toxicityScore > toxicityOptions.threshold) {
        takeAction(username);
    }
  }
  
  const takeAction = (username) => {
    if (warningToxicUser) {
        sendWarning(username, warningMessageToxic);
    }
  
    if (customMessageToxicUser) {
        sendCustomMessage(username, customMessageToxic);
    }
    if (customMessageNegativeUser) {
        sendCustomMessage(username, customMessageNegative);
    }
    if (sendmessagetomods) {
        sendCustomMessage(username, customMessageToMods);
    }
  }
  
  function updateToxicityScore(toxicityScore) {
    // Send the toxicity score to the ContentScript.js, which will update the leaderboard and giger meter for toxicity.
    //calculate the toxicity score based on the score in storage and the score from the new message.
    //get the toxicity score from storage
    chrome.storage.sync.get(['toxicityScore'], function(data) {
        if (chrome.runtime.lastError) {
            //The score is not in storage, so set it to 0.
            chrome.storage.sync.set({ toxicityScore: 0 }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving toxicity score:', chrome.runtime.lastError);
                    displayError('Error saving toxicity score: ' + chrome.runtime.lastError.message);
                    return;
                }
            });
            return;
        } 
        //get the toxicity score from storage
        let toxicityScoreFromStorage = data.toxicityScore;
        //calculate the toxicity score based on the score in storage and the score from the new message.
        let toxicityScore = toxicityScoreFromStorage + toxicityScore;
        //update the toxicity score in storage
        chrome.storage.sync.set({ toxicityScore: toxicityScore }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving toxicity score:', chrome.runtime.lastError);
                displayError('Error saving toxicity score: ' + chrome.runtime.lastError.message);
                return;
            }
        });
    });


    chrome.runtime.sendMessage({
        type: 'toxicityScore',
        score: toxicityScore,
    });
}





  function updateSentimentScore(sentimentScore) {
    //calculate the sentiment score based on the score in storage and the score from the new message.
    //get the sentiment score from storage
    chrome.storage.sync.get(['sentimentScore'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading sentiment score:', chrome.runtime.lastError);
            displayError('Error loading sentiment score: ' + chrome.runtime.lastError.message);
            return;
        }
        //get the sentiment score from storage
        let sentimentScoreFromStorage = data.sentimentScore;
        //calculate the sentiment score based on the score in storage and the score from the new message.
        let sentimentScore = sentimentScoreFromStorage + sentimentScore;
        //update the sentiment score in storage
        chrome.storage.sync.set({ sentimentScore: sentimentScore }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving sentiment score:', chrome.runtime.lastError);
                displayError('Error saving sentiment score: ' + chrome.runtime.lastError.message);
                return;
            }
        });
    });

    chrome.runtime.sendMessage({
        type: 'sentimentScore',
        score: sentimentScore,
    });
    }
    // Function to get the sentiment score from storage
function getSentimentScoreStored(sendResponse) {
    chrome.storage.sync.get('sentimentScore', data => {
        let sentimentScore = data.sentimentScore;
        if (!sentimentScore) {
            sentimentScore = 0;
        }
        sendResponse({score: sentimentScore});
    });
}