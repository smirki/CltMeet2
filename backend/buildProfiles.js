// buildprofiles.js

const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Environment Variables
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY; // Your Firebase API Key
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000';

// Axios instance for API calls
const axiosInstance = axios.create({
  baseURL: SERVER_BASE_URL,
});

// Number of test users and events
const NUM_USERS = 5; // Adjust as needed
const NUM_EVENTS = 3;

// Arrays to keep track of created users and events
let testUsers = [];
let testEvents = [];

// Arrays to keep track of successes and errors
let successes = [];
let errors = [];

// Sample data for user profiles
const userProfiles = [
  {
    name: 'Alex Johnson',
    age: 28,
    bio: 'Love exploring new hiking trails and meeting like-minded adventurers!',
    interests: ['hiking', 'outdoors', 'adventure'],
  },
  {
    name: 'Maria Gonzalez',
    age: 25,
    bio: 'Art enthusiast looking to connect with fellow creatives in Charlotte.',
    interests: ['art', 'painting', 'creativity'],
  },
  {
    name: 'David Smith',
    age: 30,
    bio: 'A foodie who enjoys trying out new restaurants and cuisines.',
    interests: ['food', 'cooking', 'restaurants'],
  },
  {
    name: 'Linda Williams',
    age: 27,
    bio: 'Book lover excited to discuss literature over coffee.',
    interests: ['books', 'reading', 'coffee'],
  },
  {
    name: 'Michael Brown',
    age: 29,
    bio: 'Tech geek eager to attend hackathons and tech meetups.',
    interests: ['technology', 'coding', 'hackathons'],
  },
];

// Sample data for events
const eventList = [
  {
    title: 'Hiking at Crowders Mountain',
    description: 'Join us for a refreshing hike and enjoy breathtaking views.',
    location: {
      name: 'Crowders Mountain State Park',
      latitude: 35.2135,
      longitude: -81.2930,
    },
    totalSlots: 20,
    cost: 0.0,
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    imageUrl: 'https://via.placeholder.com/150',
    category: 'outdoors',
    keywords: ['hiking', 'nature', 'adventure'],
  },
  {
    title: 'Charlotte Art Class',
    description: 'An evening of painting and wine. All skill levels welcome!',
    location: {
      name: 'Uptown Charlotte Art Studio',
      latitude: 35.2271,
      longitude: -80.8431,
    },
    totalSlots: 15,
    cost: 25.0,
    date: new Date(Date.now() + 2 * 86400000).toISOString(), // In 2 days
    imageUrl: 'https://via.placeholder.com/150',
    category: 'arts',
    keywords: ['art', 'painting', 'creativity'],
  },
  {
    title: 'Charlotte Foodies Meetup',
    description: 'Explore the best eateries in Charlotte with fellow food lovers.',
    location: {
      name: 'Various Locations',
      latitude: 35.2271,
      longitude: -80.8431,
    },
    totalSlots: 25,
    cost: 10.0,
    date: new Date(Date.now() + 3 * 86400000).toISOString(), // In 3 days
    imageUrl: 'https://via.placeholder.com/150',
    category: 'social',
    keywords: ['food', 'meetup', 'restaurants'],
  },
];

// Function to create test users
async function createTestUsers() {
  console.log('Creating test users...');
  for (let i = 0; i < userProfiles.length; i++) {
    const profile = userProfiles[i];
    const email = `user${i}@cltmeet.com`;
    const password = 'Test@12345';

    try {
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: profile.name,
      });
      console.log(`✅ Created user: ${email}`);

      // Get ID Token for authentication
      const idToken = await signInUser(email, password);

      // Sign up via API
      await signUpUser(idToken, {
        name: profile.name,
        age: profile.age,
        bio: profile.bio,
      });

      // Store user info
      testUsers.push({ uid: userRecord.uid, email, idToken });
      successes.push(`Created and signed up user: ${email}`);

    } catch (error) {
      console.error(`❌ Error creating user ${email}:`, error.message);
      errors.push(`Error creating user ${email}: ${error.message}`);
    }
  }
}

// Function to sign in user and get ID Token
async function signInUser(email, password) {
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  try {
    const response = await axios.post(signInUrl, {
      email: email,
      password: password,
      returnSecureToken: true,
    });
    console.log(`🔑 Signed in user: ${email}`);
    return response.data.idToken;
  } catch (error) {
    console.error(`❌ Error signing in user ${email}:`, error.response.data.error.message);
    errors.push(`Error signing in user ${email}: ${error.response.data.error.message}`);
    return null;
  }
}

// Function to sign up user via API
async function signUpUser(idToken, userData) {
  try {
    const response = await axiosInstance.post('/signup', userData, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log(`✅ User signed up via API: ${userData.name}`);
    successes.push(`User signed up via API: ${userData.name}`);
  } catch (error) {
    console.error(`❌ Error signing up user via API:`, error.response ? error.response.data : error.message);
    errors.push(`Error signing up user via API: ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to create an admin user
async function createAdminUser() {
  console.log('Creating admin user...');
  const email = 'admin@cltmeet.com';
  const password = 'Admin@12345';

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: 'Admin User',
    });
    console.log(`✅ Created admin user: ${email}`);

    // Set custom claims to make the user an admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log(`✅ Set admin claims for user: ${email}`);

    // Get ID Token for authentication
    const idToken = await signInUser(email, password);

    successes.push(`Created and signed in admin user: ${email}`);
    return { uid: userRecord.uid, email, idToken };
  } catch (error) {
    console.error(`❌ Error creating admin user ${email}:`, error.message);
    errors.push(`Error creating admin user ${email}: ${error.message}`);
  }
}

// Function to create events via API
async function createEvents(adminIdToken) {
  console.log('Creating events...');
  for (const eventData of eventList) {
    try {
      const response = await axiosInstance.post('/events', eventData, {
        headers: {
          Authorization: `Bearer ${adminIdToken}`,
        },
      });
      console.log(`✅ Created event: ${eventData.title}`);
      testEvents.push(response.data.eventId);
      successes.push(`Created event: ${eventData.title}`);
    } catch (error) {
      console.error(`❌ Error creating event ${eventData.title}:`, error.response ? error.response.data : error.message);
      errors.push(`Error creating event ${eventData.title}: ${error.response ? error.response.data.error : error.message}`);
    }
  }
}

// Function to simulate user interactions
async function simulateInteractions() {
  console.log('Simulating user interactions...');
  // Upload profile pictures
  for (const user of testUsers) {
    await uploadProfilePicture(user.idToken, user.uid);
    await updateMainProfileImage(user.idToken, user.uid);
    await updateProfile(user.idToken, user.uid);
  }

  // Users register for events
  for (const user of testUsers) {
    for (const eventId of testEvents) {
      await registerForEvent(user.idToken, eventId);
    }
  }

  // Simulate matching between users
  for (let i = 0; i < testUsers.length; i++) {
    for (let j = i + 1; j < testUsers.length; j++) {
      await markSeen(testUsers[i], testUsers[j].uid, 'friend');
      await markSeen(testUsers[j], testUsers[i].uid, 'friend');
    }
  }

  // Simulate messaging between matched users
  for (const user of testUsers) {
    const matches = await getMatches(user.idToken);
    for (const match of matches) {
      await sendMessage(user.idToken, match.chatId, `Hi ${match.user.name}, I saw you're interested in ${userProfiles.find(u => u.uid === user.uid).interests[0]}!`);
    }
  }
}

// Function to upload profile picture
async function uploadProfilePicture(idToken, uid) {
  try {
    const imagePath = path.join(__dirname, 'testImage.jpg');
    if (!fs.existsSync(imagePath)) {
      throw new Error('testImage.jpg not found in script directory.');
    }
    const form = new FormData();
    form.append('avatar', fs.createReadStream(imagePath));

    const response = await axiosInstance.post('/uploadProfilePictures', form, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        ...form.getHeaders(),
      },
    });
    console.log(`✅ Uploaded profile picture for user ${uid}`);
    successes.push(`Uploaded profile picture for user ${uid}`);
  } catch (error) {
    console.error(`❌ Error uploading profile picture for user ${uid}:`, error.response ? error.response.data : error.message);
    errors.push(`Error uploading profile picture for user ${uid}: ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to update main profile image
async function updateMainProfileImage(idToken, uid) {
  try {
    // Assuming the user has at least one profile image
    const userProfile = await getUserProfile(idToken);
    const mainProfileImage = userProfile.profileImages[0];

    const response = await axiosInstance.post('/updateMainProfileImage', { mainProfileImage }, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log(`✅ Updated main profile image for user ${uid}`);
    successes.push(`Updated main profile image for user ${uid}`);
  } catch (error) {
    console.error(`❌ Error updating main profile image for user ${uid}:`, error.response ? error.response.data : error.message);
    errors.push(`Error updating main profile image for user ${uid}: ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to update user profile
async function updateProfile(idToken, uid) {
  try {
    const userIndex = testUsers.findIndex(user => user.uid === uid);
    const newBio = `${userProfiles[userIndex].bio} Looking forward to meeting new friends!`;

    const response = await axiosInstance.post('/updateProfile', {
      bio: newBio,
    }, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log(`✅ Updated profile for user ${uid}`);
    successes.push(`Updated profile for user ${uid}`);
  } catch (error) {
    console.error(`❌ Error updating profile for user ${uid}:`, error.response ? error.response.data : error.message);
    errors.push(`Error updating profile for user ${uid}: ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to register for an event
async function registerForEvent(idToken, eventId) {
  try {
    const response = await axiosInstance.post('/registerForEvent', { eventId }, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log(`✅ Registered for event ${eventId}`);
    successes.push(`Registered for event ${eventId}`);
  } catch (error) {
    console.error(`❌ Error registering for event ${eventId}:`, error.response ? error.response.data : error.message);
    errors.push(`Error registering for event ${eventId}: ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to mark another user as seen
async function markSeen(user, seenUserId, action) {
  try {
    const response = await axiosInstance.post('/markSeen', {
      seenUserId,
      action,
    }, {
      headers: {
        Authorization: `Bearer ${user.idToken}`,
      },
    });
    console.log(`✅ ${user.email} marked ${seenUserId} as ${action}`);
    successes.push(`${user.email} marked ${seenUserId} as ${action}`);
  } catch (error) {
    console.error(`❌ Error marking user as seen (${user.email} -> ${seenUserId}):`, error.response ? error.response.data : error.message);
    errors.push(`Error marking user as seen (${user.email} -> ${seenUserId}): ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to get matches
async function getMatches(idToken) {
  try {
    const response = await axiosInstance.get('/matches', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log(`✅ Retrieved matches for user`);
    successes.push(`Retrieved matches for user`);
    return response.data.matches;
  } catch (error) {
    console.error(`❌ Error getting matches:`, error.response ? error.response.data : error.message);
    errors.push(`Error getting matches: ${error.response ? error.response.data.error : error.message}`);
    return [];
  }
}

// Function to send a message
async function sendMessage(idToken, chatId, text) {
  try {
    const response = await axiosInstance.post(`/chats/${chatId}/messages`, { text }, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    console.log(`✅ Sent message in chat ${chatId}`);
    successes.push(`Sent message in chat ${chatId}`);
  } catch (error) {
    console.error(`❌ Error sending message in chat ${chatId}:`, error.response ? error.response.data : error.message);
    errors.push(`Error sending message in chat ${chatId}: ${error.response ? error.response.data.error : error.message}`);
  }
}

// Function to get user profile
async function getUserProfile(idToken) {
  try {
    const response = await axiosInstance.get('/getUserProfile', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error getting user profile:`, error.response ? error.response.data : error.message);
    errors.push(`Error getting user profile: ${error.response ? error.response.data.error : error.message}`);
    return null;
  }
}

// Function to clean up test data
async function cleanup() {
  console.log('Cleaning up test data...');
  // Delete test users
  for (const user of testUsers) {
    try {
      await admin.auth().deleteUser(user.uid);
      console.log(`🗑️ Deleted user ${user.email}`);
      successes.push(`Deleted user ${user.email}`);
    } catch (error) {
      console.error(`❌ Error deleting user ${user.email}:`, error.message);
      errors.push(`Error deleting user ${user.email}: ${error.message}`);
    }
  }

  // Delete admin user
  try {
    const adminUser = await admin.auth().getUserByEmail('admin@cltmeet.com');
    await admin.auth().deleteUser(adminUser.uid);
    console.log(`🗑️ Deleted admin user ${adminUser.email}`);
    successes.push(`Deleted admin user ${adminUser.email}`);
  } catch (error) {
    console.error(`❌ Error deleting admin user:`, error.message);
    errors.push(`Error deleting admin user: ${error.message}`);
  }

  // Delete test events
//   for (const eventId of testEvents) {
//     try {
//       await admin.firestore().collection('events').doc(eventId).delete();
//       console.log(`🗑️ Deleted event ${eventId}`);
//       successes.push(`Deleted event ${eventId}`);
//     } catch (error) {
//       console.error(`❌ Error deleting event ${eventId}:`, error.message);
//       errors.push(`Error deleting event ${eventId}: ${error.message}`);
//     }
//   }

  console.log('Cleanup completed.');
}

// Function to display summary
function displaySummary() {
  console.log('\n========== Summary ==========');
  console.log(`\n✅ Successes (${successes.length}):`);
  successes.forEach((success) => {
    console.log(` - ${success}`);
  });

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((error) => {
      console.log(` - ${error}`);
    });
  } else {
    console.log('\nNo errors encountered.');
  }
  console.log('=============================\n');
}

// Main function to run the script
(async function main() {
  try {
    // Create test users
    await createTestUsers();

    // Create admin user
    const adminUser = await createAdminUser();

    // Create events
    await createEvents(adminUser.idToken);

    // Simulate interactions
    await simulateInteractions();

  } catch (error) {
    console.error('❌ Error in main:', error.message);
    errors.push(`Error in main: ${error.message}`);
  } finally {
    // Clean up test data
    await cleanup();

    // Display summary
    displaySummary();

    // Exit process with appropriate status code
    if (errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
})();
