/* eslint-disable no-undef */
// Inject the script to the webpage so we can use WebSockets
const script = document.createElement('script');
script.src = chrome.runtime.getURL('websocket.js');
(document.head || document.documentElement).appendChild(script);
