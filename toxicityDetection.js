// Get HTML elements
const toxicityWindow = document.getElementById('toxicity-window');
const toxicityMeterBar = document.getElementById('toxicity-meter-bar');
const toxicityScoreElement = document.getElementById('toxicity-score');

if (!toxicityWindow || !toxicityMeterBar || !toxicityScoreElement) {
    console.error('Unable to locate required HTML elements');
    return;
}

let toxicityScore = 0;

// Function to update the Toxicity-Meter
function updateToxicityMeter(score) {
    toxicityMeterBar.style.width = `${score}%`;
    toxicityScoreElement.innerText = score.toFixed(2);
}

// Function to handle received messages from the background script
function handleReceivedMessage(message) {
    switch (message.type) {
        case 'toxicityScoreUpdate':
            toxicityScore = message.score;
            updateToxicityMeter(toxicityScore);
            break;
        case 'error':
            toxicityWindow.innerHTML = `<p>Error: ${message.error}</p>`;
            break;
        default:
            console.error('Received unrecognized message type:', message.type);
            break;
    }
}

// Listener for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleReceivedMessage(message);
});

// Function to send a message to the background script
function sendMessage(message) {
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.error('Unable to send message to background script');
        return;
    }
    chrome.runtime.sendMessage(message);
}

// Function to score a message
function scoreMessage(message) {
    sendMessage({ type: 'scoreMessage', message: message });
}

// Function to handle a new Twitch chat message
function handleChatMessage(message) {
    scoreMessage(message);
}
