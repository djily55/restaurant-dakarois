// src/hooks/useAdminUsers.ts
import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { db, auth } from "../firebase"

export interface AdminUser {
  id: string
  nom: string
  email: string
  role: "admin" | "serveur" | "cuisinier" | "livreur"
  actif: boolean
  dateCreation: string
  telephone?: string
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["admin", "serveur", "cuisinier", "livreur"]))
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser))
      setUsers(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const addUser = async (nom: string, email: string, password: string, role: AdminUser["role"], telephone?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const userData: AdminUser = {
      id: cred.user.uid,
      nom,
      email,
      role,
      actif: true,
      dateCreation: new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      telephone,
    }
    await setDoc(doc(db, "users", cred.user.uid), userData)
    return cred.user
  }

  const updateUser = async (id: string, data: Partial<AdminUser>) => {
    await updateDoc(doc(db, "users", id), data)
  }

  // Suppression "logique" : actif = false + suppression du document (ou on garde actif false)
  // Ici on supprime complètement le document Firestore.
  const deleteUser = async (id: string) => {
    await deleteDoc(doc(db, "users", id))
  }

  return { users, loading, addUser, updateUser, deleteUser }
}