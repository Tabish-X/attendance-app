import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsXA9HdP38BQWV9UjJGHuy5LakWuWQvJA",
  authDomain: "attendance-management-31824.firebaseapp.com",
  projectId: "attendance-management-31824",
  storageBucket: "attendance-management-31824.firebasestorage.app",
  messagingSenderId: "109261863462",
  appId: "1:109261863462:web:6b4fffbcf45b22d11ec4e7",
  measurementId: "G-P8N1CYXEG6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
