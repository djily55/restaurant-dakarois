import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  TrendingUp, ShoppingBag, CalendarCheck,
  ArrowRight, ArrowUp, ArrowDown, Clock, CheckCircle, ChefHat,
  UserPlus, UserCheck, Award, RefreshCw
} from "lucide-react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "../../firebase"

type Periode = "jour" | "semaine" | "mois"

// Types alignés avec Firestore
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
  createdAt: string // stocké en ISO après conversion
  userId?: string
}

interface Reservation {
  id: string
  nom: string
  telephone: string
  email: string
  date: string
  heure: string
  personnes: number
  occasion?: string
  message?: string
  statut: "En attente" | "Confirmée" | "Annulée"
  createdAt: string
  userId?: string
}

const formatValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return `${value}`
}

const statusCfg: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  "En attente": { color: "#E67E22", bg: "rgba(230,126,34,0.1)", icon: Clock },
  "En cuisine": { color: "#3498DB", bg: "rgba(52,152,219,0.1)", icon: ChefHat },
  "Prêt": { color: "#27AE60", bg: "rgba(39,174,96,0.1)", icon: CheckCircle },
  "En livraison": { color: "#9B59B6", bg: "rgba(155,89,182,0.1)", icon: ShoppingBag },
  "Livré": { color: "#95A5A6", bg: "rgba(149,165,166,0.1)", icon: CheckCircle },
}

// Donut Chart
const DonutChart = ({ data }: { data: { labels: string[]; data: number[]; colors: string[] } }) => {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const total = data.data.reduce((a, b) => a + b, 0)
  let currentOffset = 0

  if (total === 0) return (
    <div className="flex flex-col items-center">
      <div className="w-40 h-40 rounded-full border-8 flex items-center justify-center" style={{ borderColor: "#F0E8E0" }}>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: "#DDD" }}>0</div>
          <div className="text-xs" style={{ color: "#CCC" }}>commandes</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          {data.data.map((value, index) => {
            if (value === 0) return null
            const percentage = (value / total) * 100
            const dashArray = (percentage / 100) * circumference
            const strokeDashoffset = circumference - currentOffset
            currentOffset += dashArray
            return (
              <circle key={index} cx="80" cy="80" r={radius} fill="none"
                stroke={data.colors[index]} strokeWidth="22"
                strokeDasharray={`${dashArray} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                style={{ strokeLinecap: "round" }} />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: "#1A1A1A" }}>{total}</div>
            <div className="text-xs" style={{ color: "#999" }}>commandes</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {data.labels.map((label, index) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: data.colors[index] }} />
            <span className="text-xs" style={{ color: "#666" }}>{label}</span>
            <span className="text-xs font-bold" style={{ color: "#1A1A1A" }}>
              {total > 0 ? Math.round((data.data[index] / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Bar Chart vertical
const VerticalBarChart = ({ data }: { data: { labels: string[]; data: number[]; colors: string[] } }) => {
  const maxValue = Math.max(...data.data, 1)
  return (
    <div className="h-56">
      <div className="flex h-48 items-end justify-around gap-4">
        {data.data.map((value, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative w-full group flex justify-center">
              <div className="w-3/4 rounded-t-xl transition-all duration-500 cursor-pointer hover:opacity-80 relative"
                style={{ height: `${Math.max((value / maxValue) * 170, 4)}px`, background: data.colors[index], minHeight: "4px" }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {value} commande{value > 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div className="text-xs font-medium text-center" style={{ color: "#666" }}>{data.labels[index]}</div>
            <div className="text-xs font-bold" style={{ color: data.colors[index] }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Graphique d'évolution – COURBE
const EvolutionChart = ({ orders, periode }: { orders: Order[]; periode: Periode }) => {
  const now = new Date()
  const [hovered, setHovered] = useState<number | null>(null)

  const getLabelsAndData = () => {
    if (periode === "jour") {
      const labels = ["8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"]
      const data = labels.map((_, i) => {
        const hour = 8 + i * 2
        return orders.filter(o => {
          const d = new Date(o.createdAt)
          return d.getDate() === now.getDate() && d.getHours() >= hour && d.getHours() < hour + 2
        }).reduce((s, o) => s + o.total, 0)
      })
      return { labels, data }
    }
    if (periode === "semaine") {
      const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
      const data = jours.map((_, i) => {
        const target = new Date(now)
        target.setDate(now.getDate() - now.getDay() + 1 + i)
        return orders.filter(o => {
          const d = new Date(o.createdAt)
          return d.getDate() === target.getDate() && d.getMonth() === target.getMonth()
        }).reduce((s, o) => s + o.total, 0)
      })
      return { labels: jours, data }
    }
    // mois
    const labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
    const data = labels.map((_, i) => {
      return orders.filter(o => {
        const d = new Date(o.createdAt)
        const weekOfMonth = Math.floor((d.getDate() - 1) / 7)
        return d.getMonth() === now.getMonth() && weekOfMonth === i
      }).reduce((s, o) => s + o.total, 0)
    })
    return { labels, data }
  }

  const { labels, data } = getLabelsAndData()
  const maxVal = Math.max(...data, 1)
  const total = data.reduce((s, v) => s + v, 0)

  const width = 600
  const height = 200
  const padding = { top: 20, bottom: 35, left: 50, right: 20 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  const points = data.map((value, index) => {
    const x = padding.left + (index / (data.length - 1)) * graphWidth
    const y = padding.top + graphHeight - (value / maxVal) * graphHeight
    return { x, y, value, label: labels[index] }
  })

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`)).join(" ")

  if (orders.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "#DDD" }}>
        <TrendingUp size={40} className="mx-auto mb-3" />
        <p className="text-sm" style={{ color: "#BBB" }}>Aucune donnée pour le moment</p>
        <p className="text-xs mt-1" style={{ color: "#CCC" }}>Les graphiques s'afficheront dès les premières commandes</p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative w-full overflow-x-auto" style={{ minHeight: height }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + graphHeight * (1 - ratio)
            const value = maxVal * ratio
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#F0E8E0" strokeWidth="1" strokeDasharray="4" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#BBB">{formatValue(value)}</text>
              </g>
            )
          })}
          <path d={linePath} fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath + ` L ${points[points.length-1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`} fill="rgba(192,57,43,0.05)" />
          {points.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hovered === idx ? 6 : 4}
                fill="white"
                stroke="#C0392B"
                strokeWidth="2"
                style={{ cursor: "pointer", transition: "r 0.1s" }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
              />
              {hovered === idx && (
                <>
                  <line x1={point.x} y1={point.y} x2={point.x} y2={padding.top + graphHeight} stroke="#C0392B" strokeWidth="1" strokeDasharray="3" />
                  <rect x={point.x - 40} y={point.y - 28} width="80" height="22" rx="4" fill="#1A1A1A" />
                  <text x={point.x} y={point.y - 14} textAnchor="middle" fontSize="10" fill="white">
                    {point.value.toLocaleString()} FCFA
                  </text>
                </>
              )}
            </g>
          ))}
          <line x1={padding.left} y1={padding.top + graphHeight} x2={width - padding.right} y2={padding.top + graphHeight} stroke="#E0D8D0" strokeWidth="1" />
          {points.map((point, idx) => (
            <text key={idx} x={point.x} y={padding.top + graphHeight + 18} textAnchor="middle" fontSize="10" fill="#999">
              {point.label}
            </text>
          ))}
        </svg>
      </div>
      <div className="flex justify-center gap-8 mt-4 pt-4 border-t" style={{ borderColor: "#F0E8E0" }}>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: "#C0392B" }}>{total.toLocaleString()} FCFA</div>
          <div className="text-xs" style={{ color: "#999" }}>CA {periode === "jour" ? "aujourd'hui" : periode === "semaine" ? "cette semaine" : "ce mois"}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: "#3498DB" }}>{orders.filter(o => o.statut === "Livré").length}</div>
          <div className="text-xs" style={{ color: "#999" }}>Commandes livrées</div>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// COMPOSANT PRINCIPAL OVERVIEW (connecté à Firestore)
// ------------------------------------------------------------------
export default function Overview() {
  const navigate = useNavigate()
  const [periode, setPeriode] = useState<Periode>("jour")
  const [orders, setOrders] = useState<Order[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Écoute en temps réel des commandes
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data()
        let createdAt = data.createdAt
        if (createdAt && typeof createdAt.toDate === "function") {
          createdAt = createdAt.toDate().toISOString()
        } else if (typeof createdAt === "string") {
          createdAt = createdAt
        } else {
          createdAt = new Date().toISOString()
        }
        return { id: doc.id, ...data, createdAt } as Order
      })
      setOrders(ordersData)
      setLastRefresh(new Date())
      setLoading(false)
    }, (error) => {
      console.error("Erreur commandes:", error)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Écoute en temps réel des réservations
  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => {
        const data = doc.data()
        let createdAt = data.createdAt
        if (createdAt && typeof createdAt.toDate === "function") {
          createdAt = createdAt.toDate().toISOString()
        } else if (typeof createdAt === "string") {
          createdAt = createdAt
        } else {
          createdAt = new Date().toISOString()
        }
        return { id: doc.id, ...data, createdAt } as Reservation
      })
      setReservations(reservationsData)
    }, (error) => {
      console.error("Erreur réservations:", error)
    })
    return () => unsub()
  }, [])

  const now = new Date()

  // Filtrer commandes selon période
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.createdAt)
      if (periode === "jour") return d.toDateString() === now.toDateString()
      if (periode === "semaine") {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay() + 1)
        startOfWeek.setHours(0,0,0,0)
        return d >= startOfWeek
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }, [orders, periode, now])

  // Stats réelles
  const ca = filteredOrders.reduce((s, o) => s + o.total, 0)
  const nbCommandes = filteredOrders.length
  const pendingOrders = orders.filter(o => o.statut === "En attente").length
  const pendingRes = reservations.filter(r => r.statut === "En attente").length
  const confirmedRes = reservations.filter(r => r.statut === "Confirmée").length

  // Répartition par type
  const typeData = {
    labels: ["Sur place", "À emporter", "Livraison"],
    data: [
      filteredOrders.filter(o => o.type === "table").length,
      filteredOrders.filter(o => o.type === "emporter").length,
      filteredOrders.filter(o => o.type === "livraison").length,
    ],
    colors: ["#3498DB", "#E67E22", "#27AE60"]
  }

  // Statuts en cours (toutes commandes)
  const statusData = {
    labels: ["En attente", "En cuisine", "Prêt", "Livré"],
    data: [
      orders.filter(o => o.statut === "En attente").length,
      orders.filter(o => o.statut === "En cuisine").length,
      orders.filter(o => o.statut === "Prêt").length,
      orders.filter(o => o.statut === "Livré").length,
    ],
    colors: ["#E67E22", "#3498DB", "#9B59B6", "#27AE60"]
  }

  // Top plats réels
  const topDishes = useMemo(() => {
    const counts: Record<string, { commandes: number; revenus: number }> = {}
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        if (!counts[item.nom]) counts[item.nom] = { commandes: 0, revenus: 0 }
        counts[item.nom].commandes += item.quantite
        counts[item.nom].revenus += item.prix * item.quantite
      })
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1].commandes - a[1].commandes).slice(0, 4)
    const maxCmd = sorted[0]?.[1].commandes || 1
    return sorted.map(([nom, stats]) => ({ nom, ...stats, pct: Math.round((stats.commandes / maxCmd) * 100) }))
  }, [filteredOrders])

  const recentReservations = reservations.slice(0, 3)
  const recentOrders = orders.slice(0, 4)

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      const diff = now.getTime() - d.getTime()
      if (diff < 60000) return "À l'instant"
      if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    } catch { return "" }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: "#AAA" }}>Chargement des données...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Vue d'ensemble</h1>
          <p className="text-sm mt-1" style={{ color: "#999" }}>Données en temps réel · {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#27AE60" }} />
            <span className="text-xs" style={{ color: "#27AE60" }}>En direct</span>
          </div>
          <button onClick={() => setLastRefresh(new Date())} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-50" style={{ color: "#C0392B" }}>
            <RefreshCw size={13} /> Actualiser
          </button>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F0E8E0" }}>
            {(["jour", "semaine", "mois"] as const).map(p => (
              <button key={p} onClick={() => setPeriode(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={periode === p ? { background: "white", color: "#C0392B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } : { color: "#999" }}>
                {p === "jour" ? "Aujourd'hui" : p === "semaine" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alertes temps réel */}
      {(pendingOrders > 0 || pendingRes > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingOrders > 0 && (
            <button onClick={() => navigate("/dashboard/orders")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 animate-pulse"
              style={{ background: "rgba(230,126,34,0.1)", color: "#E67E22", border: "1px solid rgba(230,126,34,0.3)" }}>
              🔔 {pendingOrders} commande{pendingOrders > 1 ? "s" : ""} en attente → Traiter
            </button>
          )}
          {pendingRes > 0 && (
            <button onClick={() => navigate("/dashboard/reservations")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 animate-pulse"
              style={{ background: "rgba(52,152,219,0.1)", color: "#3498DB", border: "1px solid rgba(52,152,219,0.3)" }}>
              🔔 {pendingRes} réservation{pendingRes > 1 ? "s" : ""} à confirmer → Voir
            </button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Chiffre d'affaires", value: `${ca.toLocaleString()}`, unit: "FCFA", icon: TrendingUp, color: "#C0392B", bg: "rgba(192,57,43,0.08)", sub: `${nbCommandes} commandes` },
          { label: "Commandes actives", value: `${orders.filter(o => o.statut !== "Livré").length}`, unit: "en cours", icon: ShoppingBag, color: "#3498DB", bg: "rgba(52,152,219,0.08)", sub: `${pendingOrders} en attente` },
          { label: "Réservations", value: `${reservations.length}`, unit: "total", icon: CalendarCheck, color: "#9B59B6", bg: "rgba(155,89,182,0.08)", sub: `${confirmedRes} confirmées` },
          { label: "À traiter", value: `${pendingOrders + pendingRes}`, unit: "actions requises", icon: UserCheck, color: pendingOrders + pendingRes > 0 ? "#E67E22" : "#27AE60", bg: pendingOrders + pendingRes > 0 ? "rgba(230,126,34,0.08)" : "rgba(39,174,96,0.08)", sub: pendingOrders + pendingRes === 0 ? "Tout est à jour ✓" : "Action requise !" },
        ].map(({ label, value, unit, icon: Icon, color, bg, sub }) => (
          <div key={label} className="p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{value}</div>
            <div className="text-xs" style={{ color: "#AAA" }}>{unit}</div>
            <div className="text-xs font-medium mt-1" style={{ color: "#888" }}>{label}</div>
            <div className="text-xs mt-1" style={{ color }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Graphique évolution CA */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
          <h2 className="font-bold" style={{ color: "#1A1A1A" }}>Évolution du chiffre d'affaires</h2>
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(39,174,96,0.1)", color: "#27AE60" }}>
            Données réelles
          </span>
        </div>
        <div className="p-6">
          <EvolutionChart orders={filteredOrders} periode={periode} />
        </div>
      </div>

      {/* Répartition + Statuts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
            <h2 className="font-bold flex items-center gap-2" style={{ color: "#1A1A1A" }}>
              <ShoppingBag size={18} style={{ color: "#C0392B" }} /> Répartition des commandes
            </h2>
            <p className="text-xs mt-1" style={{ color: "#999" }}>Par type de service (données réelles)</p>
          </div>
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8" style={{ color: "#DDD" }}>
                <ShoppingBag size={32} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: "#CCC" }}>Pas encore de commandes</p>
              </div>
            ) : <VerticalBarChart data={typeData} />}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
            <h2 className="font-bold flex items-center gap-2" style={{ color: "#1A1A1A" }}>
              <Clock size={18} style={{ color: "#C0392B" }} /> Statuts en cours
            </h2>
            <p className="text-xs mt-1" style={{ color: "#999" }}>Toutes les commandes</p>
          </div>
          <div className="p-6 flex justify-center">
            <DonutChart data={statusData} />
          </div>
        </div>
      </div>

      {/* Commandes récentes + Réservations récentes */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
            <h2 className="font-bold" style={{ color: "#1A1A1A" }}>Commandes récentes</h2>
            <button onClick={() => navigate("/dashboard/orders")}
              className="flex items-center gap-1.5 text-sm font-medium hover:text-red-600" style={{ color: "#C0392B" }}>
              Voir tout <ArrowRight size={14} />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#DDD" }}>
              <ShoppingBag size={32} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: "#CCC" }}>Aucune commande pour le moment</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F8F3EF" }}>
              {recentOrders.map(order => {
                const cfg = statusCfg[order.statut] || statusCfg["En attente"]
                const Icon = cfg.icon
                return (
                  <div key={order.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs"
                        style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B" }}>
                        #{order.id.slice(-3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: "#1A1A1A" }}>{order.client}</span>
                          <span className="text-xs" style={{ color: "#BBB" }}>· {formatTime(order.createdAt)}</span>
                        </div>
                        <div className="text-xs truncate" style={{ color: "#AAA" }}>
                          {order.items.map(i => `${i.quantite}x ${i.nom}`).join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-sm" style={{ color: "#C0392B" }}>{order.total.toLocaleString()} F</span>
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon size={10} /> {order.statut}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
            <h2 className="font-bold" style={{ color: "#1A1A1A" }}>Réservations récentes</h2>
            <button onClick={() => navigate("/dashboard/reservations")} className="text-sm font-medium" style={{ color: "#C0392B" }}>
              Voir tout
            </button>
          </div>
          {recentReservations.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#DDD" }}>
              <CalendarCheck size={32} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: "#CCC" }}>Aucune réservation</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F8F3EF" }}>
              {recentReservations.map((r, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-semibold text-sm" style={{ color: "#1A1A1A" }}>{r.nom}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={r.statut === "Confirmée"
                        ? { background: "rgba(39,174,96,0.1)", color: "#27AE60" }
                        : r.statut === "Annulée"
                        ? { background: "rgba(231,76,60,0.1)", color: "#E74C3C" }
                        : { background: "rgba(230,126,34,0.1)", color: "#E67E22" }}>
                      {r.statut}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#AAA" }}>
                    <span>📅 {r.date}</span>
                    <span>🕐 {r.heure}</span>
                    <span>👥 {r.personnes} pers.</span>
                  </div>
                  {r.occasion && r.occasion !== "Aucune" && (
                    <div className="text-xs mt-1" style={{ color: "#C0392B" }}>{r.occasion}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top plats */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
          <h2 className="font-bold flex items-center gap-2" style={{ color: "#1A1A1A" }}>
            <Award size={18} style={{ color: "#C0392B" }} /> Plats les plus commandés
          </h2>
          <button onClick={() => navigate("/dashboard/menu")} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#C0392B" }}>
            Gérer le menu <ArrowRight size={14} />
          </button>
        </div>
        <div className="p-6">
          {topDishes.length === 0 ? (
            <div className="text-center py-8" style={{ color: "#DDD" }}>
              <Award size={32} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: "#CCC" }}>Les statistiques s'afficheront dès les premières commandes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topDishes.map(({ nom, commandes, revenus, pct }, i) => (
                <div key={nom}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: i === 0 ? "#D4A017" : i === 1 ? "#95A5A6" : i === 2 ? "#CD7F32" : "#DDD" }}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm" style={{ color: "#1A1A1A" }}>{nom}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: "#AAA" }}>{commandes} cmd</span>
                      <span className="font-bold" style={{ color: "#C0392B" }}>{revenus.toLocaleString()} F</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F0E8E0" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: "linear-gradient(to right, #C0392B, #E74C3C)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}