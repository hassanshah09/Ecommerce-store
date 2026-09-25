// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyDfxfReGcxr9pjQ3LHGnH1r7iKL2xE4MMc",
  authDomain: "ecomerce-c938e.firebaseapp.com",
  projectId: "ecomerce-c938e",
  storageBucket: "ecomerce-c938e.firebasestorage.app",
  messagingSenderId: "806577884848",
  appId: "1:806577884848:web:ed713979d39a28fd80f575",
  measurementId: "G-MF7RLPGZ5T",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Firestore and Auth
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Initialize Analytics safely
let analyticsInstance: Analytics | null = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        try {
          analyticsInstance = getAnalytics(app);
          console.log("[Firebase] Initialized for project: ecomerce-c938e");
        } catch (err) {
          console.warn("[Firebase Analytics] Initialization notice:", err);
        }
      }
    })
    .catch(() => {
      // Analytics not supported in current environment
    });
}

export const analytics = analyticsInstance;

/**
 * Helper to log analytics events safely
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (analyticsInstance) {
    try {
      logEvent(analyticsInstance, eventName, eventParams);
    } catch {
      // ignore
    }
  }
}
