// Get HTML elements
const chatWindow = document.getElementById('chat-window');
const sentimentWindow = document.getElementById('sentiment-window');
const gigerMeterBar = document.getElementById('giger-meter-bar');
const sentimentScoreElement = document.getElementById('sentiment-score');
const toxicityWindow = document.getElementById('toxicity-window');
const toxicityMeterBar = document.getElementById('toxicity-meter-bar');
const toxicityScoreElement = document.getElementById('toxicity-score');

// Function to handle a new Twitch chat message
function handleChatMessage(message) {
  try {
    // Send the chat message to the background scripts for analysis
    chrome.runtime.sendMessage({ type: 'analyzeMessage', message: message });
  } catch (error) {
    console.error(`Error handling chat message: ${error}`);
    // TODO: Display this error message to the user
  }
}

// Function to update the sentiment analysis UI
function updateSentimentUI(score) {
  try {
    gigerMeterBar.style.width = `${score}%`;
    sentimentScoreElement.innerText = score.toFixed(2);
  } catch (error) {
    console.error(`Error updating sentiment UI: ${error}`);
    // TODO: Display this error message to the user
  }
}

// Function to update the toxicity detection UI
function updateToxicityUI(score) {
  try {
    toxicityMeterBar.style.width = `${score}%`;
    toxicityScoreElement.innerText = score.toFixed(2);
  } catch (error) {
    console.error(`Error updating toxicity UI: ${error}`);
    // TODO: Display this error message to the user
  }
}
