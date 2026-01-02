import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBVqlE55a2CUDmy_0NRWyL-eHE-ptz3Jo0",
  authDomain: "snowy-hr-report.firebaseapp.com",
  databaseURL: "https://snowy-hr-report-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "snowy-hr-report",
  storageBucket: "snowy-hr-report.firebasestorage.app",
  messagingSenderId: "827350144699",
  appId: "1:827350144699:web:c26b2e18bf3765cb877b9e",
  measurementId: "G-JG5WXG2JWS"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, onValue };