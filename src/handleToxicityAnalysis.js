//Imports
import { sendWarningToExtUser } from './handleTwitchChatMessages.js';



// Function to analyze a chat message for toxicity
export async function analyzeToxicity(message) {
    try {
      
        const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${getOAuthClientID}`;
        const data = {
          comment: { text: message },
          languages: ['en'],
          requestedAttributes: { TOXICITY: {} }
        };
        await new Promise((resolve, reject) => {
          fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
          })
          .then(response => response.json())
          .then(data => {
            const score = data.attributeScores.TOXICITY.summaryScore.value;
            resolve(score);
          })
          .catch(error => reject(error));
        });
    } catch (error) {
      console.error('Error analyzing toxicity:', error);
      sendWarningToExtUser('Error analyzing toxicity: ' + error.message);
      return null;
    }
  }