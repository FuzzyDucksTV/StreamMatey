//imports
import { checkTwitchLogin, initiateTwitchOAuth } from './handleTwitchChatMessages.js';
import { getPreferences, savePreferences } from './handlePreferences.js';
import { getSentimentScoreStored } from './handleSentimentAnalysis.js';
import { analyzeToxicity } from './handleToxicityAnalysis.js';
import { decrypt } from './handleEncryption.js';
import { displayError } from './errorHandling.js';


//Variables
const customMessageMods = getCustomMessageMods();
const customMessageToUser = getCustomMessageToUser();
const customMessageToxicityThreshold = getCustomMessageToxicityThreshold();
const customMessageSentimentThreshold = getCustomMessageSentimentThreshold();


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



// Function to monitor Twitch chat
// Start monitoring Twitch chat when the extension is installed or updated and the user is logged in, and stop monitoring Twitch chat when the user is logged out.
       // Also, make sure the user is currently streaming before monitoring Twitch chat.
     export async function monitorTwitchChat() {
    streamIsLive = await checkIfStreamIsLive();
    //check if the user is streaming
    if (streamIsLive) {
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
}

// function to check if a stream is live
async function checkIfStreamIsLive() {
    
// Get the Twitch client ID from Chrome's sync storage
    twitchClientId = await getTwitchClientId();
    if (!twitchClientId) {
        console.error('Error: Twitch client ID not found');
        displayError('Error: Twitch client ID not found');
        return;
    }
    // Get the encrypted Twitch access token and encryption key from Chrome's sync storage
    const encryptedAccessToken = await getTwitchAccessToken();
    const encryptionKey = await getEncryptionKey();
    if (!encryptedAccessToken || !encryptionKey) {
        console.error('Error: Twitch access token or encryption key not found');
        displayError('Error: Twitch access token or encryption key not found');
        return;
    }
    // Decrypt the Twitch access token using the encryption key
    const twitchAccessToken = await decrypt(encryptedAccessToken, encryptionKey);
    // Get the current Twitch channel
    const channel = await getCurrentChannel(twitchAccessToken, twitchClientId);
    // Configure the Twitch client
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
    // Check if the stream is live
    const streamIsLive = await getStreamIsLive(channel, twitchClientId);
    // Disconnect from the Twitch chat
    client.disconnect();
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
    // Check if the stream is live
    if (stream) {
        return true;
    } else {
        return false;
    }
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


//function to get the userid
async function getUserId (channel, twitchClientId) {
    // Get the current Twitch channel's user ID
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
            'Client-ID': twitchClientId
        }
    });
    const data = await response.json();
    return data.data[0].id;
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
                        return;
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
                    return;
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

    // Send the toxicity score to the ContentScript.js, which will update the leaderboard and giger meter for toxicity.
    chrome.runtime.sendMessage({
        type: 'toxicityScore',
        score: toxicityScore,
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

// Function to get the sentiment threshold from storage
function getSentimentThresholdStored(sendResponse) {
    chrome.storage.sync.get('sentimentThreshold', data => {
        let sentimentThreshold = data.sentimentThreshold;
        if (!sentimentThreshold) {
            sentimentThreshold = 0;
        }
        sendResponse({threshold: sentimentThreshold});
    });
}

// Function to get the toxicity threshold from storage
function getToxicityThresholdStored(sendResponse) {
    chrome.storage.sync.get('toxicityThreshold', data => {
        let toxicityThreshold = data.toxicityThreshold;
        if (!toxicityThreshold) {
            toxicityThreshold = 0;
        }
        sendResponse({threshold: toxicityThreshold});
    });
}

// Function to get the custom message for toxic users from storage
function getCustomMessageToxicStored(sendResponse) {
    chrome.storage.sync.get('customMessageToxic', data => {
        let customMessageToxic = data.customMessageToxic;
        if (!customMessageToxic) {
            customMessageToxic = 0;
        }
        sendResponse({message: customMessageToxic});
    });
}

// Function to get the custom message for mods from storage
function getCustomMessageModsStored(sendResponse) {
    chrome.storage.sync.get('customMessageMods', data => {
        let customMessageMods = data.customMessageMods;
        if (!customMessageMods) {
            customMessageMods = 0;
        }
        sendResponse({message: customMessageMods});
    });
}

// Function to get the custom message for extention users from storage
function getCustomMessageExtStored(sendResponse) {
    chrome.storage.sync.get('customMessageExt', data => {
        let customMessageExt = data.customMessageExt;
        if (!customMessageExt) {
            customMessageExt = 0;
        }
        sendResponse({message: customMessageExt});
    });
}
chrome.runtime.onInstalled.addListener(monitorTwitchChat);