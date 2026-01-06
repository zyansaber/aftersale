import { initializeApp } from "firebase/app";
import { getDatabase, ref as databaseRef, get, set, update, child, push } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, listAll } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingEnvVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingEnvVars.join(", ")}. Check your .env configuration.`
  );
}

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app, "gs://snowy-hr-report.firebasestorage.app");

export {
  database,
  databaseRef as ref,
  databaseRef,
  get,
  set,
  child,
  push,
  update,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
};
