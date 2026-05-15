// src/pages/Commande/MesCommandesPage.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore"
import { db } from "../../firebase"
import { useAuth } from "../../context/AuthContext"
import {
  ShoppingBag, Clock, CheckCircle, ChefHat, Truck, Package, ArrowLeft, LogIn, X
} from "lucide-react"

interface OrderItem {
  nom: string
  quantite: number
  prix: number
}

interface Order {
  id: string
  client: string
  telephone: string
  adresse: string
  table: string
  type: "livraison" | "emporter" | "table"
  items: OrderItem[]
  total: number
  statut: string
  createdAt: string
  userId?: string
  archived?: boolean
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; step: number }> = {
  "En attente":  { color: "#E67E22", bg: "rgba(230,126,34,0.1)",  icon: Clock,         step: 1 },
  "En cuisine":  { color: "#3498DB", bg: "rgba(52,152,219,0.1)",  icon: ChefHat,       step: 2 },
  "Prêt":        { color: "#27AE60", bg: "rgba(39,174,96,0.1)",   icon: Package,       step: 3 },
  "En livraison":{ color: "#9B59B6", bg: "rgba(155,89,182,0.1)",  icon: Truck,         step: 3 },
  "Livré":       { color: "#27AE60", bg: "rgba(39,174,96,0.1)",   icon: CheckCircle,   step: 4 },
  "Terminé":     { color: "#27AE60", bg: "rgba(39,174,96,0.1)",   icon: CheckCircle,   step: 3 },
}

const getSteps = (type: string) => {
  if (type === "livraison") return ["Commande reçue", "En cuisine", "En livraison", "Livré"]
  return ["Commande reçue", "En cuisine", "Terminé"]
}

export default function MesCommandesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.id),
      orderBy("createdAt", "desc")
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data()
        let createdAt = docData.createdAt
        if (createdAt && typeof createdAt.toDate === "function") {
          createdAt = createdAt.toDate().toISOString()
        } else if (typeof createdAt === "string") {
          createdAt = createdAt
        } else {
          createdAt = new Date().toISOString()
        }
        return { id: d.id, ...docData, createdAt, archived: docData.archived || false } as Order
      })
      setOrders(data)
      if (selected) {
        const updated = data.find(o => o.id === selected.id)
        if (updated) setSelected(updated)
      }
      setLoading(false)
    })

    return () => unsub()
  }, [user])

  const hideOrder = async (id: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { archived: true })
    } catch (err) {
      console.error("Erreur masquage commande:", err)
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    } catch {
      return "Date inconnue"
    }
  }

  // Filtrer et trier : commandes actives en haut, terminées en bas
  let visibleOrders = orders.filter(o => showArchived ? true : !o.archived)
  const isFinished = (statut: string) => statut === "Livré" || statut === "Terminé"
  visibleOrders = [...visibleOrders].sort((a, b) => {
    const aFinished = isFinished(a.statut)
    const bFinished = isFinished(b.statut)
    if (aFinished !== bFinished) return aFinished ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFAF5" }}>
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF0EE" }}>
            <ShoppingBag size={28} style={{ color: "#C0392B" }} />
          </div>
          <h2 className="font-bold text-xl mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
            Connectez-vous pour voir vos commandes
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Chaque client voit uniquement ses propres commandes.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold mx-auto"
            style={{ background: "#C0392B" }}
          >
            <LogIn size={16} /> Se connecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFAF5" }}>
      {/* HEADER */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{ background: "rgba(255,250,245,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(192,57,43,0.1)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all"
              style={{ color: "#C0392B" }}
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Accueil</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}>
                <ShoppingBag size={14} className="text-white" />
              </div>
              <span className="font-bold text-base sm:text-lg" style={{ fontFamily: "'Georgia', serif" }}>Mes commandes</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/commande")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-semibold"
            style={{ background: "#C0392B" }}
          >
            <ShoppingBag size={14} />
            <span className="hidden sm:inline">Nouvelle commande</span>
            <span className="sm:hidden">Nouvelle</span>
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Version mobile : détail en haut, liste en bas */}
        <div className="lg:hidden space-y-6">
          {selected ? (
            <DétailCommande selected={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="flex items-center justify-center h-48 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
              <div className="text-center">
                <ShoppingBag size={28} className="mx-auto mb-2" style={{ color: "#DDD" }} />
                <p className="text-sm" style={{ color: "#BBB" }}>Cliquez sur une commande</p>
              </div>
            </div>
          )}
          <ListeCommandes
            orders={visibleOrders}
            loading={loading}
            selected={selected}
            onSelect={setSelected}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived(!showArchived)}
            onHide={hideOrder}
            formatDate={formatDate}
          />
        </div>

        {/* Version desktop : deux colonnes (liste à gauche, détail à droite) */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <ListeCommandes
              orders={visibleOrders}
              loading={loading}
              selected={selected}
              onSelect={setSelected}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived(!showArchived)}
              onHide={hideOrder}
              formatDate={formatDate}
            />
          </div>
          <div className="lg:col-span-3">
            {selected ? (
              <DétailCommande selected={selected} onClose={() => setSelected(null)} />
            ) : (
              <div className="flex items-center justify-center h-64 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                <div className="text-center">
                  <ShoppingBag size={32} className="mx-auto mb-2" style={{ color: "#DDD" }} />
                  <p className="text-sm" style={{ color: "#BBB" }}>Cliquez sur une commande</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant Liste des commandes (réutilisable)
function ListeCommandes({
  orders,
  loading,
  selected,
  onSelect,
  showArchived,
  onToggleArchived,
  onHide,
  formatDate,
}: {
  orders: Order[]
  loading: boolean
  selected: Order | null
  onSelect: (order: Order) => void
  showArchived: boolean
  onToggleArchived: () => void
  onHide: (id: string) => void
  formatDate: (iso: string) => string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>
          Historique{" "}
          {orders.length > 0 && (
            <span className="text-base font-normal" style={{ color: "#AAA" }}>({orders.length})</span>
          )}
        </h2>
        <button
          onClick={onToggleArchived}
          className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-gray-100"
          style={{ color: "#C0392B", background: "rgba(192,57,43,0.08)" }}
        >
          {showArchived ? "Masquer anciennes" : "Voir anciennes"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
          <ShoppingBag size={40} className="mx-auto mb-4" style={{ color: "#DDD" }} />
          <p className="font-semibold mb-2" style={{ color: "#BBB" }}>Aucune commande</p>
          <p className="text-sm mb-6" style={{ color: "#CCC" }}>Passez votre première commande !</p>
        </div>
      ) : (
        orders.map(order => {
          const cfg = statusConfig[order.statut] || statusConfig["En attente"]
          const Icon = cfg.icon
          const isSelected = selected?.id === order.id
          const isFinished = order.statut === "Livré" || order.statut === "Terminé"
          return (
            <div
              key={order.id}
              onClick={() => onSelect(order)}
              className="p-4 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5"
              style={{
                background: "white",
                border: isSelected ? "2px solid #C0392B" : "1px solid #F0E8E0",
                boxShadow: isSelected ? "0 4px 20px rgba(192,57,43,0.12)" : "none",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-sm sm:text-base" style={{ color: "#1A1A1A" }}>
                    Commande #{order.id.slice(-6).toUpperCase()}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#AAA" }}>{formatDate(order.createdAt)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <Icon size={10} /> {order.statut === "Terminé" ? "Terminé" : order.statut}
                  </span>
                  {isFinished && !order.archived && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onHide(order.id); }}
                      className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Masquer"
                      style={{ color: "#AAA" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs mb-2 truncate" style={{ color: "#666" }}>
                {order.items.slice(0, 2).map(i => `${i.quantite}x ${i.nom}`).join(", ")}
                {order.items.length > 2 && " ..."}
              </div>
              <div className="font-bold text-sm" style={{ color: "#C0392B" }}>
                {order.total.toLocaleString()} FCFA
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// Composant Détail d'une commande (réutilisable)
function DétailCommande({ selected, onClose }: { selected: Order; onClose?: () => void }) {
  const navigate = useNavigate()
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    } catch {
      return "Date inconnue"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg sm:text-xl" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>
          Commande #{selected.id.slice(-6).toUpperCase()}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm" style={{ color: "#AAA" }}>{formatDate(selected.createdAt)}</span>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
              <X size={16} style={{ color: "#888" }} />
            </button>
          )}
        </div>
      </div>

      {/* Suivi adapté au type */}
      {selected.statut !== "Livré" && selected.statut !== "Terminé" && (
        <div className="p-4 sm:p-6 rounded-2xl" style={{ background: "white", border: "1px solid #F0E8E0" }}>
          <h3 className="font-bold mb-4 text-sm sm:text-base">Suivi de la commande</h3>
          <div className="flex items-center mb-4">
            {getSteps(selected.type).map((stepLabel, i) => {
              let currentStep = 1
              if (selected.statut === "En attente") currentStep = 1
              else if (selected.statut === "En cuisine") currentStep = 2
              else if (selected.statut === "Prêt" || selected.statut === "En livraison") currentStep = 3
              else if (selected.statut === "Livré" || selected.statut === "Terminé") currentStep = 4
              const done = i < currentStep - 1
              const active = i === currentStep - 1
              return (
                <div key={stepLabel} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full">
                    <div className="flex-1 h-1 rounded-full" style={{ background: i === 0 ? "transparent" : done ? "#C0392B" : "#F0E8E0" }} />
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={done || active ? { background: "#C0392B", color: "white", boxShadow: active ? "0 0 0 3px rgba(192,57,43,0.2)" : "none" } : { background: "#F0E8E0", color: "#AAA" }}
                    >
                      {done && !active ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 h-1 rounded-full" style={{ background: i === getSteps(selected.type).length - 1 ? "transparent" : done ? "#C0392B" : "#F0E8E0" }} />
                  </div>
                  <div className="text-center text-[10px] sm:text-xs mt-1" style={{ color: active ? "#C0392B" : done ? "#888" : "#CCC", fontWeight: active ? 600 : 400 }}>
                    {stepLabel}
                  </div>
                </div>
              )
            })}
          </div>
          {selected.type === "livraison" && selected.adresse && selected.adresse !== "—" && (
            <div className="flex items-center gap-2 mt-3 text-sm p-2 rounded-xl" style={{ background: "#F8F8F8", color: "#666" }}>
              <Truck size={14} style={{ color: "#C0392B" }} />
              <span className="text-xs break-all">Livraison : {selected.adresse}</span>
            </div>
          )}
        </div>
      )}

      {selected.statut === "Livré" && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: "rgba(39,174,96,0.08)", border: "1px solid rgba(39,174,96,0.2)" }}>
          <CheckCircle size={18} style={{ color: "#27AE60" }} />
          <span className="font-semibold" style={{ color: "#27AE60" }}>Commande livrée avec succès !</span>
        </div>
      )}

      {selected.statut === "Terminé" && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: "rgba(39,174,96,0.08)", border: "1px solid rgba(39,174,96,0.2)" }}>
          <CheckCircle size={18} style={{ color: "#27AE60" }} />
          <span className="font-semibold" style={{ color: "#27AE60" }}>Commande terminée – Bon appétit !</span>
        </div>
      )}

      {/* Articles */}
      <div className="p-4 sm:p-6 rounded-2xl" style={{ background: "white", border: "1px solid #F0E8E0" }}>
        <h3 className="font-bold mb-3 text-sm">Articles commandés</h3>
        <div className="space-y-2">
          {selected.items.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-1 border-b last:border-0" style={{ borderColor: "#F0E8E0" }}>
              <div>
                <div className="font-medium text-sm">{item.nom}</div>
                <div className="text-xs" style={{ color: "#AAA" }}>x{item.quantite}</div>
              </div>
              <div className="font-semibold text-sm" style={{ color: "#C0392B" }}>
                {(item.prix * item.quantite).toLocaleString()} F
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-bold pt-3 mt-2 border-t text-sm">
          <span>Total payé</span>
          <span style={{ color: "#C0392B" }}>{selected.total.toLocaleString()} FCFA</span>
        </div>
      </div>

      {(selected.statut === "Livré" || selected.statut === "Terminé") && (
        <button
          onClick={() => navigate("/commande")}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 text-sm"
          style={{ background: "#C0392B" }}
        >
          Commander à nouveau
        </button>
      )}
    </div>
  )
}