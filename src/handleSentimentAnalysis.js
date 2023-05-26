// Function to analyze a chat message for toxicity
export function analyzeSentiment(message) {
    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${OAUTH_CLIENT_ID}`;
    const data = {
      comment: { text: message },
      languages: ['en'],
      requestedAttributes: { TOXICITY: {} }
    };
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

  