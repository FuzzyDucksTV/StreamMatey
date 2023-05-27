//imports
import { checkTwitchLogin, initiateTwitchOAuth } from './handleTwitchLoginLogout';
import { getPreferences, savePreferences } from './handlePreferences.js';


// Function to handle messages from the content script
export async function handleMessages(request, sender, sendResponse) {
    switch (request.type) {
      case 'checkTwitchLogin':
        await checkTwitchLogin(sendResponse);
        break;
      case 'getPreferences':
        await getPreferences(sendResponse);
        break;
      case 'loadPreferences':
        await getPreferences(sendResponse);
        break;
      case 'initiateTwitchOAuth':
        await initiateTwitchOAuth();
        break;
      case 'savePreferences':
        savePreferences(request.preferences);
        break;
      default:
        console.error('Unknown request type:', request.type);
    }
  }
  