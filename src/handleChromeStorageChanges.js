
// Monitor changes in Chrome's sync storage
chrome.storage.onChanged.addListener(logStorageChanges);


// Function to log changes in Chrome's sync storage
function logStorageChanges(changes, areaName) {
    for (let key in changes) {
      let storageChange = changes[key];
      console.log(`Storage key "${key}" in namespace "${areaName}" changed. Old value was "${storageChange.oldValue}", new value is "${storageChange.newValue}".`);
    }
  }
  
    // Monitor changes in Chrome's sync storage
    //chrome.storage.onChanged.addListener(handleStorageChanges);

  // Function to handle changes in Chrome's sync storage
    function handleStorageChanges(changes, areaName) {
        for (let key in changes) {
            let storageChange = changes[key];
            switch (key) {
            case 'preferences':
                // Update the preferences object
                preferences = storageChange.newValue;
                break;
            case 'leaderboard':
                // Update the chat history object
                chatHistory = storageChange.newValue;
                break;
            case 'encryptionKey':
                // Update the encryption key
                encryptionKey = storageChange.newValue;
                break;
            default:
                console.error('Unknown storage key:', key);
            }
        }
    }