// Function to analyze a chat message for toxicity
export async function analyzeSentiment(message) {
  if (!message) {
    return 0;
  }

  const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;

  if (!OAUTH_CLIENT_ID) {
    return 0;
  }

  try {
    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${OAUTH_CLIENT_ID}`;
    const data = {
      comment: { text: message },
      languages: ['en'],
      requestedAttributes: { TOXICITY: {} },
    };

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Error analyzing sentiment');
    }

    const responseData = await response.json();
    const score = responseData.attributeScores.TOXICITY.summaryScore.value;

    if (typeof score !== 'number') {
      throw new Error('Invalid sentiment score');
    }

    return score;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 0;
  }
}

  