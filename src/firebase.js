// Replace with your Firebase config
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAlnXe77jPBcxdZcdsfJ4NN0RRvt4xhAcI",
  authDomain: "crm-system-4d9c3.firebaseapp.com",
  projectId: "crm-system-4d9c3",
  storageBucket: "crm-system-4d9c3.firebasestorage.app",
  messagingSenderId: "183139724570",
  appId: "1:183139724570:web:e734df8dbe31de9b10d0a3",
  measurementId: "G-PL87TSRH0F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);