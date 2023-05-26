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

// Function to get the user's preferences from background.js
function getPreferences() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'getPreferences' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// function to set preference variables from getPreferences()
function setPreferenceVariables() {
  getPreferences().then((preferences) => {
    enableSentimentAnalysis = preferences.sentiment.enabled;
    enableToxicityDetection = preferences.toxicity.enabled;
    sentimentSensitivity = preferences.sentiment.options.sensitivity;
    toxicitySensitivity = preferences.toxicity.options.sensitivity;
  }).catch((error) => {
    console.error('Error:', error);
    sendWarningToExtUser('Error: ' + error.message);
  });
}

// Function to get the sentiment score from background.js
function SentimentAnalysis(request) {
  if (enableSentimentAnalysis) {
    sentimentScore = getSentimentScore(request.text);
    updateSentimentMeter(sentimentScore);
  }
}

// Function to get the toxicity score from background.js
function ToxicityDetection(request) {
  if (enableToxicityDetection) {
    toxicityScore = getToxicityScore(request.text);
    updateToxicityMeter(toxicityScore);
  }
}

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
    document.getElementById('gigerMeter').style.width = `${sentimentScore * 100}%`;
    
  }
}
// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'sentimentAnalysis':
        SentimentAnalysis(request.text)
        break;
      case 'toxicityDetection':
        if (enableToxicityDetection) {
          toxicityScore = await getToxicityScore(request.text);
          updateToxicityMeter(toxicityScore);
        }
        break;
      case 'updateLeaderboard':
        updateLeaderboard(request);
        break;
      case 'updateSentimentScore':
        updateSentimentScore(request);
        break;
      case 'updateToxicityScore':
         updateToxicityScore(request);
        break;
        default:
          sendWarningToExtUser('Error: Unknown message type');
          break;
    }
    return true; // Indicate that the response will be sent asynchronously
 } catch (error) {
    console.error('Error:', error);
    sendWarningToExtUser('Error: ' + error.message);
  }
  return true; // Indicate that the response will be sent asynchronously
  //return true; // Indicate that the response will be sent asynchronously
}

function updateToxicityScore(request) {
  toxicityScore = request.ToxicityScore;
  //check if the toxicity score is a number
  isToxicityScoreNan(toxicityScore);
  setPreferenceVariables();
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'updatePreferences') {
      setPreferenceVariables();
      return true; // Indicate that the response will be sent asynchronously
    } 
  });
  }

  function isToxicityScoreNan(toxicityScore) {
    if (isNaN(toxicityScore)) {
      //if the toxicity score is not a number, set the toxicity score to 0
      toxicityScore = 0.1;
    }
      //if the toxicity score is a number, round the toxicity score to 2 decimal places
      toxicityScore = Math.round(toxicityScore * 100) / 100;
      //update the toxicity score in the HTML
      document.getElementById('toxicityScore').innerHTML = toxicityScore;
      //update the toxicity giger-meter in the HTML
      document.getElementById('toxicityMeter').style.width = `${toxicityScore * 100}%`;
    
    return toxicityScore;
  }

//function to update the sentiment meter
function updateSentimentMeter(sentimentScore) {
  const sentimentMeter = document.getElementById('gigerMeter');
  // Update the sentiment meter
  if (sentimentScore !== null) {
    sentimentMeter.style.width = `${sentimentScore * 100}%`;
  }
}

//function to update the toxicity meter
function updateToxicityMeter(toxicityScore) {
  const toxicityMeter = document.getElementById('toxicityMeter');
  // Update the toxicity meter
  if (toxicityScore !== null) {
    toxicityMeter.style.width = `${toxicityScore * 100}%`;
  }
}


// Function to update the sentiment and toxicity meters in the HTML
function updateMeters(sentimentScore, toxicityScore) {
  const sentimentMeter = document.getElementById('gigerMeter');
  const toxicityMeter = document.getElementById('toxicityMeter');

  // Update the sentiment meter
  if (sentimentScore !== null) {
    sentimentMeter.style.width = `${sentimentScore * 100}%`;
  }

  // Update the toxicity meter
  if (toxicityScore !== null) {
    toxicityMeter.style.width = `${toxicityScore * 100}%`;
  }
}

// Function to update the sentiment score in the HTML
function updateSentimentScore(sentimentScore) {
  const sentimentScoreElement = document.getElementById('sentimentScore');

  if (sentimentScore !== null) {
    sentimentScoreElement.innerHTML = sentimentScore;
  }
}

// Function to update the toxicity score in the HTML
function updateToxicityScore(toxicityScore) {
  const toxicityScoreElement = document.getElementById('toxicityScore');

  if (toxicityScore !== null) {
    toxicityScoreElement.innerHTML = toxicityScore;
  }
}

// Function to update the sentiment and toxicity scores in the HTML
function updateScores(sentimentScore, toxicityScore) {
  updateSentimentScore(sentimentScore);
  updateToxicityScore(toxicityScore);
}

//function to get toxicity score
function getToxicityScore(text) {
  //get the toxicity score
  let toxicityScore = text.toxicityScore;
  //check if the toxicity score is null
  if (toxicityScore == null) {
    //set the toxicity score to 0
    toxicityScore = 0;
  }
  //return the toxicity score
  return toxicityScore;
}

//function to get sentiment score
function getSentimentScore(text) {
  //get the sentiment score
  let sentimentScore = text.sentimentScore;
  //check if the sentiment score is null
  if (sentimentScore == null) {
    //set the sentiment score to 0
    sentimentScore = 0;
  }
  //return the sentiment score
  return sentimentScore;
}


