//imports
import { analyzeToxicity } from './handleToxicityAnalysis.js';
import { decrypt } from './handleEncryption.js';
import { displayError } from './errorHandling.js';
import background from './background.js';

let client = background.client;
function getCustomMessageMods() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['customMessageMods'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.customMessageMods);
            }
        });
    });
}

function getCustomMessageToUser() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['customMessageToUser'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.customMessageToUser);
            }
        });
    });
}

function getCustomMessageToxicityThreshold() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['customMessageToxicityThreshold'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.customMessageToxicityThreshold);
            }
        });
    });
}

function getCustomMessageSentimentThreshold() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['customMessageSentimentThreshold'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.customMessageSentimentThreshold);
            }
        });
    });
}


// Function to check if the user is logged in

function checkIfUserIsLoggedIn() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['twitchAccessToken'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                if (data.twitchAccessToken.length > 0) {
                resolve(true);
            }
        }
    });
});
}


//Get the twitchclientid from storage
function getTheTwitchClientIDfromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['twitchClientId'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.twitchClientId);
            }
        });
    });
}

// Function to monitor Twitch chat
// Start monitoring Twitch chat when the extension is installed or updated and the user is logged in, and stop monitoring Twitch chat when the user is logged out.
// Also, make sure the user is currently streaming before monitoring Twitch chat.
export const monitorTwitchChat = async () => {

    let userIsLoggedIn = await checkIfUserIsLoggedIn();
    let streamIsLive = await checkIfStreamIsLive();
    let monitorStarted = false;
    if (streamIsLive && userIsLoggedIn && (data.twitchAccessToken.length > 0 && data.encryptionKey.length > 0) && !monitorStarted) {
        try {
            getTheTwitchClientIDfromStorage().Promise.resolve(data.twitchAccessToken);
            getTheEncryptedTwitchAccessTokenfromStorage().Promise.resolve(data.twitchAccessToken);
            //check if the user is logged in
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
            let client = setClient(options);
            // Connect to the Twitch chat
            client.connect();
            setClientOnEventHandlers(client);
            console.log('Monitor started');
            
        } catch (error) {
            console.error(error);
            displayError(error);
            return;
        }
    }
};

//set the client
function setClient(options) {
    return new tmi.client(options);
}

//function to set the client on event handlers
function setClientOnEventHandlers(client) {
    client.on('connected', onConnectedHandler);
    client.on('disconnected', onDisconnectedHandler);
    client.on('message', handleChatMessage);
    client.on('cheer', handleCheerHandler);
    client.on('giftpaidupgrade', handleGiftPaidUpgradeHandler);
    client.on('subgift', handleSubGiftHandler);
    client.on('submysterygift', handleSubMysteryGiftHandler);
    client.on('subscription', handleSubscriptionHandler);
    client.on('primepaidupgrade', handlePrimePaidUpgradeHandler);
    client.on('rewardgift', handleRewardGiftHandler);
}
      


// add event listeners to monitor Twitch chat when the extension is installed or updated 
// and the user is logged in, and stop monitoring Twitch chat when the user is logged out
chrome.runtime.onStartup.addListener(monitorTwitchChat);
//add event listeners for client
client.on('connected', onConnectedHandler);
client.on('disconnected', onDisconnectedHandler);
client.on('cheer', onCheerHandler);
client.on('giftpaidupgrade', onGiftPaidUpgradeHandler);
client.on('subgift', onSubGiftHandler);
client.on('submysterygift', onSubMysteryGiftHandler);
client.on('subscription', onSubscriptionHandler);
client.on('primepaidupgrade', onPrimePaidUpgradeHandler);
client.on('rewardgift', onRewardGiftHandler);
client.on('ritual', onRitualHandler);
client.on('bitsbadgetier', onBitsBadgeTierHandler);

//function for ondisconnectedhandler
function onDisconnectedHandler(reason) {
    console.log(`Disconnected: ${reason}`);
    sendWarningToExtUser('Disconnected: ' + reason);
}



//Function for oncheerhandler
function onCheerHandler(channel, userstate, message) {
    console.log(`Cheer: ${userstate['display-name']} cheered ${userstate.bits} bits`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage, based on the number of bits cheered
            updateSentimentScore(userstate.bits);

            
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onGiftPaidUpgradeHandler
function onGiftPaidUpgradeHandler(channel, username, sender, userstate) {
    console.log(`Gift paid upgrade from ${username} to ${userstate['display-name']}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1
            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}


// Function for onsubgift
function onSubGiftHandler(channel, username, streakMonths, recipient, methods, userstate) {
    console.log(`Sub gift from ${username} to ${recipient}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1
            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onSubMysteryGiftHandler
function onSubMysteryGiftHandler(channel, username, numbOfSubs, methods, userstate) {
    console.log(`Sub mystery gift from ${username} for ${numbOfSubs} subs`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by how many subs were gifted * 10
            updateSentimentScore(numbOfSubs * 10);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onSubscriptionHandler
function onSubscriptionHandler(channel, username, method, message, userstate) {
    console.log(`Subscription from ${username}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1
            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onPrimePaidUpgradeHandler
function onPrimePaidUpgradeHandler(channel, username, methods, userstate) {
    console.log(`Prime paid upgrade from ${username}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1

            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onRewardGiftHandler
function onRewardGiftHandler(channel, username, rewardType, recipient, userstate) {
    console.log(`Reward gift from ${username} to ${recipient}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1
            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onRitualHandler
function onRitualHandler(channel, username, ritualType, userstate) {
    console.log(`Ritual from ${username}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1
            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}

// Function for onBitsBadgeTierHandler
function onBitsBadgeTierHandler(channel, username, threshold, userstate) {
    console.log(`Bits badge tier from ${username}`);

    //check if the user is streaming
    if (streamIsLive) {
        try {
            // Update the sentiment score that is in storage by 1
            updateSentimentScore(1);
        } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            sendWarningToExtUser('Error monitoring Twitch chat: ' + error.message);
        }
    }
}


// function to check if a stream is live
async function checkIfStreamIsLive() {
    
// Get the Twitch client ID from Chrome's sync storage
    let twitchClientId = await getTwitchClientId();
    if (!twitchClientId) {
        console.error('Error: Twitch client ID not found');
        displayError('Error: Twitch client ID not found');
        return;
    }

    // Check if the stream is live
    const streamIsLive = await getStreamIsLive(twitchClientId);
    // Disconnect from the Twitch chat
    return streamIsLive;
}

async function getCurrentChannel(twitchAccessToken, twitchClientId) {
    // Get the current Twitch user's user ID from chrome storage
    const userId = await getUserIdFromStorage();
    // Get the current Twitch user's channel
    const channel = await getChannel(userId, twitchClientId);
    return channel;
}

async function getTwitchClientId() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['twitchClientId'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            const twitchClientId = data.twitchClientId;
            if (!twitchClientId) {
                reject(new Error('Twitch client ID not found'));
            }
            resolve(twitchClientId);
        });
    });
}

async function getTwitchAccessToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['twitchAccessToken'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            const twitchAccessToken = data.twitchAccessToken;
            if (!twitchAccessToken) {
                reject(new Error('Twitch access token not found'));
            }
            resolve(twitchAccessToken);
        });
    });
}

async function getEncryptionKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['encryptionKey'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            const encryptionKey = data.encryptionKey;
            if (!encryptionKey) {
                reject(new Error('Encryption key not found'));
            }
            resolve(encryptionKey);
        });
    });
}

async function getChannel(userId, twitchClientId) {
    return new Promise((resolve, reject) => {
        const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`;
        const headers = {
            'Client-ID': twitchClientId 
        };
        fetch(url, { headers })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    reject(new Error(data.message));
                }
                const channel = data.data[0].broadcaster_name;
                if (!channel) {
                    reject(new Error('Twitch channel not found'));
                }
                resolve(channel);
            })
            .catch(error => reject(error));
    });
}

async function getStream(userId, twitchClientId) {
    return new Promise((resolve, reject) => {
        const url = `https://api.twitch.tv/helix/streams?user_id=${userId}`;
        const headers = {
            'Client-ID': twitchClientId
        };
        fetch(url, { headers })
            .then(response => response.json())  
            .then(data => {
                if (data.error) {
                    reject(new Error(data.message));
                }
                const stream = data.data[0];
                resolve(stream);
            })
            .catch(error => reject(error));
    });
}

async function getStreamIsLive(channel, twitchClientId) {
    // Get the current Twitch channel's user ID
    const userId = await getUserIdFromStorage()
    // Get the current Twitch channel's stream
    const stream = await getStream(userId, twitchClientId);
    return !!(stream.stream_type == 'live');
}

//function to get getUserIdFromStorage();
async function getUserIdFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['twitchUserId'], function(data) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            const userId = data.twitchUserId;
            if (!userId) {
                reject(new Error('Twitch user ID not found'));
            }
            resolve(userId);
        });
    });
}

// Function to handle Twitch chat messages
async function handleChatMessage (channel, userstate, message, self) {
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
        handleSentimentScore(sentimentScore);
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
  
  
  const handleToxicityScore = (toxicityScore, username) => {
    if (toxicityScore > toxicityOptions.threshold) {
        takeAction(username);
    }
  }
  
  const takeAction = (username) => {
    //if extention user has enabled toxicitySelfNotification send them a message
    if (toxicitySelfNotification) {
        sendWarningToExtUser(warningMessageToxic);
    }
    //if send custom message to toxic user is enabled, send them a message
    if (customMessageToxicUser) {
        sendCustomMessageToxicUser(username, customMessageToxic);
    }
    if (sendmessagetomods) {
        sendCustomMessagetoMods(username, customMessageToMods);
    }
  }

    //function to send a custom message to the toxic user
    export function sendCustomMessageToxicUser(username, customMessageToxic) {
        // Send a message to the toxic user
        client.say(channel, `@${username} ${customMessageToxic}`);

    }

    //function to send a custom message to the mods
    export function sendCustomMessagetoMods(username, customMessageToMods) {
        // Send a message to the mods
        client.say(channel, `@${username} ${customMessageToMods}`);
    }

    //function to send a warning to the extention user
    export function sendWarningToExtUser(warningMessageToxic) {
        // Send a message to the extention user
        client.say(channel, `${warningMessageToxic}`);
    }

    //function to update the sentiment score
    function updateSentimentScore(sentimentScore) {
        // Send the sentiment score to the ContentScript.js, which will update the leaderboard and giger meter for sentiment.
        //calculate the sentiment score based on the score in storage and the score from the new message.
        //get the sentiment score from storage
        chrome.storage.sync.get(['sentimentScore'], function(data) {
            if (chrome.runtime.lastError) {
                //The score is not in storage, so set it to 0.
                chrome.storage.sync.set({ sentimentScore: 0 }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving sentiment score:', chrome.runtime.lastError);
                        displayError('Error saving sentiment score: ' + chrome.runtime.lastError.message);
                    }
                });
                return;
            }
            //get the sentiment score from storage
            let sentimentScoreFromStorage = data.sentimentScore;
            //calculate the sentiment score based on the score in storage and the score from the new message.
            let newSentimentScore = (sentimentScoreFromStorage + sentimentScore) / 2;
            //save the new sentiment score to storage
            chrome.storage.sync.set({ sentimentScore: newSentimentScore }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving sentiment score:', chrome.runtime.lastError);
                    displayError('Error saving sentiment score: ' + chrome.runtime.lastError.message);
                } else {
                    // Send the sentiment score to the ContentScript.js, which will update the leaderboard and giger meter for sentiment.
                    chrome.messages.sendMessage('updateSentimentScore', 'SentimentScore',newSentimentScore);
                }
            });
        });
    }

    //function to update the toxicity score  
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
            } else {
                // Send the toxicity score to the ContentScript.js, which will update the leaderboard and giger meter for toxicity.
                chrome.messages.sendMessage('updateToxicityScore', 'ToxicityScore', toxicityScore);
            }

        });
    });
}


// Function to get the toxicity score from storage
export function getToxicityScoreStored(sendResponse) {
    chrome.storage.sync.get('toxicityScore', data => {
        let toxicityScore = data.toxicityScore;
        if (!toxicityScore) {
            toxicityScore = 0;
        }
        sendResponse({score: toxicityScore});
    });
}
