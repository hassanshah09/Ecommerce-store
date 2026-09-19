// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCyQjUsc2Wwnz70w3g-GXLPcEX2uMUA_Ow",
  authDomain: "ecommercesite-af89c.firebaseapp.com",
  projectId: "ecommercesite-af89c",
  storageBucket: "ecommercesite-af89c.firebasestorage.app",
  messagingSenderId: "500671597622",
  appId: "1:500671597622:web:5c112f77a26ea887489c97",
  measurementId: "G-6X9K94M2HK",
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
          console.log("[Firebase] Initialized for project: ecommercesite-af89c");
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
