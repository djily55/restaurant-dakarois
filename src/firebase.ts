// src/firebase.ts
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyC3cNYw0lswkbNa0ZcceMaOORgKOr5sZ8k",
  authDomain: "restaurant-dakarois.firebaseapp.com",
  projectId: "restaurant-dakarois",
  storageBucket: "restaurant-dakarois.firebasestorage.app",
  messagingSenderId: "923351476635",
  appId: "1:923351476635:web:62094901380981c939993e"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export default app