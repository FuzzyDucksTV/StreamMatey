//imports
import { checkTwitchLogin, initiateTwitchOAuth } from './handleTwitchLoginLogout';
import { getPreferences, savePreferences } from './handlePreferences.js';
import { removeTwitchAccessToken } from './handleTwitchLoginLogout.js';


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
        await initiateTwitchOAuth(sendResponse);
        break;
      case 'savePreferences':
        await savePreferences(request.preferences, sendResponse);
        break;
       case 'removeTwitchAccessToken' :
        await removeTwitchAccessToken(sendResponse);
        break;
      default:
        console.error('Unknown request type:', request.type);
    }
  }
  
  