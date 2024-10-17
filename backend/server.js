// server.js

const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config(); // Load environment variables
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const Stripe = require('stripe'); // **New: Import Stripe**


// Initialize Firebase Admin SDK with dynamic service account path
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || './path/to/serviceAccountKey.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Initialize Stripe with secret key from environment variables
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Define storage for Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Store this securely
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'your_firebase_api_key'; // Replace with your Firebase project's web API key

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn('No Authorization header provided');
      return res.status(401).send('Unauthorized: No token provided');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn('Authorization header malformed');
      return res.status(401).send('Unauthorized: No token provided');
    }
    
    console.log('Received JWT Token:', token); // Log the token
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(401).send('Unauthorized: Invalid token');
      }
      req.uid = decoded.uid;
      next();
    });
  }
  

// Middleware to check if user is admin
function verifyAdmin(req, res, next) {
  const uid = req.uid;
  admin
    .auth()
    .getUser(uid)
    .then((userRecord) => {
      if (userRecord.customClaims && userRecord.customClaims.admin === true) {
        next();
      } else {
        return res.status(403).send('Forbidden: Admins only');
      }
    })
    .catch((error) => {
      console.error('Error fetching user data:', error);
      return res.status(500).send('Internal Server Error');
    });
}

app.get('/payment-methods', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    // Retrieve user's Stripe Customer ID and Payment Methods from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;
    const paymentMethodIds = userData.paymentMethods || [];

    if (!stripeCustomerId) {
      return res.status(400).send({ error: 'Stripe Customer ID not found' });
    }

    // Fetch Payment Methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    res.status(200).send({ paymentMethods: paymentMethods.data });
  } catch (error) {
    console.error('Error retrieving Payment Methods:', error);
    res.status(500).send({ error: 'Error retrieving Payment Methods' });
  }
});


// Endpoint to save Payment Method
// Endpoint to save Payment Method
// server.js (Backend)

// Save Payment Method
app.post('/save-payment-method', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { paymentMethodId } = req.body;

  // Validate paymentMethodId
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return res.status(400).send({ error: 'Payment Method ID must be a non-empty string.' });
  }

  try {
    // Retrieve user's Stripe Customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      return res.status(400).send({ error: 'Stripe Customer ID not found' });
    }

    // Attach Payment Method to Stripe Customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    // Optionally, set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Store Payment Method ID in Firestore
    await db.collection('users').doc(uid).update({
      paymentMethods: admin.firestore.FieldValue.arrayUnion(paymentMethodId),
    });

    res.status(200).send({ message: 'Payment Method saved successfully' });
  } catch (error) {
    console.error('Error saving Payment Method:', error);
    res.status(500).send({ error: 'Error saving Payment Method' });
  }
});





// Upload Profile Picture
app.post('/uploadProfilePicture', verifyToken, upload.single('avatar'), async (req, res) => {
    const uid = req.uid;
    const file = req.file;
  
    if (!file) {
      return res.status(400).send({ error: 'No file uploaded' });
    }
  
    try {
      // Compress and save the image
      const filename = `${uid}_${Date.now()}.jpg`;
      const filepath = path.join(imagesDir, filename);
  
      await sharp(file.buffer)
        .resize(150, 150) // Resize to 150x150 pixels
        .jpeg({ quality: 80 }) // Compress the image
        .toFile(filepath);
  
        const imageUrl = `http://1:3000/images/${filename}`;
  
      // Update user's profile with new image URL
      await db.collection('users').doc(uid).update({
        imageUrl: imageUrl,
      });
  
      res.status(200).send({ message: 'Profile picture uploaded', imageUrl: imageUrl });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).send({ error: 'Error uploading profile picture' });
    }
  });
  

  app.post('/refresh-token', verifyToken, async (req, res) => {
    const { token } = req.body;

    try {
      // Verify the existing token
      const decoded = jwt.verify(token, JWT_SECRET);
      const uid = decoded.uid;

      // Optionally, verify if the user still exists or has necessary permissions

      // Generate a new token
      const newToken = jwt.sign({ uid }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.status(200).send({ token: newToken });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(401).send({ error: 'Invalid token' });
    }
});

// Admin Login
app.post('/adminLogin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Authenticate admin user using Firebase Authentication REST API
    const apiKey = process.env.FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY';

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { localId } = response.data;

    // Check if user is admin
    const userRecord = await admin.auth().getUser(localId);
    if (userRecord.customClaims && userRecord.customClaims.admin === true) {
      // Generate JWT Token
      const token = jwt.sign({ uid: localId }, JWT_SECRET, {
        expiresIn: '7d',
      });
      res.status(200).send({ token });
    } else {
      res.status(403).send({ error: 'Unauthorized: Not an admin' });
    }
  } catch (error) {
    res.status(400).send({ error: error.response ? error.response.data.error.message : error.message });
  }
});

// Make User Admin
app.post('/makeAdmin', verifyToken, verifyAdmin, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    res.status(200).send({ message: `${email} has been made an admin.` });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Delete User
app.delete('/deleteUser', verifyToken, verifyAdmin, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    // Optionally delete user data from Firestore
    await db.collection('users').doc(user.uid).delete();
    res.status(200).send({ message: `${email} has been deleted.` });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Example Stripe Webhook Endpoint
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Fulfill the purchase, e.g., register the user for the event
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

app.delete('/payment-methods/:paymentMethodId', verifyToken, async (req, res) => {
  const uid = req.uid;
  const paymentMethodId = req.params.paymentMethodId;

  if (!paymentMethodId) {
    return res.status(400).send({ error: 'Payment Method ID is required.' });
  }

  try {
    // Retrieve user's Stripe Customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      return res.status(400).send({ error: 'Stripe Customer ID not found' });
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    // Remove the payment method ID from Firestore
    await db.collection('users').doc(uid).update({
      paymentMethods: admin.firestore.FieldValue.arrayRemove(paymentMethodId),
    });

    res.status(200).send({ message: 'Payment Method deleted successfully.' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).send({ error: 'Error deleting payment method.' });
  }
});



// Sign Up
// Sign Up Endpoint
// Sign Up Endpoint
app.post('/signup', async (req, res) => {
  const { email, password, age, bio } = req.body;

  try {
    // Create Firebase User
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Create Stripe Customer
    const customer = await stripe.customers.create({
      email: userRecord.email,
      metadata: {
        firebaseUid: userRecord.uid,
      },
    });

    // Create user profile in Firestore with Stripe Customer ID
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: email.split('@')[0], // Default name from email
      age: age || null,
      bio: bio || '',
      seenUsers: [],
      registeredEvents: {},
      imageUrl: 'https://via.placeholder.com/150', // Default avatar
      stripeCustomerId: customer.id, // Store Stripe Customer ID
      paymentMethods: [], // Initialize empty array for payment methods
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});


// Events
app.post('/registerForEvent', verifyToken, async (req, res) => {
    const uid = req.uid;
    const { eventId } = req.body;
  
    try {
      // Update user's registeredEvents
      await db.collection('users').doc(uid).update({
        [`registeredEvents.${eventId}`]: true,
      });
  
      // Increment event's registeredCount
      await db.collection('events').doc(eventId).update({
        registeredCount: admin.firestore.FieldValue.increment(1),
      });
  
      res.status(200).send({ message: 'Registered for event' });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });

  app.post('/unregisterForEvent', verifyToken, async (req, res) => {
    const uid = req.uid;
    const { eventId } = req.body;
  
    try {
      // Remove event from user's registeredEvents
      await db.collection('users').doc(uid).update({
        [`registeredEvents.${eventId}`]: admin.firestore.FieldValue.delete(),
      });
  
      // Decrement event's registeredCount
      await db.collection('events').doc(eventId).update({
        registeredCount: admin.firestore.FieldValue.increment(-1),
      });
  
      res.status(200).send({ message: 'Unregistered from event' });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });
  

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Use Firebase Authentication REST API to verify password
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { localId } = response.data;

    // Generate JWT Token
    const token = jwt.sign({ uid: localId }, JWT_SECRET, {
      expiresIn: '7d',
    });
    console.log('worked');

    res.status(200).send({ token });
  } catch (error) {
    res.status(400).send({ error: error.response ? error.response.data.error.message : error.message });
  }
});

app.get('/incomingMatches', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const incomingMatchRequestsSnapshot = await db.collection('matchRequests')
      .where('to', '==', uid)
      .get();

    const incomingMatches = [];

    for (const doc of incomingMatchRequestsSnapshot.docs) {
      const data = doc.data();
      const userDoc = await db.collection('users').doc(data.from).get();
      const userData = userDoc.data();
      incomingMatches.push({
        requestId: doc.id,
        user: userData,
        type: data.type, // 'friend' or 'romantic'
      });
    }

    res.status(200).send({ incomingMatches });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get Swipe Profiles
app.get('/profiles', verifyToken, async (req, res) => {
  const uid = req.uid;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const lastVisible = req.query.lastVisible || null;

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const seenUsers = userData.seenUsers || [];

    // Adjust exclusion logic
    let query = db.collection('users').orderBy('uid').limit(pageSize);

    if (lastVisible) {
      const lastDoc = await db.collection('users').doc(lastVisible).get();
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    const profiles = [];
    snapshot.forEach((doc) => {
      if (doc.id !== uid && !seenUsers.includes(doc.id)) {
        profiles.push(doc.data());
      }
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    res.status(200).send({
      profiles,
      lastVisible: lastDoc ? lastDoc.id : null,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(400).send({ error: error.message });
  }
});

// Make User Admin by UID
app.post('/makeAdminByUID', verifyToken, verifyAdmin, async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
      return res.status(400).send({ error: 'User UID is required' });
  }

  try {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      res.status(200).send({ message: 'User has been promoted to admin.' });
  } catch (error) {
      console.error('Error promoting user to admin:', error);
      res.status(500).send({ error: 'Error promoting user to admin' });
  }
});

// Demote User Admin by UID
app.post('/demoteUserByUID', verifyToken, verifyAdmin, async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
      return res.status(400).send({ error: 'User UID is required' });
  }

  try {
      // Remove admin claims
      await admin.auth().setCustomUserClaims(uid, { admin: false });
      res.status(200).send({ message: 'User has been demoted from admin.' });
  } catch (error) {
      console.error('Error demoting user from admin:', error);
      res.status(500).send({ error: 'Error demoting user from admin' });
  }
});


// Get all users (Admin only)
app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
      const listUsersResult = await admin.auth().listUsers(1000); // Adjust max results as needed
      const users = listUsersResult.users.map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          admin: user.customClaims && user.customClaims.admin ? true : false,
      }));
      res.status(200).send({ users });
  } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).send({ error: 'Error fetching users' });
  }
});

// Delete Post (Admin only)
app.delete('/posts/:postId', verifyToken, verifyAdmin, async (req, res) => {
  const postId = req.params.postId;

  try {
      await db.collection('posts').doc(postId).delete();
      res.status(200).send({ message: 'Post deleted successfully.' });
  } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).send({ error: 'Error deleting post' });
  }
});

// Get User Reports (Admin only)
app.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
  try {
      const reportsSnapshot = await db.collection('reports').get();
      const reports = reportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      }));
      res.status(200).send({ reports });
  } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).send({ error: 'Error fetching reports' });
  }
});


// Update User Profile
app.post('/updateProfile', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { name, age, bio, registeredEvents } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (bio !== undefined) updateData.bio = bio;
    if (registeredEvents !== undefined) updateData.registeredEvents = registeredEvents;

    await db.collection('users').doc(uid).update(updateData);
    res.status(200).send({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get Analytics Data (Admin only)
app.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
      const usersSnapshot = await db.collection('users').get();
      const eventsSnapshot = await db.collection('events').get();
      const matchesSnapshot = await db.collection('matches').get();

      const analytics = {
          totalUsers: usersSnapshot.size,
          totalEvents: eventsSnapshot.size,
          totalMatches: matchesSnapshot.size,
          // Add more metrics as needed
      };

      res.status(200).send({ analytics });
  } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).send({ error: 'Error fetching analytics' });
  }
});


// Get User Profile
app.get('/getUserProfile', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    console.log(`Fetching profile for UID: ${uid}`);
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    res.status(200).send(userDoc.data());
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Mark User as Seen and Handle Match Requests
app.post('/markSeen', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { seenUserId, action } = req.body; // action can be 'pass', 'friend', 'romantic'

  try {
    // Update seenUsers
    await db.collection('users').doc(uid).update({
      seenUsers: admin.firestore.FieldValue.arrayUnion(seenUserId),
    });

    if (action === 'friend' || action === 'romantic') {
      // Create or update match request
      const matchRequestRef = db.collection('matchRequests').doc(`${uid}_${seenUserId}`);
      await matchRequestRef.set({
        from: uid,
        to: seenUserId,
        type: action,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check if there's a reciprocal match request
      const reciprocalMatchRequestRef = db.collection('matchRequests').doc(`${seenUserId}_${uid}`);
      const reciprocalMatchRequestDoc = await reciprocalMatchRequestRef.get();

      if (reciprocalMatchRequestDoc.exists) {
        // Create a match
        const matchRef = db.collection('matches').doc();
        await matchRef.set({
          users: [uid, seenUserId],
          type: action, // You might want to handle different types
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Delete match requests
        await matchRequestRef.delete();
        await reciprocalMatchRequestRef.delete();

        // Create chat
        const chatRef = db.collection('chats').doc();
        await chatRef.set({
          users: [uid, seenUserId],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).send({ message: 'Matched', chatId: chatRef.id });
      }
    }

    res.status(200).send({ message: 'User marked as seen' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get Matches
app.get('/matches', verifyToken, async (req, res) => {
    const uid = req.uid;
  
    try {
      const matchesSnapshot = await db.collection('matches')
        .where('users', 'array-contains', uid)
        .get();
  
      const matches = [];
  
      for (const doc of matchesSnapshot.docs) {
        const data = doc.data();
        const otherUserId = data.users.find((id) => id !== uid);
        const userDoc = await db.collection('users').doc(otherUserId).get();
        const userData = userDoc.data();
  
        // Find the chat between the two users
        const chatSnapshot = await db.collection('chats')
          .where('users', 'in', [[uid, otherUserId], [otherUserId, uid]])
          .limit(1)
          .get();
  
        let chatId = null;
        if (!chatSnapshot.empty) {
          chatId = chatSnapshot.docs[0].id;
        }
  
        matches.push({
          matchId: doc.id,
          user: userData,
          type: data.type,
          chatId: chatId,
        });
      }
  
      res.status(200).send({ matches });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });

// Outgoing Matches
// Get Outgoing Matches
app.get('/outgoingMatches', verifyToken, async (req, res) => {
    const uid = req.uid;
  
    try {
      const matchRequestsSnapshot = await db.collection('matchRequests')
        .where('from', '==', uid)
        .get();
  
      const outgoingMatches = [];
  
      for (const doc of matchRequestsSnapshot.docs) {
        const data = doc.data();
        const userDoc = await db.collection('users').doc(data.to).get();
        const userData = userDoc.data();
        outgoingMatches.push({
          requestId: doc.id,
          user: userData,
          type: data.type,
        });
      }
  
      res.status(200).send({ outgoingMatches });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });

// Cancel Match Request
app.delete('/matchRequests/:requestId', verifyToken, async (req, res) => {
    const uid = req.uid;
    const requestId = req.params.requestId;
  
    try {
      const matchRequestRef = db.collection('matchRequests').doc(requestId);
      const matchRequestDoc = await matchRequestRef.get();
  
      if (!matchRequestDoc.exists) {
        return res.status(404).send({ error: 'Match request not found' });
      }
  
      const matchRequestData = matchRequestDoc.data();
  
      if (matchRequestData.from !== uid) {
        return res.status(403).send({ error: 'Unauthorized' });
      }
  
      await matchRequestRef.delete();
  
      res.status(200).send({ message: 'Match request canceled' });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });

// Delete Match
app.delete('/matches/:matchId', verifyToken, async (req, res) => {
  const uid = req.uid;
  const matchId = req.params.matchId;

  try {
    const matchRef = db.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return res.status(404).send({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();

    if (!matchData.users.includes(uid)) {
      return res.status(403).send({ error: 'Unauthorized' });
    }

    await matchRef.delete();

    // Optionally delete the associated chat
    const chatsSnapshot = await db.collection('chats')
      .where('users', 'array-contains', uid)
      .get();

    chatsSnapshot.forEach(async (doc) => {
      const chatData = doc.data();
      if (chatData.users.includes(matchData.users[0]) && chatData.users.includes(matchData.users[1])) {
        await db.collection('chats').doc(doc.id).delete();
      }
    });

    res.status(200).send({ message: 'Match deleted' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get Chats
app.get('/chats', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const chatsSnapshot = await db.collection('chats')
      .where('users', 'array-contains', uid)
      .get();

    const chats = [];

    for (const doc of chatsSnapshot.docs) {
      const data = doc.data();
      const otherUserId = data.users.find((id) => id !== uid);
      const userDoc = await db.collection('users').doc(otherUserId).get();
      const userData = userDoc.data();
      chats.push({
        chatId: doc.id,
        user: userData,
      });
    }

    res.status(200).send({ chats });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get Messages for a Chat
app.get('/chats/:chatId/messages', verifyToken, async (req, res) => {
  const uid = req.uid;
  const chatId = req.params.chatId;

  try {
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return res.status(404).send({ error: 'Chat not found' });
    }

    const chatData = chatDoc.data();

    if (!chatData.users.includes(uid)) {
      return res.status(403).send({ error: 'Unauthorized' });
    }

    const messagesSnapshot = await chatRef.collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map((doc) => doc.data());

    res.status(200).send({ messages });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get('/verifyToken', verifyToken, (req, res) => {
    // If we reach here, the token is valid
    res.status(200).send({ isValid: true, message: 'Token is valid' });
  });

// Send Message in a Chat
app.post('/chats/:chatId/messages', verifyToken, async (req, res) => {
    const uid = req.uid;
    const chatId = req.params.chatId;
    const { text } = req.body;
  
    try {
      const chatRef = db.collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
  
      if (!chatDoc.exists) {
        return res.status(404).send({ error: 'Chat not found' });
      }
  
      const chatData = chatDoc.data();
  
      if (!chatData.users.includes(uid)) {
        return res.status(403).send({ error: 'Unauthorized' });
      }
  
      await chatRef.collection('messages').add({
        senderId: uid,
        text,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  
      res.status(200).send({ message: 'Message sent' });
    } catch (error) {
      res.status(400).send({ error: error.message });
    }
  });

// Get Events
app.get('/events', verifyToken, async (req, res) => {
  try {
    const eventsSnapshot = await db.collection('events').get();
    const events = eventsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).send({ events });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// **New: Create Event with Enhanced Details (Admin only)**
app.post('/events', verifyToken, verifyAdmin, async (req, res) => {
  const { title, description, location, totalSlots, cost, date, imageUrl } = req.body;

  // Validate required fields
  if (!title || !description || !location || !totalSlots || !cost || !date) {
    return res.status(400).send({ error: 'Missing required event fields.' });
  }

  try {
    const eventRef = await db.collection('events').add({
      title,
      description,
      location: {
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      totalSlots: totalSlots,
      registeredCount: 0,
      cost: cost,
      date: new Date(date), // Ensure date is stored as a timestamp
      imageUrl: imageUrl || 'https://via.placeholder.com/150', // Default image if not provided
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send({ message: 'Event created', eventId: eventRef.id });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// **New: Delete Event (Admin only)**
app.delete('/events/:id', verifyToken, verifyAdmin, async (req, res) => {
  const eventId = req.params.id;

  try {
    await db.collection('events').doc(eventId).delete();
    res.status(200).send({ message: 'Event deleted' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.post('/create-setup-intent', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    // Retrieve user's Stripe Customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      return res.status(400).send({ error: 'Stripe Customer ID not found' });
    }

    // Create Setup Intent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.status(200).send({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating Setup Intent:', error);
    res.status(500).send({ error: 'Error creating Setup Intent' });
  }
});

// **New: Create Payment Intent (Authenticated Users)**
// **New: Create Payment Intent (Authenticated Users)**
// Create Payment Intent
app.post('/create-payment-intent', verifyToken, async (req, res) => {
  const { amount } = req.body; // Amount in cents

  if (!amount || typeof amount !== 'number') {
    return res.status(400).send({ error: 'Invalid or missing amount.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.status(200).send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send({ error: 'Error creating payment intent' });
  }
});



// **New: Purchase Ticket (Handle Payment Confirmation and Event Registration)**
// server.js (Backend)

// Modify Purchase Ticket Endpoint
// Purchase Ticket Endpoint
// Purchase Ticket Endpoint
app.post('/purchaseTicket', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { eventId, paymentMethodId } = req.body;

  if (!eventId) {
    return res.status(400).send({ error: 'Missing eventId.' });
  }

  try {
    // Retrieve user's Stripe Customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      return res.status(400).send({ error: 'Stripe Customer ID not found' });
    }

    // Retrieve Event Details
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).send({ error: 'Event not found' });
    }
    const eventData = eventDoc.data();

    // Check if event has available slots
    if (eventData.registeredCount >= eventData.totalSlots) {
      return res.status(400).send({ error: 'Event is fully booked' });
    }

    // Calculate amount (assuming cost is in USD)
    const amount = Math.round(eventData.cost * 100); // Convert to cents

    // Create Payment Intent with saved Payment Method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        eventId: eventId,
        uid: uid,
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Register the user for the event
      await db.collection('users').doc(uid).update({
        [`registeredEvents.${eventId}`]: true,
      });

      await db.collection('events').doc(eventId).update({
        registeredCount: admin.firestore.FieldValue.increment(1),
      });

      res.status(200).send({ message: 'Ticket purchased and registered for event successfully.' });
    } else {
      res.status(400).send({ error: 'Payment not successful.' });
    }
  } catch (error) {
    if (error.code === 'authentication_required') {
      // Payment requires authentication
      res.status(400).send({ error: 'Authentication required for payment.' });
    } else if (error.type === 'StripeCardError') {
      // Handle specific Stripe card errors
      res.status(400).send({ error: error.message });
    } else {
      console.error('Error purchasing ticket:', error);
      res.status(500).send({ error: 'Error processing ticket purchase.' });
    }
  }
});



// server.js (Backend)

app.post('/create-setup-intent', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    // Retrieve user's Stripe Customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      // Prompt user to create a Stripe Customer
      // Optionally, create a Stripe Customer here
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          firebaseUid: userData.uid,
        },
      });

      // Update Firestore with Stripe Customer ID
      await db.collection('users').doc(uid).update({
        stripeCustomerId: customer.id,
      });

      // Assign the newly created customer ID
      stripeCustomerId = customer.id;
    }

    // Create Setup Intent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.status(200).send({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating Setup Intent:', error);
    res.status(500).send({ error: 'Error creating Setup Intent' });
  }
});



// Admin HTML interface
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static files for admin interface
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
