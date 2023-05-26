// Function to display error messages

export function displayError(message) {
    console.error(message);
    // You can also display the error message to the user in some way
    
    // Send a notification to the user
    chrome.notifications.create(
        'errorNotification',
        {
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Twitch Chat Filter',
            message: message
        }
        );
  }

    // Function to handle errors
    function handleError(error) {
        // Handle errors in some way, e.g.:
        displayError(error.message);
    }


    

