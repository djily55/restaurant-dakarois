// src/hooks/useOrders.ts
import { useState, useEffect } from "react"
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, Timestamp
} from "firebase/firestore"
import { db } from "../firebase"

export interface OrderItem { nom: string; quantite: number; prix: number }

export interface Order {
  id: string
  client: string
  telephone: string
  email: string
  adresse: string
  table: string
  type: "livraison" | "emporter" | "table"
  items: OrderItem[]
  statut: "En attente" | "En cuisine" | "Prêt" | "En livraison" | "Livré"
  total: number
  createdAt: Timestamp | null
  userId?: string
}

// ── HOOK TEMPS RÉEL (dashboard admin) ──
export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
      setOrders(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const updateStatut = async (id: string, statut: Order["statut"]) => {
    await updateDoc(doc(db, "orders", id), { statut })
  }

  return { orders, loading, updateStatut }
}

// ── FONCTION PASSER UNE COMMANDE (côté client) ──
export const passerCommande = async (orderData: Omit<Order, "id" | "createdAt">) => {
  const docRef = await addDoc(collection(db, "orders"), {
    ...orderData,
    statut: "En attente",
    createdAt: serverTimestamp(),
  })
  return docRef.id
}