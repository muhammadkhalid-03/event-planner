// Firebase configuration and initialization - client-side only
const firebaseConfig = {
  apiKey: "AIzaSyAwYsGp9Xe285dlhz8Zcr8JocksMwcO7U4",
  authDomain: "event-planner-15f30.firebaseapp.com",
  projectId: "event-planner-15f30",
  storageBucket: "event-planner-15f30.firebasestorage.app",
  messagingSenderId: "176118488840",
  appId: "1:176118488840:web:cada2857800a30fbf716bd",
  measurementId: "G-GHVHND3K1S"
};

// Initialize Firebase only on client side
let app: any = null;
let auth: any = null;
let analytics: any = null;

const initializeFirebase = async () => {
  if (typeof window === "undefined") {
    return { app: null, auth: null, analytics: null };
  }

  if (!app) {
    try {
      const { initializeApp } = await import("firebase/app");
      const { getAuth } = await import("firebase/auth");
      
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);

      // Initialize Analytics if available
      try {
        const { getAnalytics } = await import("firebase/analytics");
        analytics = getAnalytics(app);
      } catch (error) {
        console.warn("Firebase Analytics not available:", error);
      }
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }

  return { app, auth, analytics };
};

// Authentication functions
export const signInWithPassword = async (password: string): Promise<any> => {
  const { auth } = await initializeFirebase();
  if (!auth) throw new Error("Firebase not initialized");

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const email = "testdemoeventplannerapp@gmail.com";
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOutUser = async (): Promise<void> => {
  const { auth } = await initializeFirebase();
  if (!auth) throw new Error("Firebase not initialized");

  const { signOut } = await import("firebase/auth");
  await signOut(auth);
};

export const getFirebaseAuth = async () => {
  const { auth } = await initializeFirebase();
  return auth;
};

export const getFirebaseAnalytics = async () => {
  const { analytics } = await initializeFirebase();
  return analytics;
};

export { initializeFirebase };
export default initializeFirebase;