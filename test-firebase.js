const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Make sure this matches your JSON file name

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testFirebase() {
  try {
    // 1. Get all users
    console.log('Fetching users...');
    const usersSnapshot = await admin.auth().listUsers();
    console.log('Found users:', usersSnapshot.users.map(user => ({
      email: user.email,
      uid: user.uid
    })));

    // 2. Test reading habits for the first user (if any exist)
    if (usersSnapshot.users.length > 0) {
      const userId = usersSnapshot.users[0].uid;
      console.log('\nTesting habits collection for user:', userId);
      const habitsSnapshot = await db.collection('habits')
        .where('userId', '==', userId)
        .get();
      
      console.log('Found habits:', habitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // 3. Test reading user profile in different ways
      console.log('\nSearching for user profile...');
      
      // Search by userId
      console.log('\nSearching by userId:', userId);
      const userProfileByUid = await db.collection('users')
        .where('userId', '==', userId)
        .get();
      console.log('Found by userId:', userProfileByUid.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Search by email
      console.log('\nSearching by email:', usersSnapshot.users[0].email);
      const userProfileByEmail = await db.collection('users')
        .where('email', '==', usersSnapshot.users[0].email)
        .get();
      console.log('Found by email:', userProfileByEmail.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // List all documents in users collection
      console.log('\nListing all documents in users collection:');
      const allUsers = await db.collection('users').get();
      console.log('All users:', allUsers.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Delete the empty profile if it exists
      const emptyProfile = userProfileByUid.docs.find(doc => 
        doc.data().firstName === '' && 
        doc.data().age === '' && 
        doc.data().createdAt
      );

      if (emptyProfile) {
        console.log('\nDeleting empty profile:', emptyProfile.id);
        await db.collection('users').doc(emptyProfile.id).delete();
        console.log('Empty profile deleted successfully');
      }
    } else {
      console.log('No users found in the database');
    }

  } catch (error) {
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

testFirebase(); 