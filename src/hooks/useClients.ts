// src/hooks/useClients.ts
import { useState, useEffect } from "react"
import {
  collection, doc, setDoc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc
} from "firebase/firestore"
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth"
import { auth, db } from "../firebase"

export interface ClientProfile {
  id: string; nom: string; email: string; telephone: string
  adresse: string; commandes: number; totalDepense: number
  dateInscription: string; role: "client"
}

// ── HOOK LISTE CLIENTS (admin) ──
export const useClients = () => {
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalDepense", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as ClientProfile))
        .filter((u) => (u as ClientProfile & { role: string }).role === "client")
      setClients(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { clients, loading }
}

// ── INSCRIPTION CLIENT ──
export const inscrireClient = async (nom: string, email: string, password: string, telephone: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: nom })
  await setDoc(doc(db, "users", cred.user.uid), {
    nom, email, telephone,
    adresse: "",
    commandes: 0,
    totalDepense: 0,
    role: "client",
    dateInscription: new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
    createdAt: serverTimestamp(),
  })
  return cred.user
}

// ── PROFIL CLIENT ──
export const getClientProfile = async (uid: string): Promise<ClientProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid))
  if (snap.exists()) return { id: uid, ...snap.data() } as ClientProfile
  return null
}

// ── MAJ STATS CLIENT après commande ──
export const updateClientStats = async (uid: string, montant: number) => {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data()
    await updateDoc(ref, {
      commandes: (data.commandes || 0) + 1,
      totalDepense: (data.totalDepense || 0) + montant,
    })
  }
}