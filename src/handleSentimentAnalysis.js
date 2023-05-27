// Function to analyze a chat message for toxicity
export function analyzeSentiment(message) {
    if (!message) {
      return 0;
    }
    const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
    
    if (!OAUTH_CLIENT_ID) {
      return 0;
    }
    // Get the sentiment score of the message
    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${OAUTH_CLIENT_ID}`;
    const data = {
      comment: { text: message },
      languages: ['en'],
      requestedAttributes: { TOXICITY: {} }
    };
    // Send a request to the Perspective API
    return new Promise((resolve, reject) => {
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


  }

  