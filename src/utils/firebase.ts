import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDetmgUsuXFd5S-b4-3CoUluh32WdRFvcI",
  authDomain: "lease-18ed6.firebaseapp.com",
  projectId: "lease-18ed6",
  storageBucket: "lease-18ed6.firebasestorage.app",
  messagingSenderId: "740646580319",
  appId: "1:740646580319:web:ec51ad8ecd4e887471abea",
  measurementId: "G-1JRTRH7KTB"
};

// Only initialize if not already initialized
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('openid');
googleProvider.addScope('email'); 