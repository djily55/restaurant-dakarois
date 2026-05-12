// src/utils/seedFirestore.ts
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "../firebase"

export const seedFirestore = async () => {
  try {
    const email = "djily4402@gmail.com"
    const password = "DakaroisAdmin2025!"   // ← vous pourrez le changer après
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, "users", cred.user.uid), {
      nom: "Djily Ndiaye",
      email: email,
      telephone: "+221 78 309 22 12",
      role: "admin",
      restaurant: "Le Dakarois",
      actif: true,
      commandes: 0,
      totalDepense: 0,
      dateCreation: new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      createdAt: new Date()
    })
    console.log("✅ Admin créé avec succès !")
    console.log(`📧 ${email} | 🔑 ${password}`)
  }  catch (err: unknown) {
    const code = (err as { code?: string })?.code
    const message = (err as { message?: string })?.message
    if (code === "auth/email-already-in-use") {
      console.error("❌ Cet email est déjà utilisé.")
    } else {
      console.error("❌ Erreur :", message)
    }
  }
}