/* ========================================
   FILE: js/config.js
   ======================================== */
// Replace these with your actual Firebase config values
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZWc3hzb3J4o-Q50cU0n6Bnm_IAq5bAL0",
  authDomain: "rto-services-kerala-b6194.firebaseapp.com",
  projectId: "rto-services-kerala-b6194",
  storageBucket: "rto-services-kerala-b6194.firebasestorage.app",
  messagingSenderId: "356809548058",
  appId: "1:356809548058:web:7de509a457b3fa723f4ca3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.log('The current browser does not support persistence.');
    }
  });

