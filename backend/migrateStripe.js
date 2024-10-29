// backend/migrateStripeCustomers.js

const admin = require('firebase-admin');
const Stripe = require('stripe');
require('dotenv').config();

const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const migrateStripeCustomers = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      if (!userData.stripeCustomerId) {
        // Create Stripe Customer
        const customer = await stripe.customers.create({
          email: userData.email,
          metadata: {
            firebaseUid: userData.uid,
          },
        });

        // Update Firestore with Stripe Customer ID
        await db.collection('users').doc(doc.id).update({
          stripeCustomerId: customer.id,
        });

        console.log(`Stripe Customer created for user: ${userData.email}`);
      } else {
        console.log(`User already has Stripe Customer ID: ${userData.email}`);
      }
    }
    console.log('Migration completed successfully.');
    process.exit();
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

migrateStripeCustomers();
