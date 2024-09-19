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

// Initialize Firebase Admin SDK with dynamic service account path
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || './path/to/serviceAccountKey.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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
  
        const imageUrl = `http://192.168.1.143:3000/images/${filename}`;
  
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

// Sign Up
app.post('/signup', async (req, res) => {
  const { email, password, age, bio } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Create user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name: email.split('@')[0], // Default name from email
      age: age || null,
      bio: bio || '',
      seenUsers: [],
      registeredEvents: {},
      imageUrl: 'https://via.placeholder.com/150', // Default avatar
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

//Events
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
  
      // Combine current UID with seenUsers
      const excludedUserIds = [uid, ...seenUsers.slice(0, 9)]; // Max 10 elements
  
      let query = db.collection('users').orderBy('uid').limit(pageSize);
  
      // Exclude current user and seen users
      query = query.where('uid', 'not-in', excludedUserIds);
  
      if (lastVisible) {
        const lastDoc = await db.collection('users').doc(lastVisible).get();
        query = query.startAfter(lastDoc);
      }
  
      const snapshot = await query.get();
  
      const profiles = [];
      snapshot.forEach((doc) => {
        profiles.push(doc.data());
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

// Get User Profile
app.get('/getUserProfile', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
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

// Create Event (Admin only)
app.post('/events', verifyToken, verifyAdmin, async (req, res) => {
  const { title, description } = req.body;

  try {
    const eventRef = await db.collection('events').add({
      title,
      description,
      registeredCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send({ message: 'Event created', eventId: eventRef.id });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Delete Event (Admin only)
app.delete('/events/:id', verifyToken, verifyAdmin, async (req, res) => {
  const eventId = req.params.id;

  try {
    await db.collection('events').doc(eventId).delete();
    res.status(200).send({ message: 'Event deleted' });
  } catch (error) {
    res.status(400).send({ error: error.message });
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
