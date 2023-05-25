// Import required modules
const tmi = require('tmi.js');
const axios = require('axios');
const { google } = require('googleapis');

require('handleEncryption.js');
require('handleNetlifyAPI.js');
require('handlePreferences.js');
require('handleSentimentAnalysis.js');
require('handleToxicityDetection.js');
require('handleTwitchChatMessages.js');
require('handleTwitchLoginLogout.js');
require('handleTwitchAPI.js');
require('handleTwitchCustomMessages.js');
require('handleBackgroundMessages.js');
require('handleChromeStorageChanges.js');
require('handleLeaderboard.js');





// Variables for Twitch, Perspective, and Netlify API
let twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
let netlifyFunctionUrl = 'YOUR_NETLIFY_FUNCTION_URL'; // Add your Netlify function URL here

// Open options page when extension icon is clicked
chrome.action.onClicked.addListener(() => chrome.tabs.create({url: 'options.html'}));

// Handle messages from the content script
chrome.runtime.onMessage.addListener(handleMessages);

// Monitor changes in Chrome's sync storage
chrome.storage.onChanged.addListener(logStorageChanges);

// Check if the encryption key exists when the extension starts
checkEncryptionKeyExists();

// Set default values for the extension's preferences
setDefaultValues()
// Start monitoring Twitch chat when the extension is installed or updated
chrome.runtime.onInstalled.addListener(monitorTwitchChat);

// Get Twitch Access Token from Chrome Storage
chrome.storage.sync.get('twitchAccessToken', handleTwitchAccessToken);


// Function to send a warning to the extension user
function sendWarningToExtUser(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'StreamMatey Warning',
        message: message
    });
    }



    
    


// Function to log changes in Chrome's sync storage
function logStorageChanges(changes, areaName) {
  for (let key in changes) {
    let storageChange = changes[key];
    console.log(`Storage key "${key}" in namespace "${areaName}" changed. Old value was "${storageChange.oldValue}", new value is "${storageChange.newValue}".`);
  }
}

  
  
  
  /* Taken from contentScript.js
  //function to update the leaderboard
function updateLeaderboard(text) {
  //Need to update the leaderboard for sentiment and toxicity to show the (top 3 most positive (sentiment) = the top 3 on the leaderboard) and (top 3 negative (toxicity) = the bottom 3 on the leaderboard)
  
  //get the leaderboard
  let leaderboard = document.getElementById('leaderboard');
  //get the leaderboard items
  let leaderboardItems = leaderboard.getElementsByTagName('li');
  //get the leaderboard items text
  let leaderboardItemsText = [];
  for (let i = 0; i < leaderboardItems.length; i++) {
    leaderboardItemsText.push(leaderboardItems[i].innerText);
  }
  //get the leaderboard items scores
  let leaderboardItemsScores = [];
  for (let i = 0; i < leaderboardItemsText.length; i++) {
    leaderboardItemsScores.push(leaderboardItemsText[i].split(' ')[1]);
  }
  //get the leaderboard items names
  let leaderboardItemsNames = [];
  for (let i = 0; i < leaderboardItemsText.length; i++) {
    leaderboardItemsNames.push(leaderboardItemsText[i].split(' ')[0]);
  }
  //get the leaderboard items names and scores
  let leaderboardItemsNamesAndScores = [];
  for (let i = 0; i < leaderboardItemsText.length; i++) {
    leaderboardItemsNamesAndScores.push(leaderboardItemsText[i].split(' '));
  }
  //get the leaderboard items names and scores sorted by score
  let leaderboardItemsNamesAndScoresSortedByScore = leaderboardItemsNamesAndScores.sort(function(a, b) {
    return b[1] - a[1];
  });
  
  //get the sentiment score
  let sentimentScore = text.sentimentScore;
  //get the toxicity score
  let toxicityScore = text.toxicityScore;
  //get the name
  let name = text.name;
  //get the name and score
  let nameAndScore = [name, sentimentScore];
  //get the name and score sorted by score
  let nameAndScoreSortedByScore = [name, sentimentScore].sort(function(a, b) {
    return b[1] - a[1];
  });

  //if the leaderboard is empty
  if (leaderboardItemsText.length == 0) {
    //add the name and score to the leaderboard
    let li = document.createElement('li');
    li.appendChild(document.createTextNode(name + ' ' + sentimentScore));

    leaderboard.appendChild(li);
  }
  //if the leaderboard is not empty
  else {
    //if the leaderboard is not full
    if (leaderboardItemsText.length < 3) {
      //add the name and score to the leaderboard
      let li = document.createElement('li');
      li.appendChild(document.createTextNode(name + ' ' + sentimentScore));
      
      leaderboard.appendChild(li);
    }
    //if the leaderboard is full
    else {
      //if the name and score is greater than the lowest score on the leaderboard
      if (nameAndScoreSortedByScore[1] > leaderboardItemsNamesAndScoresSortedByScore[2][1]) {
        //remove the lowest score on the leaderboard
        leaderboard.removeChild(leaderboardItems[2]);
        //add the name and score to the leaderboard
        let li = document.createElement('li');
        li.appendChild(document.createTextNode(name + ' ' + sentimentScore));

        leaderboard.appendChild(li);
      }
    }
  }
}
*/
  
  
 



// Function to handle errors
function handleError(error, message) {
  console.error(message, error);
  sendWarningToExtUser(`${message}: ${error.message}`);
}

// Function to display an error to the extension user
function displayError(message) {
  chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'StreamMatey Error',
      message: message
  });
}



// Function to send a warning to the extension user
function sendWarningToExtUser(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'StreamMatey Warning',
        message: message
    });
    }

       // Start monitoring Twitch chat when the extension is installed or updated
chrome.runtime.onInstalled.addListener(monitorTwitchChat);

