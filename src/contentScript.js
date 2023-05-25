
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



// Function to handle incoming messages
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'sentimentAnalysis':
        if (enableSentimentAnalysis) {
          sentimentScore = await getSentimentScore(request.text);
          updateMeters(sentimentScore, toxicityScore);
        }
        break;
      case 'toxicityDetection':
        if (enableToxicityDetection) {
          toxicityScore = await getToxicityScore(request.text);
          updateMeters(sentimentScore, toxicityScore);
          
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

  sendResponse({}); // Send an empty response



  

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

