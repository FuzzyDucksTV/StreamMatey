// Description: This file contains the front end script of the chrome ext for the sentiment.html page.
//

// Imports

// Variables to store the user's preferences
let enableSentimentAnalysis = true;
let enableToxicityDetection = true;
let sentimentSensitivity = null;
let toxicitySensitivity = null;

// Variables to store the sentiment and toxicity scores
let sentimentScore = null;
let toxicityScore = null;


// Additional options
let sentimentOptions = {};
let toxicityOptions = {};

// Variables to store the leaderboard
let leaderboard = [];

// Variables to store the chat history
let chatHistory = [];

// Function to get the sentiment score from background.js
function updateSentimentScore(request) {
  sentimentScore =  request.SentimentScore;
  //check if the sentiment score is a number
  if (isNaN(sentimentScore)) {
    //if the sentiment score is not a number, set the sentiment score to 0
    sentimentScore = 0;
  } else {
    //if the sentiment score is a number, round the sentiment score to 2 decimal places
    sentimentScore = Math.round(sentimentScore * 100) / 100;
    //update the sentiment score in the HTML
    document.getElementById('sentimentScore').innerHTML = sentimentScore;
    //update the sentiment giger-meter in the HTML
    updateSentimentMeter(sentimentScore);
  }
}

// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'updateLeaderboard':
        updateLeaderboard(request);
        break;
      case 'updateSentimentScore':
        updateSentimentScore(request);
        break;
      case 'updateToxicityScore':
         updateToxicityScore(request);
        break;
      case 'updateChatHistory':
        updateChatHistory(request);
        break;
      default:
          sendWarningToExtUser('Error: Unknown message type');
          break;
    }
  } catch (error) {
    console.error('Error:', error);
    sendWarningToExtUser('Error: ' + error.message);
    return true; // Indicate that the response will be sent asynchronously
  }
}

// Function to send a warning to the extension user

function sendWarningToExtUser(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'warning', message: message});
  });
}

function updateToxicityScore(request) {
  toxicityScore = request.ToxicityScore;
  //check if the toxicity score is a number
  if (isNaN(toxicityScore)) { toxicityScore = 0; }

  //update the toxicity score in the HTML
  document.getElementById('toxicityScore').innerHTML = toxicityScore;
  //update the toxicity giger-meter in the HTML
  updateToxicityMeter(toxicityScore)
}


 

//function to update the sentiment meter
function updateSentimentMeter(sentimentScore) {
  const sentimentMeter = document.getElementById('gigerMeter');
  // Update the sentiment meter
  if (isNaN(sentimentScore)) {
    sentimentMeter.style.width = '0%';
    return;
  }
    sentimentMeter.style.width = `${sentimentScore * 100}%`;
}


//function to update the toxicity meter
function updateToxicityMeter(toxicityScore) {
  const toxicityMeter = document.getElementById('toxicityMeter');
  // Update the toxicity meter
  if (isNaN(toxicityScore)) {
    toxicityMeter.style.width = '0%';
    return;
  }
    toxicityMeter.style.width = `${toxicityScore * 100}%`;
}

//function to update the leaderboard

function updateLeaderboard(request) {
  leaderboard = request.Leaderboard;
  //check if the leaderboard is an array
  if (!Array.isArray(leaderboard)) {
    //if the leaderboard is not an array, set the leaderboard to an empty array
    leaderboard = [];
  }
  //update the leaderboard in the HTML
  document.getElementById('leaderboard').innerHTML = leaderboard.map(item => `<li>${item.Name}: ${item.Score}</li>`).join('');
}

//function to update the chat history

function updateChatHistory(request) {
  chatHistory = request.ChatHistory;
  //check if the chat history is an array
  if (!Array.isArray(chatHistory)) {
    //if the chat history is not an array, set the chat history to an empty array
    chatHistory = [];
  }
  //update the chat history in the HTML
  document.getElementById('chatHistory').innerHTML = chatHistory.map(item => `<li>${item}</li>`).join('');
}
