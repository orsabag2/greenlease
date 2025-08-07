import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDetmgUsuXFd5S-b4-3CoUluh32WdRFvcI",
  authDomain: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? "lease-18ed6.firebaseapp.com" 
    : "auth.greenlease.me",
  projectId: "lease-18ed6",
  messagingSenderId: "740646580319",
  appId: "1:740646580319:web:ec51ad8ecd4e887471abea",
  measurementId: "G-1JRTRH7KTB"
};

// Only initialize if not already initialized
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Disable reCAPTCHA for phone authentication in development
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  // This disables reCAPTCHA for testing - only use in development
  auth.settings.appVerificationDisabledForTesting = true;
  console.log('reCAPTCHA disabled for development');
}

export const googleProvider = new GoogleAuthProvider();

// Note: appVerificationDisabledForTesting should only be used with fictional test phone numbers
// For real phone numbers, we need proper reCAPTCHA verification

googleProvider.addScope('openid');
googleProvider.addScope('email');

// Set custom parameters for production domain
if (typeof window !== 'undefined' && window.location.hostname === 'greenlease.me') {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
    // This will help show the custom domain in the modal
    login_hint: 'greenlease.me'
  });
} 

// Helper function to initialize reCAPTCHA for phone auth with improved settings
export const initializeRecaptcha = (containerId: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Clear any existing reCAPTCHA instances
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      existingContainer.innerHTML = '';
    }

    // Create a user-friendly reCAPTCHA configuration for real phone numbers
    const recaptchaConfig = {
      size: 'invisible',
      callback: () => {
        console.log('reCAPTCHA solved successfully');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      },
      // User-friendly configuration
      'badge': 'bottomright',
      'isolated': true,
      // Add timeout to prevent hanging
      'timeout-callback': () => {
        console.log('reCAPTCHA timeout');
      },
      // Force invisible mode
      'cleanup': true,
      'render': 'explicit',
      // Additional parameters to make it less aggressive
      'data-callback': () => {
        console.log('reCAPTCHA data callback');
      },
      // Force invisible behavior
      'data-size': 'invisible',
      'data-theme': 'light',
      'data-type': 'image',
      // Additional parameters to reduce visual challenges
      'data-action': 'phone_auth',
      // Add parameters that might help reduce challenges
      'data-badge': 'bottomright',
      'data-isolated': true
    };

    return new RecaptchaVerifier(auth, containerId, recaptchaConfig);
  } catch (error) {
    console.error('Failed to initialize reCAPTCHA:', error);
    return null;
  }
};

// Alternative function for creating a minimal reCAPTCHA
export const createMinimalRecaptcha = (containerId: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Aggressively clear any existing reCAPTCHA instances
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      // Remove all child elements
      existingContainer.innerHTML = '';
      
      // Also remove any reCAPTCHA iframes that might be attached to the document
      const recaptchaIframes = document.querySelectorAll('iframe[src*="recaptcha"]');
      recaptchaIframes.forEach(iframe => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      });
      
      // Remove any reCAPTCHA scripts that might be lingering
      const recaptchaScripts = document.querySelectorAll('script[src*="recaptcha"]');
      recaptchaScripts.forEach(script => {
        if (script.parentNode && script.getAttribute('data-firebase-recaptcha')) {
          script.parentNode.removeChild(script);
        }
      });
    }

    // Create a more robust reCAPTCHA configuration for Firebase
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => console.log('Minimal reCAPTCHA solved'),
      'expired-callback': () => console.log('Minimal reCAPTCHA expired'),
      'error-callback': () => console.log('Minimal reCAPTCHA error'),
      // Additional settings to make it more compatible
      'badge': 'bottomright',
      'isolated': true,
      // Add explicit parameters for better compatibility
      'render': 'explicit',
      'cleanup': true
    });
  } catch (error) {
    console.error('Failed to create minimal reCAPTCHA:', error);
    return null;
  }
}; 