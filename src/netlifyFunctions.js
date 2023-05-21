// Import required modules
const axios = require('axios');

// Variables for Netlify API
let netlifyAPIKey = process.env.NETLIFY_API_KEY;

// Function to fetch API keys from Netlify
async function fetchAPIKeys() {
  try {
    const response = await axios.get('https://api.netlify.com/api/v1/keys', {
      headers: {
        'Authorization': `Bearer ${netlifyAPIKey}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching API keys from Netlify:', error);
    throw error; // Throw the error after logging it
  }
}

module.exports = { fetchAPIKeys };
