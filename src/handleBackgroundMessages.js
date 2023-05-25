// Handle messages from the content script
chrome.runtime.onMessage.addListener(handleMessages);

// Function to handle messages from the content script
function handleMessages(request, sender, sendResponse) {
    switch (request.type) {
      case 'checkTwitchLogin':
        checkTwitchLogin(sendResponse);
        break;
      case 'getPreferences':
        getPreferences(sendResponse);
        break;
      case 'initiateTwitchOAuth':
        initiateTwitchOAuth();
        break;
      case 'savePreferences':
        savePreferences(request.preferences);
        break;
      case 'getSentimentScore':
          //Get sentiment score from storage
          getSentimentScoreStored(request.text, sendResponse);
          break;
      case 'getToxicityScore':
          getToxicityScore(request.text, sendResponse);
          break;
      default:
        console.error('Unknown request type:', request.type);
    }
  }
  