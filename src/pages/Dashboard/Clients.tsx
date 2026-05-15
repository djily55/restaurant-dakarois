// src/pages/Dashboard/Clients.tsx
import { useState, useEffect } from "react"
import { Users, Search, Phone, Mail, ShoppingBag, Star, CalendarCheck, X } from "lucide-react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "../../firebase"

interface Order {
  id: string
  userId?: string
  total: number
  statut: string
  createdAt: any
}

interface Reservation {
  id: string
  userId?: string
  statut: string
}

interface Client {
  id: string
  nom: string
  email: string
  telephone?: string
  adresse?: string
  commandesCount: number        // nombre réel de commandes
  totalDepense: number          // réel en FCFA
  reservationsCount: number     // nombre réel de réservations
  note?: number                 // si jamais vous avez des avis
  dateInscription?: string
  dernierVisite?: string
  avatar?: string
  color?: string
  statut?: "VIP" | "Régulier" | "Nouveau"
  role: string
  actif: boolean
}

const statutCfg: Record<string, { color: string; bg: string }> = {
  VIP: { color: "#D4A017", bg: "rgba(212,160,23,0.1)" },
  Régulier: { color: "#3498DB", bg: "rgba(52,152,219,0.1)" },
  Nouveau: { color: "#27AE60", bg: "rgba(39,174,96,0.1)" },
}

const getAvatarProps = (nom: string) => {
  const colors = ["#C0392B", "#D4A017", "#2E86AB", "#27AE60", "#9B59B6", "#E67E22"]
  const index = nom.length % colors.length
  const initiales = nom.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
  return { color: colors[index], initiales }
}

const getStatut = (commandes: number): "VIP" | "Régulier" | "Nouveau" => {
  if (commandes >= 15) return "VIP"
  if (commandes >= 5) return "Régulier"
  return "Nouveau"
}

// Composant Détail client (réutilisable)
const ClientDetail = ({ client, onClose }: { client: Client; onClose: () => void }) => {
  const cfg = statutCfg[client.statut!]
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
      <div className="p-5 border-b relative" style={{ borderColor: "#F0E8E0", background: "#FFF5EE" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/50">
          <X size={14} style={{ color: "#888" }} />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: client.color }}>
            {client.avatar}
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{client.nom}</div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}>
              {client.statut}
            </span>
          </div>
        </div>
      </div>

      {/* Infos contact */}
      <div className="p-5 space-y-3 border-b" style={{ borderColor: "#F0E8E0" }}>
        {[
          { icon: Phone, label: "Téléphone", val: client.telephone || "—" },
          { icon: Mail, label: "Email", val: client.email },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(192,57,43,0.08)" }}>
              <Icon size={13} style={{ color: "#C0392B" }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "#BBB" }}>{label}</div>
              <div className="text-sm font-medium" style={{ color: "#1A1A1A" }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Statistiques : commandes et réservations */}
      <div className="p-5 grid grid-cols-2 gap-3 border-b" style={{ borderColor: "#F0E8E0" }}>
        {[
          { label: "Commandes", val: client.commandesCount, color: "#C0392B" },
          { label: "Réservations", val: client.reservationsCount, color: "#D4A017" },
          { label: "Client depuis", val: client.dateInscription || "—", color: "#3498DB" },
          { label: "Dernier visite", val: client.dernierVisite || "—", color: "#E67E22" },
        ].map(({ label, val, color }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: "#FFF5EE" }}>
            <div className="text-sm font-bold" style={{ color }}>{val}</div>
            <div className="text-xs" style={{ color: "#BBB" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Note (si disponible) */}
      {client.note !== undefined && (
        <div className="p-5 border-b" style={{ borderColor: "#F0E8E0" }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#BBB" }}>Note satisfaction</div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} style={{ color: i < (client.note || 0) ? "#D4A017" : "#E8E0D8", fill: i < (client.note || 0) ? "#D4A017" : "#E8E0D8" }} />
              ))}
            </div>
            <span className="font-bold" style={{ color: "#D4A017" }}>{client.note}/5</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-5 flex gap-3">
        <a 
          href={`tel:${client.telephone}`} 
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-all hover:scale-105 ${!client.telephone ? "opacity-50 pointer-events-none" : ""}`}
          style={{ color: "#27AE60", border: "2px solid rgba(39,174,96,0.3)" }}
        >
          <Phone size={14} /> Appeler
        </a>
        <a 
          href={`mailto:${client.email}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
          style={{ background: "#C0392B" }}
        >
          <Mail size={14} /> Email
        </a>
      </div>
    </div>
  )
}

export default function Clients() {
  const [users, setUsers] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<"Tous" | "VIP" | "Régulier" | "Nouveau">("Tous")
  const [selected, setSelected] = useState<Client | null>(null)
  const [sortBy, setSortBy] = useState<"commandes" | "reservations" | "note">("commandes")
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Chargement des utilisateurs (clients)
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => {
          const data = doc.data()
          if (data.role === "admin") return null
          return {
            id: doc.id,
            nom: data.nom || "Client",
            email: data.email || "",
            telephone: data.telephone || "",
            adresse: data.adresse || "",
            commandesCount: 0,      // sera rempli après
            totalDepense: 0,
            reservationsCount: 0,
            note: 5,
            dateInscription: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "Récent",
            dernierVisite: "—",
            actif: data.actif !== false,
            role: data.role || "client",
            ...getAvatarProps(data.nom || "Client"),
          } as Client
        })
        .filter(Boolean) as Client[]
      setUsers(usersData)
    })
    return () => unsub()
  }, [])

  // Chargement des commandes
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          userId: d.userId,
          total: d.total || 0,
          statut: d.statut,
          createdAt: d.createdAt,
        } as Order
      })
      setOrders(ordersData)
    })
    return () => unsub()
  }, [])

  // Chargement des réservations
  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          userId: d.userId,
          statut: d.statut,
        } as Reservation
      })
      setReservations(reservationsData)
    })
    return () => unsub()
  }, [])

  // Agrégation : pour chaque utilisateur, compter ses commandes, total dépensé, nombre de réservations
  useEffect(() => {
    if (users.length === 0 && orders.length === 0 && reservations.length === 0) {
      setClients([])
      setLoading(false)
      return
    }

    const enriched = users.map(user => {
      // Commandes de l'utilisateur
      const userOrders = orders.filter(o => o.userId === user.id)
      const commandesCount = userOrders.length
      const totalDepense = userOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      // Réservations de l'utilisateur (tous statuts, vous pouvez filtrer si besoin)
      const userReservations = reservations.filter(r => r.userId === user.id)
      const reservationsCount = userReservations.length

      // Dernière commande pour "dernierVisite"
      let dernierVisite = "—"
      if (userOrders.length > 0) {
        const lastOrder = userOrders.reduce((latest, o) => {
          const date1 = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(0)
          const date2 = latest.createdAt?.toDate ? latest.createdAt.toDate() : new Date(0)
          return date1 > date2 ? o : latest
        }, userOrders[0])
        if (lastOrder.createdAt?.toDate) {
          const lastDate = lastOrder.createdAt.toDate()
          dernierVisite = lastDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
        }
      }

      return {
        ...user,
        commandesCount,
        totalDepense,
        reservationsCount,
        dernierVisite,
        statut: getStatut(commandesCount),
      }
    })

    setClients(enriched)
    setLoading(false)
  }, [users, orders, reservations])

  // Filtrage et tri
  const filtered = clients
    .filter(c => {
      const matchSearch = c.nom.toLowerCase().includes(search.toLowerCase()) || 
                          c.email.toLowerCase().includes(search.toLowerCase())
      const matchStatut = filterStatut === "Tous" || c.statut === filterStatut
      return matchSearch && matchStatut
    })
    .sort((a, b) => {
      if (sortBy === "commandes") return b.commandesCount - a.commandesCount
      if (sortBy === "reservations") return b.reservationsCount - a.reservationsCount
      return (b.note || 0) - (a.note || 0)
    })

  const totalClients = clients.length
  const totalReservations = clients.reduce((sum, c) => sum + c.reservationsCount, 0)
  const vipCount = clients.filter(c => c.statut === "VIP").length
  const avgCommandes = clients.length ? Math.round(clients.reduce((s, c) => s + c.commandesCount, 0) / clients.length) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: "#AAA" }}>Chargement des clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Clients</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "#999" }}>Base de données clients du restaurant</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total clients", val: totalClients, icon: Users, color: "#C0392B", bg: "rgba(192,57,43,0.08)" },
          { label: "Clients VIP", val: vipCount, icon: Star, color: "#D4A017", bg: "rgba(212,160,23,0.08)" },
          { label: "Réservations totales", val: totalReservations, icon: CalendarCheck, color: "#27AE60", bg: "rgba(39,174,96,0.08)" },
          { label: "Moy. commandes", val: avgCommandes, icon: ShoppingBag, color: "#3498DB", bg: "rgba(52,152,219,0.08)" },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="p-3 sm:p-5 rounded-2xl border" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3" style={{ background: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-lg sm:text-2xl font-bold mb-0.5" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{val}</div>
            <div className="text-[10px] sm:text-xs" style={{ color: "#AAA" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Rechercher un client..."
            className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} 
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["Tous", "VIP", "Régulier", "Nouveau"] as const).map((s) => (
            <button 
              key={s} 
              onClick={() => setFilterStatut(s)}
              className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border"
              style={filterStatut === s
                ? { background: "#C0392B", color: "white", border: "1px solid #C0392B" }
                : { background: "white", color: "#555", border: "1px solid #E8E0D8" }}
            >
              {s}
            </button>
          ))}
        </div>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as "commandes" | "reservations" | "note")}
          className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm border focus:outline-none"
          style={{ background: "white", border: "1px solid #E8E0D8", color: "#555" }}
        >
          <option value="commandes">Trier par commandes</option>
          <option value="reservations">Trier par réservations</option>
          <option value="note">Trier par note</option>
        </select>
      </div>

      {/* Layout liste + détail (adaptatif) */}
      <div className={`${isMobile ? 'flex flex-col gap-4' : 'grid lg:grid-cols-5 gap-6'}`}>
        {/* Liste des clients */}
        <div className={`${isMobile ? 'w-full' : 'lg:col-span-3'} space-y-3`}>
          <p className="text-xs sm:text-sm" style={{ color: "#999" }}>{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
          {filtered.map((client, idx) => {
            const cfg = statutCfg[client.statut!]
            const isSelected = selected?.id === client.id
            return (
              <div key={client.id}>
                {/* Carte client */}
                <div 
                  onClick={() => setSelected(isSelected ? null : client)}
                  className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 ${
                    isSelected ? "ring-2 ring-[#C0392B] shadow-md" : ""
                  }`}
                  style={{ background: "white", border: "1px solid #F0E8E0" }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0"
                      style={{ background: client.color }}>
                      {client.avatar}
                    </div>
                    {idx < 3 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-white text-[9px] sm:text-xs font-bold"
                        style={{ background: ["#D4A017", "#95A5A6", "#CD7F32"][idx] }}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-sm sm:text-base" style={{ color: "#1A1A1A" }}>{client.nom}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                        {client.statut}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs truncate" style={{ color: "#AAA" }}>{client.email}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] sm:text-xs" style={{ color: "#888" }}>
                      <span>{client.commandesCount} cmd</span>
                      <span>•</span>
                      <span>{client.reservationsCount} rés.</span>
                      <span>•</span>
                      <span>{client.dernierVisite}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={10} style={{ color: j < (client.note || 0) ? "#D4A017" : "#E8E0D8", fill: j < (client.note || 0) ? "#D4A017" : "#E8E0D8" }} />
                    ))}
                  </div>
                </div>

                {/* Détail sous la carte (mobile uniquement) */}
                {isMobile && isSelected && (
                  <div className="mt-3">
                    <ClientDetail client={client} onClose={() => setSelected(null)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Panneau détail desktop (côté droit) */}
        {!isMobile && (
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              {selected ? (
                <ClientDetail client={selected} onClose={() => setSelected(null)} />
              ) : (
                <div className="flex items-center justify-center h-48 sm:h-64 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                  <div className="text-center">
                    <Users size={28} className="mx-auto mb-2" style={{ color: "#DDD" }} />
                    <p className="text-xs sm:text-sm" style={{ color: "#BBB" }}>Cliquez sur un client</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}