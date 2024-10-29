// backend/server.js

const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: '../.env' }); // Load environment variables
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const Stripe = require('stripe'); // **Stripe Integration**
const morgan = require('morgan'); // HTTP request logger
const helmet = require('helmet'); // Security middleware
const rateLimit = require('express-rate-limit'); // Rate limiting
const redis = require('redis'); // **Redis for Caching**

const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH || './serviceAccount.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Initialize Stripe with secret key from environment variables
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

// Define storage for Multer (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype.toLowerCase());
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG and PNG images are allowed'));
  },
});

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const app = express();

// Middleware Setup
app.use(helmet()); // Secure HTTP headers
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse JSON bodies
app.use(morgan('combined')); // Log HTTP requests

// Rate Limiting to prevent brute-force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
//app.use(limiter);

// Middleware to verify Firebase ID Token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('No or malformed Authorization header provided');
    return res.status(401).send('Unauthorized: No token provided');
  }
  
  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error.message);
    return res.status(401).send('Unauthorized: Invalid token');
  }
}

// Middleware to check if user is admin
async function verifyAdmin(req, res, next) {
  const uid = req.uid;
  try {
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.customClaims && userRecord.customClaims.admin === true) {
      next();
    } else {
      return res.status(403).send('Forbidden: Admins only');
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).send('Internal Server Error');
  }
}

// Helper function for cache retrieval
async function getCachedData(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

// Helper function for cache setting
async function setCachedData(key, value, expirationInSeconds = 3600) {
  try {
    await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

// Root Endpoint
app.get('/', (req, res) => {
  res.send('CltMeet2 Backend is Running');
});

// ================== Image Handling Routes ================== //

/**
 * @route   POST /uploadProfilePictures
 * @desc    Upload single profile picture
 * @access  Private
 */
app.post('/uploadProfilePictures', verifyToken, upload.single('avatar'), async (req, res) => {
  const uid = req.uid;
  const file = req.file;

  if (!file) {
    return res.status(400).send({ error: 'No file uploaded' });
  }

  try {
    // Compress and resize the image
    const compressedImage = await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Generate a unique filename
    const filename = `${uid}_${Date.now()}_${file.originalname}`;
    const filepath = path.join(imagesDir, filename);

    // Save the image to the server
    fs.writeFileSync(filepath, compressedImage);

    // Generate the image URL
    const imageUrl = `/images/${filename}`;

    // Update user's profileImages array in Firestore
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      profileImages: admin.firestore.FieldValue.arrayUnion(imageUrl),
    });

    // Retrieve updated images
    const userDoc = await userRef.get();
    let updatedImages = userDoc.data().profileImages || [];

    // Set mainProfileImage if not set
    if (!userDoc.data().mainProfileImage) {
      await userRef.update({
        mainProfileImage: imageUrl,
      });
      updatedImages = [...updatedImages];
    }

    // Ensure only 5 images are stored
    if (updatedImages.length > 5) {
      updatedImages = updatedImages.slice(-5); // Keep the latest 5
      await userRef.update({
        profileImages: updatedImages,
      });
    }

    res.status(200).send({ message: 'Image uploaded successfully', profileImages: updatedImages, mainProfileImage: userDoc.data().mainProfileImage || imageUrl });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).send({ error: 'Error uploading profile picture' });
  }
});

/**
 * @route   POST /updateMainProfileImage
 * @desc    Update the main profile image for the user
 * @access  Private
 */
app.post('/updateMainProfileImage', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { mainProfileImage } = req.body;

  if (!mainProfileImage || typeof mainProfileImage !== 'string') {
    return res.status(400).send({ error: 'mainProfileImage must be a valid image URL.' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found.' });
    }

    const userData = userDoc.data();

    if (!userData.profileImages.includes(mainProfileImage)) {
      return res.status(400).send({ error: 'Image URL not found in user\'s profile images.' });
    }

    await userRef.update({
      mainProfileImage: mainProfileImage,
    });

    // Update cached user profile
    const updatedUserDoc = await userRef.get();
    await setCachedData(`userProfile:${uid}`, updatedUserDoc.data());

    // Denormalize matches if any
    const matchesSnapshot = await db.collection('matches')
      .where('users', 'array-contains', uid)
      .get();

    const batch = db.batch();
    matchesSnapshot.docs.forEach(doc => {
      const matchData = doc.data();
      if (matchData.userDetails && matchData.userDetails[uid]) {
        batch.update(doc.ref, {
          [`userDetails.${uid}.mainProfileImage`]: mainProfileImage,
        });
      }
    });
    await batch.commit();

    res.status(200).send({ message: 'Main profile image updated successfully.' });
  } catch (error) {
    console.error('Error updating main profile image:', error);
    res.status(500).send({ error: 'Error updating main profile image.' });
  }
});

/**
 * @route   DELETE /deleteProfileImage
 * @desc    Delete a specific profile image
 * @access  Private
 */
app.delete('/deleteProfileImage', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).send({ error: 'Image URL is required' });
  }

  try {
    // Extract filename from URL
    const filename = imageUrl.split('/images/')[1];
    const filepath = path.join(imagesDir, filename);

    // Delete the image file from the server
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    } else {
      console.warn('File does not exist:', filepath);
    }

    // Remove the image URL from Firestore
    await db.collection('users').doc(uid).update({
      profileImages: admin.firestore.FieldValue.arrayRemove(imageUrl),
    });

    // If the deleted image was the mainProfileImage, reset it
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (userData.mainProfileImage === imageUrl) {
      const newMainImage = userData.profileImages.length > 0 ? userData.profileImages[userData.profileImages.length - 1] : null;
      await db.collection('users').doc(uid).update({
        mainProfileImage: newMainImage,
      });

      // Update cached user profile
      const updatedUserDoc = await db.collection('users').doc(uid).get();
      await setCachedData(`userProfile:${uid}`, updatedUserDoc.data());

      // Denormalize matches if any
      const matchesSnapshot = await db.collection('matches')
        .where('users', 'array-contains', uid)
        .get();

      const batch = db.batch();
      matchesSnapshot.docs.forEach(doc => {
        const matchData = doc.data();
        if (matchData.userDetails && matchData.userDetails[uid]) {
          batch.update(doc.ref, {
            [`userDetails.${uid}.mainProfileImage`]: newMainImage,
          });
        }
      });
      await batch.commit();
    }

    res.status(200).send({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).send({ error: 'Error deleting image' });
  }
});

// Serve Images with Caching
app.use('/images', express.static(imagesDir, {
  maxAge: '7d', // Cache images for 7 days
  etag: false,
}));

// =========================================================== //

// ================== User Management Routes ================== //

/**
 * @route   POST /signup
 * @desc    Create user profile in Firestore after Firebase Auth
 * @access  Private
 */
app.post('/signup', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { name, age, bio } = req.body;

  try {
    // Retrieve user from Firebase
    const userRecord = await admin.auth().getUser(uid);

    // Check if user profile already exists
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return res.status(400).send({ error: 'User profile already exists' });
    }

    // Create Stripe Customer
    const customer = await stripe.customers.create({
      email: userRecord.email,
      metadata: {
        firebaseUid: uid,
      },
    });

    // Create user profile in Firestore with Stripe Customer ID
    await db.collection('users').doc(uid).set({
      uid: uid,
      email: userRecord.email,
      name: name || userRecord.email.split('@')[0], // Use provided name or default from email
      age: age || null,
      bio: bio || '',
      seenUsers: [],
      registeredEvents: {},
      profileImages: [], // Initialize empty array for profile images
      mainProfileImage: null, // Initialize as null
      stripeCustomerId: customer.id, // Store Stripe Customer ID
      paymentMethods: [], // Initialize empty array for payment methods
      totalMatches: 0, // Initialize aggregate field
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.status(200).send({ message: 'User profile created successfully' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// =========================================================== //

// ================== Payment Methods Routes ================== //

/**
 * @route   GET /payment-methods
 * @desc    Retrieve user's payment methods from Stripe
 * @access  Private
 */
app.get('/payment-methods', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    // Attempt to retrieve payment methods from cache
    const cachedPaymentMethods = await getCachedData(`paymentMethods:${uid}`);
    if (cachedPaymentMethods) {
      return res.status(200).send({ paymentMethods: cachedPaymentMethods });
    }

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

    // Cache the payment methods
    await setCachedData(`paymentMethods:${uid}`, paymentMethods.data, 3600); // Cache for 1 hour

    res.status(200).send({ paymentMethods: paymentMethods.data });
  } catch (error) {
    console.error('Error retrieving Payment Methods:', error);
    res.status(500).send({ error: 'Error retrieving Payment Methods' });
  }
});

/**
 * @route   POST /save-payment-method
 * @desc    Attach a payment method to the user's Stripe customer
 * @access  Private
 */
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

    // Invalidate cached payment methods
    await redisClient.del(`paymentMethods:${uid}`);

    res.status(200).send({ message: 'Payment Method saved successfully' });
  } catch (error) {
    console.error('Error saving Payment Method:', error);
    res.status(500).send({ error: 'Error saving Payment Method' });
  }
});

/**
 * @route   DELETE /payment-methods/:paymentMethodId
 * @desc    Detach and remove a payment method from the user's Stripe customer
 * @access  Private
 */
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

    // Invalidate cached payment methods
    await redisClient.del(`paymentMethods:${uid}`);

    res.status(200).send({ message: 'Payment Method deleted successfully.' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).send({ error: 'Error deleting payment method.' });
  }
});

// =========================================================== //

// ================== Admin Routes ================== //

/**
 * @route   POST /makeAdminByUID
 * @desc    Promote a user to admin by UID
 * @access  Admin Only
 */
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

/**
 * @route   POST /demoteUserByUID
 * @desc    Demote a user from admin by UID
 * @access  Admin Only
 */
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

/**
 * @route   GET /users
 * @desc    Retrieve all users (Admin Only)
 * @access  Admin Only
 */
app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000); // Adjust max results as needed
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      admin: user.customClaims && user.customClaims.admin ? true : false,
      totalMatches: user.customClaims && user.customClaims.totalMatches ? user.customClaims.totalMatches : 0,
    }));
    res.status(200).send({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).send({ error: 'Error fetching users' });
  }
});

/**
 * @route   DELETE /deleteUser
 * @desc    Delete a user by email (Admin Only)
 * @access  Admin Only
 */
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

/**
 * @route   DELETE /posts/:postId
 * @desc    Delete a post by ID (Admin Only)
 * @access  Admin Only
 */
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

/**
 * @route   GET /reports
 * @desc    Get all user reports (Admin Only)
 * @access  Admin Only
 */
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

/**
 * @route   GET /analytics
 * @desc    Get analytics data (Admin Only)
 * @access  Admin Only
 */
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

// =========================================================== //

// ================== Event Registration Routes ================== //

/**
 * @route   POST /registerForEvent
 * @desc    Register user for an event
 * @access  Private
 */
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

/**
 * @route   POST /unregisterForEvent
 * @desc    Unregister user from an event
 * @access  Private
 */
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

// =========================================================== //

// ================== Setup and Payment Intents ================== //

/**
 * @route   POST /create-setup-intent
 * @desc    Create a Stripe Setup Intent for saving payment methods
 * @access  Private
 */
app.post('/create-setup-intent', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    // Retrieve user's Stripe Customer ID from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    let stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create Stripe Customer if not exists
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

/**
 * @route   POST /create-payment-intent
 * @desc    Create a Stripe Payment Intent
 * @access  Private
 */
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

/**
 * @route   POST /purchaseTicket
 * @desc    Purchase a ticket for an event
 * @access  Private
 */
app.post('/purchaseTicket', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { eventId, paymentMethodId } = req.body;

  if (!eventId || !paymentMethodId) {
    return res.status(400).send({ error: 'Missing eventId or paymentMethodId.' });
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

      // Create a ticket record
      const ticketRef = await db.collection('tickets').add({
        userId: uid,
        eventId: eventId,
        purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethodId: paymentMethodId,
        amount: eventData.cost,
        status: 'confirmed',
      });

      // Invalidate cached event data if necessary
      await redisClient.del(`event:${eventId}`);

      res.status(200).send({ 
        message: 'Ticket purchased and registered for event successfully.',
        ticket: {
          id: ticketRef.id,
          eventId: eventId,
          purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          amount: eventData.cost,
          status: 'confirmed',
        },
      });
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

// =========================================================== //

// ================== Stripe Webhook Endpoint ================== //

/**
 * @route   POST /webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (Stripe will send events here)
 */
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
      console.log('PaymentIntent was successful:', paymentIntent.id);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// =========================================================== //

// ================== Matchmaking and Messaging Routes ================== //

/**
 * @route   GET /incomingMatches
 * @desc    Get incoming match requests for the user
 * @access  Private
 */
app.get('/incomingMatches', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const incomingMatchRequestsSnapshot = await db.collection('matchRequests')
      .where('to', '==', uid)
      .get();

    if (incomingMatchRequestsSnapshot.empty) {
      return res.status(200).send({ incomingMatches: [] });
    }

    const incomingMatches = [];

    const fromUids = incomingMatchRequestsSnapshot.docs.map(doc => doc.data().from);

    // Batch fetching in chunks of 10
    const batches = [];
    const uniqueFromUids = [...new Set(fromUids)]; // Remove duplicates
    while (uniqueFromUids.length) {
      const batch = uniqueFromUids.splice(0, 10);
      batches.push(db.collection('users').where('uid', 'in', batch).select('name', 'mainProfileImage').get());
    }

    const usersSnapshots = await Promise.all(batches);
    const usersMap = {};
    usersSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
    });

    incomingMatchRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      incomingMatches.push({
        requestId: doc.id,
        user: usersMap[data.from] || null,
        type: data.type, // 'friend' or 'romantic'
      });
    });

    res.status(200).send({ incomingMatches });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   GET /profiles
 * @desc    Get swipe profiles for the user
 * @access  Private
 */
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

    // Adjust exclusion logic using a compound query
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

app.post('/markSeen', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { seenUserId, action } = req.body; // action can be 'pass', 'friend', 'romantic'

  if (!seenUserId || !['pass', 'friend', 'romantic'].includes(action)) {
    return res.status(400).send({ error: 'Invalid request parameters.' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const seenUserRef = db.collection('users').doc(seenUserId);
    const incomingMatchRef = db.collection('matchRequests').doc(`${seenUserId}_${uid}`);
    const outgoingMatchRef = db.collection('matchRequests').doc(`${uid}_${seenUserId}`);
    const matchRef = db.collection('matches').doc();
    const chatRef = db.collection('chats').doc();

    await db.runTransaction(async (transaction) => {
      const [userDoc, seenUserDoc, incomingMatchDoc, outgoingMatchDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(seenUserRef),
        transaction.get(incomingMatchRef),
        transaction.get(outgoingMatchRef),
      ]);

      const userData = userDoc.data();
      const seenUserData = seenUserDoc.data();

      if (!userData || !seenUserData) {
        throw new Error('User data not found.');
      }

      transaction.update(userRef, {
        seenUsers: admin.firestore.FieldValue.arrayUnion(seenUserId),
      });

      if (action === 'friend' || action === 'romantic') {
        if (incomingMatchDoc.exists && incomingMatchDoc.data().type === action) {
          // Mutual match found
          const incomingData = incomingMatchDoc.data();

          transaction.set(matchRef, {
            users: [uid, seenUserId],
            type: action,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userDetails: {
              [uid]: {
                name: userData.name || '',
                mainProfileImage: userData.mainProfileImage || '',
              },
              [seenUserId]: {
                name: incomingData.fromUserName || seenUserData.name || '',
                mainProfileImage: incomingData.fromUserMainProfileImage || seenUserData.mainProfileImage || '',
              },
            },
            chatId: chatRef.id,
          });

          // Delete both match requests
          transaction.delete(incomingMatchRef);
          if (outgoingMatchDoc.exists) {
            transaction.delete(outgoingMatchRef);
          }

          // Create chat
          transaction.set(chatRef, {
            users: [uid, seenUserId],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Create an outgoing match request
          transaction.set(outgoingMatchRef, {
            from: uid,
            to: seenUserId,
            type: action,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            fromUserName: userData.name || '',
            fromUserMainProfileImage: userData.mainProfileImage || '',
          });
        }
      }
    });

    res.status(200).send({ message: 'User marked as seen and processed accordingly.' });
  } catch (error) {
    console.error('Error in markSeen:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


/**
 * @route   GET /matches
 * @desc    Get all matches for the user
 * @access  Private
 */
app.get('/matches', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const matchesSnapshot = await db.collection('matches')
      .where('users', 'array-contains', uid)
      .get();

    if (matchesSnapshot.empty) {
      return res.status(200).send({ matches: [] });
    }

    const matches = [];

    matchesSnapshot.forEach(doc => {
      const data = doc.data();
      const otherUserId = data.users.find(id => id !== uid);
      const otherUserDetails = data.userDetails ? data.userDetails[otherUserId] : null;

      matches.push({
        matchId: doc.id,
        user: otherUserDetails,
        mainProfileImage: otherUserDetails ? otherUserDetails.mainProfileImage : null,
        type: data.type,
        chatId: data.chatId,
      });
    });

    res.status(200).send({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   GET /outgoingMatches
 * @desc    Get all outgoing match requests for the user
 * @access  Private
 */
app.get('/outgoingMatches', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const matchRequestsSnapshot = await db.collection('matchRequests')
      .where('from', '==', uid)
      .get();

    if (matchRequestsSnapshot.empty) {
      return res.status(200).send({ outgoingMatches: [] });
    }

    const outgoingMatches = [];

    const toUids = matchRequestsSnapshot.docs.map(doc => doc.data().to);

    // Batch fetching in chunks of 10
    const batches = [];
    const uniqueToUids = [...new Set(toUids)]; // Remove duplicates
    while (uniqueToUids.length) {
      const batch = uniqueToUids.splice(0, 10);
      batches.push(db.collection('users').where('uid', 'in', batch).select('name', 'mainProfileImage').get());
    }

    const usersSnapshots = await Promise.all(batches);
    const usersMap = {};
    usersSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
    });

    matchRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      outgoingMatches.push({
        requestId: doc.id,
        user: usersMap[data.to] || null,
        type: data.type,
      });
    });

    res.status(200).send({ outgoingMatches });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   DELETE /matchRequests/:requestId
 * @desc    Cancel a match request
 * @access  Private
 */
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

/**
 * @route   DELETE /matches/:matchId
 * @desc    Delete a match and associated chat
 * @access  Private
 */
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

    const otherUserId = matchData.users.find(id => id !== uid);

    await matchRef.delete();

    // Delete associated chat
    if (matchData.chatId) {
      const chatRef = db.collection('chats').doc(matchData.chatId);
      await chatRef.delete();
    }

    res.status(200).send({ message: 'Match and associated chat deleted successfully.' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   POST /denyMatch
 * @desc    Deny an incoming match request
 * @access  Private
 */
app.post('/denyMatch', verifyToken, async (req, res) => {
  const uid = req.uid;
  const { matchId, fromUserId } = req.body;

  if (!matchId || !fromUserId) {
    return res.status(400).send({ error: 'Invalid request parameters.' });
  }

  try {
    const incomingMatchRef = db.collection('matchRequests').doc(`${fromUserId}_${uid}`);
    const incomingMatchDoc = await incomingMatchRef.get();

    if (!incomingMatchDoc.exists) {
      return res.status(404).send({ error: 'Match request not found.' });
    }

    // Delete the incoming match request
    await incomingMatchRef.delete();

    res.status(200).send({ message: 'Match request denied successfully.' });
  } catch (error) {
    console.error('Error denying match:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// =========================================================== //

// ================== Chats Routes ================== //

/**
 * @route   GET /chats
 * @desc    Get all chats for the user
 * @access  Private
 */
app.get('/chats', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const registeredEvents = userData.registeredEvents || {};

    // Fetch individual chats (matches)
    const matchesSnapshot = await db.collection('matches')
      .where('users', 'array-contains', uid)
      .get();

    const individualChats = matchesSnapshot.docs.map(doc => {
      const data = doc.data();
      const otherUserId = data.users.find(id => id !== uid);
      const otherUserDetails = data.userDetails ? data.userDetails[otherUserId] : null;
      return {
        chatId: data.chatId || `chat_${doc.id}`, // Ensure chatId is present
        name: otherUserDetails ? otherUserDetails.name : 'Unknown',
        type: data.type, // 'friend' or 'romantic'
      };
    });

    // Fetch group chats (if any)
    const groupChatsSnapshot = await db.collection('groupChats').get();
    const groupChats = groupChatsSnapshot.docs.map(doc => ({
      chatId: doc.id,
      name: doc.data().name,
      type: 'group',
    }));

    // Fetch event chats based on user's registered events
    const eventChats = [];
    const eventIds = Object.keys(registeredEvents);
    if (eventIds.length > 0) {
      // Batch fetching in chunks of 10
      const batches = [];
      while (eventIds.length) {
        const batch = eventIds.splice(0, 10);
        batches.push(db.collection('events').where(admin.firestore.FieldPath.documentId(), 'in', batch).select('title').get());
      }

      const eventsSnapshots = await Promise.all(batches);
      eventsSnapshots.forEach(snapshot => {
        snapshot.forEach(doc => {
          eventChats.push({
            chatId: `event_${doc.id}`,
            name: doc.data().title,
            type: 'event',
          });
        });
      });
    }

    // Combine all chats
    const allChats = [...individualChats, ...groupChats, ...eventChats];

    res.status(200).send({ chats: allChats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   GET /chats/:chatId/messages
 * @desc    Get all messages for a specific chat
 * @access  Private
 */
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

    const messages = messagesSnapshot.docs.map(doc => doc.data());

    res.status(200).send({ messages });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   POST /chats/:chatId/messages
 * @desc    Send a message in a specific chat
 * @access  Private
 */
app.post('/chats/:chatId/messages', verifyToken, async (req, res) => {
  const uid = req.uid;
  const chatId = req.params.chatId;
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).send({ error: 'Message text is required and must be a string.' });
  }

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

// =========================================================== //

// ================== User Profile Routes ================== //

/**
 * @route   GET /getUserProfile
 * @desc    Get authenticated user's profile along with tickets
 * @access  Private
 */
app.get('/getUserProfile', verifyToken, async (req, res) => {
  const uid = req.uid;

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }
    const userData = userDoc.data();

    // Fetch user's tickets
    const ticketsSnapshot = await db.collection('tickets').where('userId', '==', uid).get();
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Prepare the response data
    const responseData = {
      ...userData,
      uid: uid,
      tickets: tickets,
    };

    res.status(200).send(responseData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(400).send({ error: error.message });
  }
});


/**
 * @route   POST /updateProfile
 * @desc    Update authenticated user's profile
 * @access  Private
 */
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

    // Fetch updated user data
    const updatedUserDoc = await db.collection('users').doc(uid).get();
    const updatedUserData = updatedUserDoc.data();

    // Update cache
    await setCachedData(`userProfile:${uid}`, updatedUserData, 3600); // Cache for 1 hour

    // Denormalize matches if any
    const matchesSnapshot = await db.collection('matches')
      .where('users', 'array-contains', uid)
      .get();

    const batch = db.batch();
    matchesSnapshot.docs.forEach(doc => {
      const matchData = doc.data();
      if (matchData.userDetails && matchData.userDetails[uid]) {
        batch.update(doc.ref, {
          [`userDetails.${uid}.name`]: updatedUserData.name || matchData.userDetails[uid].name,
          [`userDetails.${uid}.mainProfileImage`]: updatedUserData.mainProfileImage || matchData.userDetails[uid].mainProfileImage,
        });
      }
    });
    await batch.commit();

    res.status(200).send({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   GET /publicProfile/:userId
 * @desc    Get public profile of a user
 * @access  Private
 */
app.get('/publicProfile/:userId', verifyToken, async (req, res) => {
  const uid = req.uid; // Current authenticated user
  const otherUserId = req.params.userId;

  if (uid === otherUserId) {
    return res.status(400).send({ error: 'Cannot view your own profile in PublicProfileScreen.' });
  }

  try {
    const userDoc = await db.collection('users').doc(otherUserId).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Optionally, exclude sensitive information
    const publicProfile = {
      name: userData.name,
      bio: userData.bio,
      profileImages: userData.profileImages,
      age: userData.age,
      // Add other public fields as necessary
    };

    res.status(200).send(publicProfile);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).send({ error: 'Error fetching public profile' });
  }
});

// =========================================================== //

// ================== Event Management Routes ================== //

/**
 * @route   GET /events
 * @desc    Get all events with support for searching, filtering, sorting, and pagination
 * @access  Private
 */
app.get('/events', verifyToken, async (req, res) => {
  try {
    const { search, type, sortBy, order, page = 1, limit = 10 } = req.query;

    // Sanitize and validate input
    const sanitizedSearch = search ? search.toLowerCase() : '';
    const sanitizedType = type ? type.toLowerCase() : 'all';
    const validSortBy = ['date', 'cost', 'registeredCount'];
    const sanitizedSortBy = validSortBy.includes(sortBy) ? sortBy : 'date';
    const sanitizedOrder = order === 'desc' ? 'desc' : 'asc';
    const pageNumber = parseInt(page) > 0 ? parseInt(page) : 1;
    const pageLimit = parseInt(limit) > 0 && parseInt(limit) <= 100 ? parseInt(limit) : 10;

    const cacheKey = `events:${sanitizedSearch}:${sanitizedType}:${sanitizedSortBy}:${sanitizedOrder}:${pageNumber}:${pageLimit}`;
    const cachedEvents = await getCachedData(cacheKey);
    if (cachedEvents) {
      return res.status(200).send({ events: cachedEvents, cached: true });
    }

    let query = db.collection('events');

    // Search by keywords
    if (sanitizedSearch) {
      query = query.where('keywords', 'array-contains', sanitizedSearch);
    }

    // Filter by category/type
    if (sanitizedType !== 'all') {
      query = query.where('category', '==', sanitizedType);
    }

    // Sorting
    query = query.orderBy(sanitizedSortBy, sanitizedOrder);

    // Pagination
    const snapshot = await query.limit(pageLimit).get();

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Cache the fetched events
    await setCachedData(cacheKey, events, 300); // Cache for 5 minutes

    res.status(200).send({ events, cached: false });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(400).send({ error: 'Failed to fetch events' });
  }
});

function generateKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.match(/\b\w+\b/g) || [];
  const uniqueWords = Array.from(new Set(words));
  return uniqueWords;
}


/**
 * @route   POST /events
 * @desc    Create a new event (Admin Only)
 * @access  Admin Only
 */
app.post('/events', verifyToken, verifyAdmin, async (req, res) => {
  const { title, description, location, totalSlots, cost, date, imageUrl, category } = req.body;

  // Validate required fields
  if (!title || !description || !location || !totalSlots || !cost || !date || !category) {
    return res.status(400).send({ error: 'Missing required event fields.' });
  }

  try {
    // Generate keywords for search (simple implementation)
    const keywords = generateKeywords(title, description);

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
      category: category.toLowerCase(),
      keywords, // For search functionality
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Invalidate cached events
    await redisClient.del('events:*'); // Use pattern matching if supported, else delete specific keys as needed

    res.status(200).send({ message: 'Event created', eventId: eventRef.id });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

/**
 * @route   GET /events/:id
 * @desc    Retrieve a single event by ID
 * @access  Private
 */
app.get('/events/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const eventDoc = await db.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      return res.status(404).send({ error: 'Event not found' });
    }

    const eventData = { id: eventDoc.id, ...eventDoc.data() };
    res.status(200).send({ event: eventData });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).send({ error: 'Error fetching event' });
  }
});

// =========================================================== //

// ================== Additional Admin and Utility Routes ================== //

// Admin HTML Interface
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve Static Files for Admin Interface
app.use('/static', express.static(path.join(__dirname, 'public')));

// Serve Admin Dashboard (Optional)
app.get('/admin/dashboard', verifyToken, verifyAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// =========================================================== //

// ================== Start the Server ================== //

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
module.exports = app;
