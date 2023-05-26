const mocha = require('mocha');
const assert = require('assert');
mocha.setup('bdd');

const { handleSentimentAnalysis } = require('./src/app');
describe('handleSentimentAnalysis', () => {
  it('should return the correct sentiment score for a positive message', () => {
    const message = 'This is a great chat!';
    const sentimentScore = handleSentimentAnalysis(message);
    assert.equal(sentimentScore, 0.5);
  });


  it('should return the correct sentiment score for a negative message', () => {
    const message = 'This chat is terrible!';
    const sentimentScore = handleSentimentAnalysis(message);
    assert.equal(sentimentScore, -0.5);
  });
});

// Run the tests.
mocha.run();