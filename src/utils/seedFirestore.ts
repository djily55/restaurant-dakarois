// src/utils/seedFirestore.ts
import { FirebaseError } from "firebase/app"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { setDoc, doc } from "firebase/firestore"
import { auth, db } from "../firebase"

// ------------------------------------------------------------
// 1. Données des catégories
// ------------------------------------------------------------
const categoriesData = [
  {
    id: "senegalais",
    nom: "Plats Sénégalais",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
    active: true,
    description: "Thiéboudienne, Yassa, Mafé, Dibi... Les saveurs authentiques",
  },
  {
    id: "boissons",
    nom: "Boissons",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80",
    active: true,
    description: "Jus de Bissap, Bouye, Jus de fruits frais",
  },
]

// ------------------------------------------------------------
// 2. Données des plats (menu)
// ------------------------------------------------------------
const menuData = [
  {
    id: "thieboudienne_royale",
    nom: "Thiéboudienne Royal",
    description: "Riz au poisson frais, légumes du marché",
    prix: 3500,
    categorie: "senegalais",
    repas: "Déjeuner",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
    disponible: true,
    commandes: 42,
    tag: "Best-seller",
  },
  {
    id: "yassa_poulet_dore",
    nom: "Yassa Poulet Doré",
    description: "Poulet fermier mariné 12h aux oignons",
    prix: 3000,
    categorie: "senegalais",
    repas: "Déjeuner",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80",
    disponible: true,
    commandes: 31,
  },
  {
    id: "jus_bissap",
    nom: "Jus de Bissap",
    description: "Jus d'hibiscus rouge frais",
    prix: 800,
    categorie: "boissons",
    repas: "Boissons",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
    disponible: true,
    commandes: 67,
    tag: "Incontournable",
  },
]

// ------------------------------------------------------------
// 3. Fonction principale
// ------------------------------------------------------------
export const seedFirestore = async () => {
  const adminEmail = "djily4402@gmail.com"
  const adminPassword = "DakaroisAdmin2025!"

  try {
    console.log("🌱 Début du peuplement...")

    // ── Étape 1 : Récupérer l'UID de l'admin ──────────────────────────────────
    let adminUid: string | null = null

    try {
      // Tentative de création
      const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
      adminUid = cred.user.uid
      console.log("✅ Admin créé dans Authentication")
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/email-already-in-use") {
        // L'admin existe déjà → on se connecte pour récupérer son UID
        console.log("ℹ️ Admin déjà existant — connexion pour récupérer l'UID...")
        try {
          const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
          adminUid = cred.user.uid
          console.log("✅ UID récupéré via connexion :", adminUid)
        } catch (loginErr) {
          if (loginErr instanceof FirebaseError) {
            console.error("❌ Impossible de se connecter pour récupérer l'UID :", loginErr.message)
          } else {
            console.error("❌ Erreur inconnue lors de la connexion :", loginErr)
          }
          console.warn("👉 Allez dans Firebase Console → Authentication → copiez l'UID manuellement.")
        }
      } else {
        throw err
      }
    }

    // ── Étape 2 : Créer/mettre à jour le document Firestore de l'admin ────────
    if (adminUid) {
      await setDoc(
        doc(db, "users", adminUid),
        {
          nom: "Djily Ndiaye",
          email: adminEmail,
          telephone: "+221 78 309 22 12",
          role: "admin",
          restaurant: "Le Dakarois",
          actif: true,
          commandes: 0,
          totalDepense: 0,
          dateCreation: new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
          createdAt: new Date(),
        },
        { merge: true }
      )
      console.log("✅ Document admin créé/mis à jour dans Firestore")
    }

    // ── Étape 3 : Catégories ──────────────────────────────────────────────────
    for (const cat of categoriesData) {
      await setDoc(doc(db, "categories", cat.id), cat)
      console.log(`✅ Catégorie "${cat.nom}" enregistrée`)
    }

    // ── Étape 4 : Plats ───────────────────────────────────────────────────────
    for (const item of menuData) {
      await setDoc(doc(db, "menu", item.id), item)
      console.log(`✅ Plat "${item.nom}" enregistré`)
    }

    console.log("🎉 Peuplement terminé !")
    console.log(`📧 Admin : ${adminEmail}`)
    console.log(`🔑 Mot de passe : ${adminPassword}`)
  } catch (error) {
    if (error instanceof FirebaseError) {
      console.error("❌ Erreur seed :", error.message)
    } else if (error instanceof Error) {
      console.error("❌ Erreur seed :", error.message)
    } else {
      console.error("❌ Erreur seed :", error)
    }
  }
}