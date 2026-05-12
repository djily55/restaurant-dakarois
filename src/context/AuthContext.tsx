// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser
} from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, Timestamp } from "firebase/firestore"
import { auth, db } from "../firebase"

export interface UserProfile {
  id: string
  nom: string
  email: string
  role: "admin" | "serveur" | "cuisinier" | "livreur" | "client"
  telephone?: string
  adresse?: string
  commandes?: number
  totalDepense?: number
  dateInscription?: string | Timestamp
  actif?: boolean
  createdAt?: Timestamp
}

interface AuthContextType {
  user: UserProfile | null
  firebaseUser: FirebaseUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (nom: string, email: string, password: string, telephone: string) => Promise<boolean>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
  updateUserStats: (montant: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Fonction utilitaire : charge le profil depuis Firestore ──────────────────
// On passe fbUser directement pour ne pas dépendre du state React (qui est async)
const loadUserProfile = async (fbUser: FirebaseUser): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", fbUser.uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      let dateInscription = data.dateInscription
      if (dateInscription && typeof dateInscription.toDate === "function") {
        dateInscription = dateInscription.toDate().toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
      }
      return {
        id: fbUser.uid,
        nom: data.nom,
        email: data.email,
        role: data.role,
        telephone: data.telephone,
        adresse: data.adresse,
        commandes: data.commandes || 0,
        totalDepense: data.totalDepense || 0,
        dateInscription,
        actif: data.actif,
        createdAt: data.createdAt,
      }
    } else {
      // Document absent → on le crée automatiquement avec le rôle "client"
      await setDoc(doc(db, "users", fbUser.uid), {
        nom: fbUser.displayName || fbUser.email?.split("@")[0] || "Client",
        email: fbUser.email,
        role: "client",
        actif: true,
        commandes: 0,
        totalDepense: 0,
        createdAt: serverTimestamp(),
        dateInscription: serverTimestamp(),
      })
      // Recharger après création
      return await loadUserProfile(fbUser)
    }
  } catch (error) {
    console.error("Erreur loadUserProfile:", error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // refreshUser utilise firebaseUser depuis le state — OK pour les appels manuels
  // après que onAuthStateChanged ait déjà mis le state à jour.
  const refreshUser = async () => {
    if (!firebaseUser) return
    const profile = await loadUserProfile(firebaseUser)
    if (profile) setUser(profile)
  }

  const updateUserStats = async (montant: number) => {
    if (!firebaseUser) return
    try {
      const userRef = doc(db, "users", firebaseUser.uid)
      await updateDoc(userRef, {
        commandes: increment(1),
        totalDepense: increment(montant),
      })
      await refreshUser()
    } catch (error) {
      console.error("Erreur updateUserStats:", error)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (fbUser) {
        // ✅ On passe fbUser directement — pas besoin du state React
        const profile = await loadUserProfile(fbUser)
        setUser(profile)
      } else {
        setUser(null)
      }

      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
  try {
    await signInWithEmailAndPassword(auth, email, password)
    return true
  } catch (error: unknown) {
    console.error("Login error:", error)
    // Retourner false sans lancer d'exception
    return false
  }
}

  const register = async (nom: string, email: string, password: string, telephone: string): Promise<boolean> => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: nom })
      await setDoc(doc(db, "users", credential.user.uid), {
        nom,
        email,
        telephone,
        adresse: "",
        commandes: 0,
        totalDepense: 0,
        role: "client",
        actif: true,
        createdAt: serverTimestamp(),
        dateInscription: serverTimestamp(),
      })
      return true
    } catch (error) {
      console.error("Register error:", error)
      return false
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        resetPassword,
        refreshUser,
        updateUserStats,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}