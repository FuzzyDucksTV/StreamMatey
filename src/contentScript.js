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

// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'sentimentAnalysis':
        if (enableSentimentAnalysis) {
          sentimentScore = await getSentimentScore(request.text);
          updateSentimentMeter(sentimentScore);
        }
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
      case 'sentimentAnalysisOptions':
        sentimentOptions = request.options;

        break;
      case 'toxicityDetectionOptions':
        toxicityOptions = request.options;
        break;
      case 'updateSentimentScore':
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
        break;
      case 'updateToxicityScore':
        toxicityScore = request.ToxicityScore;
        //check if the toxicity score is a number
        if (isNaN(toxicityScore)) {
          //if the toxicity score is not a number, set the toxicity score to 0
          toxicityScore = 0;
        } else {
          //if the toxicity score is a number, round the toxicity score to 2 decimal places
          toxicityScore = Math.round(toxicityScore * 100) / 100;
          //update the toxicity score in the HTML
          document.getElementById('toxicityScore').innerHTML = toxicityScore;
          //update the toxicity giger-meter in the HTML
          document.getElementById('toxicityMeter').style.width = `${toxicityScore * 100}%`;
        }
      default:
        console.error('Error: Invalid message type received');
        sendWarningToExtUser('Error: Invalid message type received');
        break;
    }
  }
  catch (error) {
    console.error('Error:', error);
    sendWarningToExtUser('Error: ' + error.message);
  }

  sendResponse({}); // Send an empty response to the sender
}

setPreferenceVariables();
// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updatePreferences') {
    setPreferenceVariables();
  } else {
    handleMessage(request, sender, sendResponse); // Handle other actions
  }
  return true; // Indicate that the response will be sent asynchronously
});

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

//function to update the leaderboard
function updateLeaderboard(text) {
  //get the leaderboard items
  let leaderboardItems = document.getElementById('leaderboard').getElementsByTagName('li');
  //get the leaderboard items text
  let leaderboardItemsText = [];
  for (let i = 0; i < leaderboardItems.length; i++) {
    leaderboardItemsText.push(leaderboardItems[i].innerHTML);
  }
  //get the leaderboard items names
  let leaderboardItemsNames = [];

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
  //get the name
  let name = text.name;
  //get the name and score
  let nameAndScore = [name, sentimentScore];
  //get the name and score sorted by score
  let nameAndScoreSortedByScore = [name, sentimentScore].sort(function(a, b) {
    return b[1] - a[1];
  });

    //get the toxicity score
    let toxicityScore = text.toxicityScore;
    //get the name
    //get the name and score
    let nameAndToxicScore = [name, toxicityScore];
    //get the name and score sorted by score
    let nameAndToxicScoreSortedByScore = [name, toxicityScore].sort(function(a, b) {
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


