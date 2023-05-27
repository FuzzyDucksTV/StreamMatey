// Function to handle changes in Chrome's sync storage
export async function handleStorageChanges(changes) {
    for (let key in changes) {
        let storageChange = changes[key];
        switch (key) {
        case 'preferences':
            // Update the preferences object
            let preferences = storageChange.newValue;
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

