// src/hooks/useReservations.ts
import { useState, useEffect } from "react"
import {
  collection, addDoc, updateDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore"
import { db } from "../firebase"
import type { Timestamp } from "firebase/firestore"

export interface Reservation {
  id: string
  nom: string
  email: string
  telephone: string
  date: string
  heure: string
  personnes: number
  occasion: string
  notes: string
  statut: "Confirmée" | "En attente" | "Annulée" | "Terminée"
  createdAt?: Timestamp
}

export const useReservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      setReservations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const addReservation = async (data: Omit<Reservation, "id" | "createdAt">) => {
    const docRef = await addDoc(collection(db, "reservations"), {
      ...data,
      statut: "En attente",
      createdAt: serverTimestamp(),
    })
    return docRef.id
  }

  const updateStatut = async (id: string, statut: Reservation["statut"]) => {
    await updateDoc(doc(db, "reservations", id), { statut })
  }

  return { reservations, loading, addReservation, updateStatut }
}