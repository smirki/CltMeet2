// makeAdmin.js
const admin = require('firebase-admin');
const axios = require('axios');
const readline = require('readline');
require('dotenv').config({ path: '../.env' });

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccount.json'); // Update with the path to your serviceAccount.json

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const FIREBASE_API_KEY =  process.env.FIREBASE_API_KEY;

// Function to prompt user for email and password
function promptCredentials() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter user email: ', (email) => {
    rl.question('Enter user password: ', (password) => {
      rl.close();
      makeUserAdmin(email, password);
    });
  });
}

// Function to authenticate user with email and password
async function authenticateUser(email, password) {
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error('Authentication failed: ' + (error.response?.data?.error?.message || error.message));
  }
}

// Function to make the user admin
async function makeUserAdmin(email, password) {
  try {
    // Authenticate the user
    const authData = await authenticateUser(email, password);

    // Get user UID
    const userRecord = await admin.auth().getUserByEmail(email);

    // Set custom claims to make the user an admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

    console.log(`User ${email} has been made an admin.`);
  } catch (error) {
    console.error('Error making user admin:', error.message);
  }
}

// Start the script by prompting for credentials
promptCredentials();
