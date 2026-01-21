import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyC5ryMxdEPpQdVxTzF_l36mNxqwXcyn4M4",
    authDomain: "happy-archive-8de0f.firebaseapp.com",
    projectId: "happy-archive-8de0f",
    storageBucket: "happy-archive-8de0f.firebasestorage.app",
    messagingSenderId: "383075227177",
    appId: "1:383075227177:web:53f465cce7e3ae0b866e38",
    measurementId: "G-WNEVB27KZ1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
