import { useState, useEffect } from "react"
import { Users, Search, Phone, Mail, ShoppingBag, Star, TrendingUp, X } from "lucide-react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "../../firebase"

interface Client {
  id: string
  nom: string
  email: string
  telephone?: string
  adresse?: string
  commandes?: number
  totalDepense?: number
  note?: number
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

// Générer avatar et couleur à partir du nom
const getAvatarProps = (nom: string) => {
  const colors = ["#C0392B", "#D4A017", "#2E86AB", "#27AE60", "#9B59B6", "#E67E22"]
  const index = nom.length % colors.length
  const initiales = nom.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
  return { color: colors[index], initiales }
}

// Déterminer statut selon nombre de commandes
const getStatut = (commandes: number = 0): "VIP" | "Régulier" | "Nouveau" => {
  if (commandes >= 15) return "VIP"
  if (commandes >= 5) return "Régulier"
  return "Nouveau"
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<"Tous" | "VIP" | "Régulier" | "Nouveau">("Tous")
  const [selected, setSelected] = useState<Client | null>(null)
  const [sortBy, setSortBy] = useState<"commandes" | "depense" | "note">("commandes")
  const [loading, setLoading] = useState(true)

  // Écoute en temps réel des utilisateurs (exclut les admins)
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs
        .map(doc => {
          const data = doc.data()
          // Ne pas afficher les admins
          if (data.role === "admin") return null
          const commandes = data.commandes || 0
          const totalDepense = data.totalDepense || 0
          const dateInscription = data.dateInscription || 
            (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "Nouveau")
          return {
            id: doc.id,
            nom: data.nom || "Client",
            email: data.email || "",
            telephone: data.telephone || "",
            adresse: data.adresse || "",
            commandes,
            totalDepense,
            note: 5, // Valeur par défaut, à remplacer par une moyenne d'avis si disponible
            dateInscription: typeof dateInscription === "string" ? dateInscription : "Récent",
            dernierVisite: "—", // À calculer à partir de la dernière commande du client
            actif: data.actif !== false,
            role: data.role || "client",
          } as Client
        })
        .filter(Boolean) as Client[]

      // Ajouter les propriétés d'affichage
      const clientsWithUI = usersData.map(c => ({
        ...c,
        ...getAvatarProps(c.nom),
        statut: getStatut(c.commandes)
      }))
      setClients(clientsWithUI)
      setLoading(false)
    }, (error) => {
      console.error("Erreur chargement utilisateurs:", error)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Filtrage et tri
  const filtered = clients
    .filter(c => {
      const matchSearch = c.nom.toLowerCase().includes(search.toLowerCase()) || 
                         c.email.toLowerCase().includes(search.toLowerCase())
      const matchStatut = filterStatut === "Tous" || c.statut === filterStatut
      return matchSearch && matchStatut
    })
    .sort((a, b) => {
      if (sortBy === "commandes") return (b.commandes || 0) - (a.commandes || 0)
      if (sortBy === "depense") return (b.totalDepense || 0) - (a.totalDepense || 0)
      return (b.note || 0) - (a.note || 0)
    })

  const totalClients = clients.length
  const totalRevenu = clients.reduce((s, c) => s + (c.totalDepense || 0), 0)
  const vipCount = clients.filter(c => c.statut === "VIP").length
  const avgCommandes = clients.length ? Math.round(clients.reduce((s, c) => s + (c.commandes || 0), 0) / clients.length) : 0

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Clients</h1>
        <p className="text-sm mt-1" style={{ color: "#999" }}>Base de données clients du restaurant</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total clients", val: totalClients, icon: Users, color: "#C0392B", bg: "rgba(192,57,43,0.08)" },
          { label: "Clients VIP", val: vipCount, icon: Star, color: "#D4A017", bg: "rgba(212,160,23,0.08)" },
          { label: "Revenu total", val: `${(totalRevenu / 1000).toFixed(0)}k FCFA`, icon: TrendingUp, color: "#27AE60", bg: "rgba(39,174,96,0.08)" },
          { label: "Moy. commandes", val: avgCommandes, icon: ShoppingBag, color: "#3498DB", bg: "rgba(52,152,219,0.08)" },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-2xl border" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{val}</div>
            <div className="text-xs" style={{ color: "#AAA" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Rechercher un client..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} 
          />
        </div>
        <div className="flex gap-2">
          {(["Tous", "VIP", "Régulier", "Nouveau"] as const).map((s) => (
            <button 
              key={s} 
              onClick={() => setFilterStatut(s)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border"
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
          onChange={(e) => setSortBy(e.target.value as "commandes" | "depense" | "note")}
          className="px-4 py-3 rounded-xl text-sm border focus:outline-none"
          style={{ background: "white", border: "1px solid #E8E0D8", color: "#555" }}
        >
          <option value="commandes">Trier par commandes</option>
          <option value="depense">Trier par dépense</option>
          <option value="note">Trier par note</option>
        </select>
      </div>

      {/* Layout liste + détail */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Liste des clients */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-sm" style={{ color: "#999" }}>{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
          {filtered.map((client, i) => {
            const cfg = statutCfg[client.statut!]
            const isSelected = selected?.id === client.id
            return (
              <div 
                key={client.id} 
                onClick={() => setSelected(client)}
                className="flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ 
                  background: "white", 
                  border: isSelected ? "2px solid #C0392B" : "1px solid #F0E8E0", 
                  boxShadow: isSelected ? "0 4px 20px rgba(192,57,43,0.12)" : "none" 
                }}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: client.color }}>
                    {client.avatar}
                  </div>
                  {i < 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: ["#D4A017", "#95A5A6", "#CD7F32"][i] }}>
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm" style={{ color: "#1A1A1A" }}>{client.nom}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                      {client.statut}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "#AAA" }}>{client.email}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#888" }}>
                    <span>{client.commandes} commandes</span>
                    <span>·</span>
                    <span>{client.totalDepense?.toLocaleString()} FCFA</span>
                    <span>·</span>
                    <span>{client.dernierVisite}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={11} style={{ color: j < (client.note || 0) ? "#D4A017" : "#E8E0D8", fill: j < (client.note || 0) ? "#D4A017" : "#E8E0D8" }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Détail client (panneau de droite) */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            {selected ? (
              <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                {/* Header */}
                <div className="p-5 border-b relative" style={{ borderColor: "#F0E8E0", background: "#FFF5EE" }}>
                  <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/50">
                    <X size={14} style={{ color: "#888" }} />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: selected.color }}>
                      {selected.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-lg" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{selected.nom}</div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: statutCfg[selected.statut!].bg, color: statutCfg[selected.statut!].color }}>
                        {selected.statut}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Infos contact */}
                <div className="p-5 space-y-3 border-b" style={{ borderColor: "#F0E8E0" }}>
                  {[
                    { icon: Phone, label: "Téléphone", val: selected.telephone || "—" },
                    { icon: Mail, label: "Email", val: selected.email },
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

                {/* Statistiques */}
                <div className="p-5 grid grid-cols-2 gap-3 border-b" style={{ borderColor: "#F0E8E0" }}>
                  {[
                    { label: "Commandes", val: selected.commandes || 0, color: "#C0392B" },
                    { label: "Total dépensé", val: `${(selected.totalDepense || 0).toLocaleString()} F`, color: "#27AE60" },
                    { label: "Client depuis", val: selected.dateInscription || "—", color: "#3498DB" },
                    { label: "Dernier visite", val: selected.dernierVisite || "—", color: "#E67E22" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="p-3 rounded-xl" style={{ background: "#FFF5EE" }}>
                      <div className="text-sm font-bold" style={{ color }}>{val}</div>
                      <div className="text-xs" style={{ color: "#BBB" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Note */}
                <div className="p-5 border-b" style={{ borderColor: "#F0E8E0" }}>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#BBB" }}>Note satisfaction</div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={18} style={{ color: i < (selected.note || 0) ? "#D4A017" : "#E8E0D8", fill: i < (selected.note || 0) ? "#D4A017" : "#E8E0D8" }} />
                      ))}
                    </div>
                    <span className="font-bold" style={{ color: "#D4A017" }}>{selected.note || 0}/5</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-5 flex gap-3">
                  <a 
                    href={`tel:${selected.telephone}`} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-all hover:scale-105 ${!selected.telephone ? "opacity-50 pointer-events-none" : ""}`}
                    style={{ color: "#27AE60", border: "2px solid rgba(39,174,96,0.3)" }}
                  >
                    <Phone size={14} /> Appeler
                  </a>
                  <a 
                    href={`mailto:${selected.email}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
                    style={{ background: "#C0392B" }}
                  >
                    <Mail size={14} /> Email
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                <div className="text-center">
                  <Users size={28} className="mx-auto mb-2" style={{ color: "#DDD" }} />
                  <p className="text-sm" style={{ color: "#BBB" }}>Cliquez sur un client</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}