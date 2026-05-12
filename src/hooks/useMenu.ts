// src/hooks/useMenu.ts
import { useState, useEffect } from "react"
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore"
import { db } from "../firebase"

export interface MenuItem {
  id: string
  nom: string
  description: string
  prix: number
  categorie: string
  repas: string
  image: string
  disponible: boolean
  commandes: number
}

export const useMenu = () => {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "menu"), orderBy("nom"))
    const unsub = onSnapshot(q, (snapshot) => {
      setMenu(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const addPlat = async (data: Omit<MenuItem, "id" | "commandes">) => {
    await addDoc(collection(db, "menu"), {
      ...data, commandes: 0, createdAt: serverTimestamp()
    })
  }

  const updatePlat = async (id: string, data: Partial<MenuItem>) => {
    await updateDoc(doc(db, "menu", id), data)
  }

  const deletePlat = async (id: string) => {
    await deleteDoc(doc(db, "menu", id))
  }

  const toggleDispo = async (id: string, disponible: boolean) => {
    await updateDoc(doc(db, "menu", id), { disponible: !disponible })
  }

  return { menu, loading, addPlat, updatePlat, deletePlat, toggleDispo }
}