import type { Order } from "../types"

export const mockOrders: Order[] = [
  {
    id: 1,
    table: 3,
    items: [
      { platId: 1, nom: "Thiéboudienne", quantite: 2, prix: 3500 },
      { platId: 5, nom: "Jus de Bissap", quantite: 2, prix: 800 },
    ],
    statut: "En cuisine",
    total: 8600,
    createdAt: "2025-05-05T12:30:00",
  },
  {
    id: 2,
    table: 7,
    items: [
      { platId: 2, nom: "Yassa Poulet", quantite: 1, prix: 3000 },
      { platId: 4, nom: "Salade Niçoise", quantite: 1, prix: 1800 },
    ],
    statut: "En attente",
    total: 4800,
    createdAt: "2025-05-05T12:45:00",
  },
  {
    id: 3,
    table: 1,
    items: [
      { platId: 3, nom: "Mafé Boeuf", quantite: 3, prix: 3200 },
    ],
    statut: "Prêt",
    total: 9600,
    createdAt: "2025-05-05T11:00:00",
  },
  {
    id: 4,
    table: 5,
    items: [
      { platId: 1, nom: "Thiéboudienne", quantite: 1, prix: 3500 },
      { platId: 6, nom: "Fondant Chocolat", quantite: 2, prix: 1500 },
    ],
    statut: "Livré",
    total: 6500,
    createdAt: "2025-05-05T10:15:00",
  },
]