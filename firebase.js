import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// More detailed logging of environment variables
console.log('Environment Variables Status:', {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ? 'Present' : 'Missing',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'Present' : 'Missing',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID ? 'Present' : 'Missing'
});

// Log actual values (remove in production)
console.log('Firebase Config Values:', {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
});

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing required fields');
  throw new Error('Firebase configuration is missing required fields');
}

let db;
let auth;
try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { db, auth }; 