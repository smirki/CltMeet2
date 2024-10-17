// setAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json'); // Update the path if necessary

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = 'admin@cltmeet.com'; // Replace with your admin user's email

admin
  .auth()
  .getUserByEmail(email)
  .then((user) => {
    return admin.auth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log(`User ${email} has been made an admin.`);
    process.exit();
  })
  .catch((error) => {
    console.error('Error making user admin:', error);
    process.exit(1);
  });