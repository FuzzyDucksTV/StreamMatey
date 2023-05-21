# StreamMatey
 A streamer mutlitool for sentiment and toxicity analysis and displaying the results in giger-meters.
StreamMatey is a Chrome extension that monitors Twitch chat in real-time, using sentiment analysis and toxicity detection to analyze chat messages. 

## Features

- **Sentiment Analysis**: Analyzes the sentiment of each chat message and displays a sentiment score in the extension's UI.
- **Toxicity Detection**: Uses a pre-trained machine learning model to detect toxic messages.
- **Real-Time Monitoring**: Monitors Twitch chat in real-time for immediate detection and response to toxic messages.
- **Configurable Responses**: Allows users to configure responses to toxic messages, including sending a private message to the sender, notifying chat moderators, and sending a browser notification.
- **Twitch API Integration**: Integrates with the Twitch API to send whispers and interact with the Twitch chat service.
- **Secure Data Storage**: Uses Chrome's secure and isolated storage API to store sensitive data, such as Twitch user IDs and access tokens.

## Installation

1. Clone this repository.
2. Open the Extension Management page by navigating to `chrome://extensions`.
3. Enable Developer Mode by clicking the toggle switch next to Developer mode.
4. Click the `Load unpacked` button and select the extension directory.

## Usage

1. Open the extension's popup UI and log in to Twitch.
2. Configure your preferences for sentiment analysis and toxicity detection.
3. Open your Twitch chat to start monitoring.


## License

This project is licensed under the [MIT License](LICENSE.md).

