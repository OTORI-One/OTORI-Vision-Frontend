// Backend API entry point
// This file serves as the main entry point for the backend API services

// Import the runes API service
const runesAPI = require('./runes_API');

// You can add more services here as needed
console.log('OTORI Vision Backend API services started');

// Export the services for potential programmatic usage
module.exports = {
  runesAPI
}; 