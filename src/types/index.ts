export interface User {
  id: number
  nom: string
  email: string
  role: "admin" | "serveur"
}

export interface Order {
  id: number
  table: number
  items: OrderItem[]
  statut: "En attente" | "En cuisine" | "Prêt" | "Livré"
  total: number
  createdAt: string
}

export interface OrderItem {
  platId: number
  nom: string
  quantite: number
  prix: number
}

export interface MenuItem {
  id: number
  nom: string
  description: string
  prix: number
  categorie: "Entrée" | "Plat principal" | "Dessert" | "Boisson"
  image: string
  disponible: boolean
}