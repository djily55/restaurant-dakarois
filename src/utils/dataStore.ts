// src/utils/dataStore.ts
// Store partagé entre client et admin via localStorage

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
  statut: "En attente" | "En cuisine" | "Prêt" | "En livraison" | "Livré" | "Terminé"
  total: number
  createdAt: string
}

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
  precomm?: { nom: string; quantite: number; prix: number }[]
  menuNote?: string
  statut: "En attente" | "Confirmée" | "Annulée" | "Terminée"
  createdAt: string
}

// ── ORDERS ──
export const getOrders = (): Order[] => {
  try { return JSON.parse(localStorage.getItem("restaurant_orders") || "[]") } catch { return [] }
}

export const saveOrder = (order: Omit<Order, "id" | "createdAt" | "statut">): string => {
  const orders = getOrders()
  const newOrder: Order = {
    ...order,
    id: Date.now().toString(),
    statut: "En attente",
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem("restaurant_orders", JSON.stringify([newOrder, ...orders]))
  return newOrder.id
}

export const updateOrderStatut = (id: string, statut: Order["statut"]) => {
  const orders = getOrders()
  const updated = orders.map(o => o.id === id ? { ...o, statut } : o)
  localStorage.setItem("restaurant_orders", JSON.stringify(updated))
}

// Fonction pour supprimer une commande (hard delete)
export const deleteOrder = (id: string) => {
  const orders = getOrders()
  const filtered = orders.filter(o => o.id !== id)
  localStorage.setItem("restaurant_orders", JSON.stringify(filtered))
}

// ── RESERVATIONS ──
export const getReservations = (): Reservation[] => {
  try { return JSON.parse(localStorage.getItem("restaurant_reservations") || "[]") } catch { return [] }
}

export const saveReservation = (res: Omit<Reservation, "id" | "createdAt" | "statut">): string => {
  const reservations = getReservations()
  const newRes: Reservation = {
    ...res,
    id: Date.now().toString(),
    statut: "En attente",
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem("restaurant_reservations", JSON.stringify([newRes, ...reservations]))
  return newRes.id
}

export const updateReservationStatut = (id: string, statut: Reservation["statut"]) => {
  const reservations = getReservations()
  const updated = reservations.map(r => r.id === id ? { ...r, statut } : r)
  localStorage.setItem("restaurant_reservations", JSON.stringify(updated))
}

// Optionnel : supprimer une réservation
export const deleteReservation = (id: string) => {
  const reservations = getReservations()
  const filtered = reservations.filter(r => r.id !== id)
  localStorage.setItem("restaurant_reservations", JSON.stringify(filtered))
}