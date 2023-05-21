// Get HTML elements
const sentimentWindow = document.getElementById('sentimentWindow');
const gigerMeter = document.getElementById('gigerMeter');
const sentimentScore = document.getElementById('sentimentScore');
const errorDiv = document.getElementById('errorDiv'); // New div for displaying error messages

// Function to update Giger-Meter
function updateGigerMeter(score) {
    gigerMeter.style.width = `${score * 100}%`;
    sentimentScore.textContent = `Sentiment: ${score.toFixed(2)}`;
}

// Function to handle received message
function handleReceivedMessage(message) {
    if (message.type === 'sentimentScoreUpdate') {
        updateGigerMeter(message.score);
    } else if (message.type === 'error') {
        // Display error message in the errorDiv
        errorDiv.textContent = message.error; 
    }
}

// Set up listener for messages from background script
chrome.runtime.onMessage.addListener(handleReceivedMessage);

// Function to send message
function sendMessage(message) {
    chrome.runtime.sendMessage(message, function(response) {
        if (chrome.runtime.lastError) {
            // Display error message in the errorDiv
            errorDiv.textContent = chrome.runtime.lastError.message;
        }
    });
}

// Function to score message
function scoreMessage(message) {
    sendMessage({type: 'scoreMessage', message: message});
}

// Function to handle chat message
function handleChatMessage(message) {
    scoreMessage(message);
}
