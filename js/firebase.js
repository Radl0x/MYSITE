// Configurazione web pubblica Firebase. Le chiavi web non sono credenziali admin.
// La sicurezza reale è demandata a Firebase Authentication e alle regole Firestore.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwkfxQgNjeOJvUeJAx6QB6kjhTq3FihMY",
  authDomain: "studio-83022.firebaseapp.com",
  projectId: "studio-83022",
  storageBucket: "studio-83022.firebasestorage.app",
  messagingSenderId: "100866933046",
  appId: "1:100866933046:web:c8b3938c6e9be76a4d7397",
  measurementId: "G-80KRVQVSCL"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
