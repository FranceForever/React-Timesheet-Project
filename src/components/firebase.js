// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiNnEnCfqJBjlF2hJdwPaSUdpSlzVH48o",
  authDomain: "hdfcproj-87b74.firebaseapp.com",
  projectId: "hdfcproj-87b74",
  storageBucket: "hdfcproj-87b74.appspot.com",
  messagingSenderId: "345348280687",
  appId: "1:345348280687:web:dd6d38db55a093192a189a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth();
export const db=getFirestore(app);
export default app;