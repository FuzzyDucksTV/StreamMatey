 // Function to analyze a chat message for toxicity
 async function analyzeToxicity(message) {
    try {
      const result = await client.analyze({ comment: { text: message } });
      return result.attributeScores.TOXICITY.summaryScore.value;
    } catch (error) {
      console.error('Error analyzing toxicity:', error);
      sendWarningToExtUser('Error analyzing toxicity: ' + error.message);
      return null;
    }
  }