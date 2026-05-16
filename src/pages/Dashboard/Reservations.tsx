// src/pages/Dashboard/Reservations.tsx
import { useState, useEffect } from "react"
import { CalendarCheck, Clock, Users, Search, Filter, RefreshCw, X } from "lucide-react"
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from "firebase/firestore"
import { db } from "../../firebase"
import { Timestamp, FieldValue } from "firebase/firestore"

interface Reservation {
  id: string
  nom: string
  email: string
  telephone: string
  date: string
  heure: string
  personnes: number
  occasion: string
  notes: string
  precomm: { nom: string; quantite: number; prix: number }[]
  menuNote: string
  statut: "En attente" | "Confirmée" | "Annulée" | "Terminée"
  createdAt: string
  serverTime?: Timestamp | FieldValue
  archived?: boolean
}

const statusConfig: Record<string, { color: string; bg: string; label: string; actions: string[] }> = {
  "En attente": { color: "#E67E22", bg: "rgba(230,126,34,0.08)", label: "En attente", actions: ["Confirmée", "Annulée"] },
  "Confirmée":  { color: "#27AE60", bg: "rgba(39,174,96,0.08)",  label: "Confirmée",  actions: ["Terminée", "Annulée"] },
  "Annulée":    { color: "#E74C3C", bg: "rgba(231,76,60,0.08)",  label: "Annulée",    actions: [] },
  "Terminée":   { color: "#95A5A6", bg: "rgba(149,165,166,0.08)", label: "Terminée",   actions: [] },
}

// Composant Détail réutilisable
const ReservationDetail = ({ reservation, onUpdateStatus, updating }: { 
  reservation: Reservation; 
  onUpdateStatus: (id: string, status: Reservation["statut"]) => void;
  updating: boolean;
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
  }

  const formatTimeAgo = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      if (diff < 60000) return "À l'instant"
      if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    } catch { return "" }
  }

  return (
    <div className="mt-3 rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
      <div className="p-4 sm:p-5 border-b" style={{ background: "rgba(192,57,43,0.05)", borderColor: "#F0E8E0" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-base sm:text-lg">{reservation.nom}</div>
            <div className="text-xs mt-0.5">#{reservation.id.slice(-6).toUpperCase()}</div>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold"
            style={{ background: statusConfig[reservation.statut].bg, color: statusConfig[reservation.statut].color }}>
            {statusConfig[reservation.statut].label}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm"><CalendarCheck size={14} style={{ color: "#C0392B" }} /> {formatDate(reservation.date)}</div>
          <div className="flex items-center gap-2 text-sm"><Clock size={14} style={{ color: "#C0392B" }} /> {reservation.heure}</div>
          <div className="flex items-center gap-2 text-sm"><Users size={14} style={{ color: "#C0392B" }} /> {reservation.personnes} personne{reservation.personnes > 1 ? "s" : ""}</div>
        </div>
        <div className="border-t pt-3">
          <h3 className="font-semibold text-sm mb-2">Contact</h3>
          <p className="text-sm break-all">{reservation.email}</p>
          <p className="text-sm">{reservation.telephone}</p>
        </div>
        {reservation.occasion && reservation.occasion !== "Aucune" && (
          <div className="border-t pt-3">
            <h3 className="font-semibold text-sm mb-1">Occasion</h3>
            <p className="text-sm" style={{ color: "#C0392B" }}>{reservation.occasion}</p>
          </div>
        )}
        {reservation.notes && (
          <div className="border-t pt-3">
            <h3 className="font-semibold text-sm mb-1">Remarques</h3>
            <p className="text-sm" style={{ color: "#666" }}>{reservation.notes}</p>
          </div>
        )}
        {reservation.precomm && reservation.precomm.length > 0 && (
          <div className="border-t pt-3">
            <h3 className="font-semibold text-sm mb-2">Pré-commande</h3>
            <div className="space-y-1">
              {reservation.precomm.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.quantite}x {item.nom}</span>
                  <span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {reservation.menuNote && (
          <div className="border-t pt-3">
            <h3 className="font-semibold text-sm mb-1">Note pour le menu</h3>
            <p className="text-sm">{reservation.menuNote}</p>
          </div>
        )}
        <div className="border-t pt-3 text-xs" style={{ color: "#BBB" }}>
          Réservé le {formatTimeAgo(reservation.createdAt)}
        </div>
        {statusConfig[reservation.statut].actions.length > 0 && (
          <div className="flex gap-3 pt-2">
            {statusConfig[reservation.statut].actions.map(action => (
              <button
                key={action}
                onClick={() => onUpdateStatus(reservation.id, action as Reservation["statut"])}
                disabled={updating}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
                style={{ background: action === "Confirmée" ? "#27AE60" : action === "Annulée" ? "#E74C3C" : "#95A5A6" }}
              >
                {action === "Confirmée" ? "Confirmer" : action === "Annulée" ? "Annuler" : "Terminer"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<string>("Tous")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [updating, setUpdating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Firestore
  useEffect(() => {
    const q = query(collection(db, "reservations"), orderBy("serverTime", "desc"))
    const unsub = onSnapshot(q,
      (snapshot) => {
        const data: Reservation[] = snapshot.docs.map(doc => {
          const d = doc.data()
          let displayDate = d.createdAt
          if (d.serverTime && typeof d.serverTime.toDate === "function") {
            displayDate = d.serverTime.toDate().toISOString()
          } else if (!displayDate) {
            displayDate = new Date().toISOString()
          }
          return { id: doc.id, ...d, createdAt: displayDate, archived: d.archived || false } as Reservation
        })
        setReservations(data)
        setLoading(false)
        setLastRefresh(new Date())
        if (selected) {
          const updated = data.find(r => r.id === selected.id)
          if (updated) setSelected(updated)
          else setSelected(null)
        }
      },
      (error) => console.error("Erreur Firestore (admin):", error)
    )
    return () => unsub()
  }, [selected])

  const updateStatus = async (id: string, newStatus: Reservation["statut"]) => {
    setUpdating(true)
    try {
      await updateDoc(doc(db, "reservations", id), { statut: newStatus })
    } catch (err) {
      console.error("Erreur mise à jour statut:", err)
    } finally {
      setUpdating(false)
    }
  }

  const hideReservation = async (id: string) => {
    try {
      await updateDoc(doc(db, "reservations", id), { archived: true })
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error("Erreur masquage réservation:", err)
    }
  }

  const filtered = reservations.filter(res => {
    if (!showArchived && res.archived) return false
    const matchStatut = filter === "Tous" || res.statut === filter
    const matchSearch =
      res.nom.toLowerCase().includes(search.toLowerCase()) ||
      res.email.toLowerCase().includes(search.toLowerCase()) ||
      res.id.includes(search)
    return matchStatut && matchSearch
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
  }

  const formatTimeAgo = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      if (diff < 60000) return "À l'instant"
      if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    } catch { return "" }
  }

  const stats = {
    total: reservations.length,
    enAttente: reservations.filter(r => r.statut === "En attente").length,
    confirmees: reservations.filter(r => r.statut === "Confirmée").length,
    annulees: reservations.filter(r => r.statut === "Annulée").length,
    terminees: reservations.filter(r => r.statut === "Terminée").length,
  }

  if (loading) return <div className="text-center py-20">Chargement des réservations...</div>

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
            Gestion des réservations
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "#999" }}>
            {stats.total} réservation(s) · {stats.enAttente} en attente · {stats.confirmees} confirmée(s)
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#27AE60" }} />
            <span className="text-[10px] sm:text-xs" style={{ color: "#27AE60" }}>En direct</span>
          </div>
          <span className="text-[10px] sm:text-xs" style={{ color: "#AAA" }}>{lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button onClick={() => setLastRefresh(new Date())}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-red-50"
            style={{ color: "#C0392B" }}><RefreshCw size={12} /> <span className="hidden sm:inline">Actualiser</span></button>
        </div>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Toutes", val: stats.total, color: "#1A1A1A", filter: "Tous" },
          { label: "En attente", val: stats.enAttente, color: "#E67E22", filter: "En attente" },
          { label: "Confirmées", val: stats.confirmees, color: "#27AE60", filter: "Confirmée" },
          { label: "Annulées", val: stats.annulees, color: "#E74C3C", filter: "Annulée" },
          { label: "Terminées", val: stats.terminees, color: "#95A5A6", filter: "Terminée" },
        ].map(({ label, val, color, filter: f }) => (
          <button key={label} onClick={() => setFilter(f)}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all hover:-translate-y-0.5"
            style={{ background: filter === f ? `${color}15` : "white", border: `1px solid ${filter === f ? color : "#F0E8E0"}` }}>
            <div className="text-lg sm:text-xl font-bold" style={{ color }}>{val}</div>
            <div className="text-[10px] sm:text-xs mt-1" style={{ color: "#AAA" }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (nom, email, n° réservation)"
            className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "#AAA" }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#555" }}>
            <option value="Tous">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="Confirmée">Confirmée</option>
            <option value="Annulée">Annulée</option>
            <option value="Terminée">Terminée</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: "#555" }}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Afficher les réservations masquées
        </label>
      </div>

      {/* Zone principale */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 sm:py-20 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
          <CalendarCheck size={40} className="mx-auto mb-3 sm:mb-4" style={{ color: "#DDD" }} />
          <p className="font-semibold mb-1" style={{ color: "#BBB" }}>Aucune réservation trouvée</p>
        </div>
      ) : (
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex flex-row gap-6'}`}>
          {/* Liste des réservations */}
          <div className={`${isMobile ? 'w-full' : 'flex-1'} space-y-3`}>
            {filtered.map(res => {
              const cfg = statusConfig[res.statut]
              const isSelected = selected?.id === res.id
              const isFinished = res.statut === "Terminée"
              return (
                <div key={res.id}>
                  {/* Carte réservation */}
                  <div onClick={() => setSelected(isSelected ? null : res)}
                    className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 ${
                      isSelected ? "ring-2 ring-[#C0392B] shadow-md" : ""
                    }`}
                    style={{ background: "white", border: "1px solid #F0E8E0" }}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-bold text-sm sm:text-base" style={{ color: "#1A1A1A" }}>{res.nom}</div>
                        <div className="text-[10px] sm:text-xs mt-0.5" style={{ color: "#AAA" }}>{formatDate(res.date)} · {res.heure}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold"
                          style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        {isFinished && !res.archived && (
                          <button
                            onClick={(e) => { e.stopPropagation(); hideReservation(res.id); }}
                            className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                            title="Masquer cette réservation"
                            style={{ color: "#AAA" }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm mb-2" style={{ color: "#666" }}>
                      {res.personnes} personne{res.personnes > 1 ? "s" : ""} · {res.telephone}
                    </div>
                    {res.precomm && res.precomm.length > 0 && (
                      <div className="text-[10px] sm:text-xs truncate" style={{ color: "#888" }}>
                        Pré-commande: {res.precomm.map(i => `${i.quantite}x ${i.nom}`).join(", ")}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] sm:text-xs" style={{ color: "#BBB" }}>#{res.id.slice(-6).toUpperCase()}</span>
                      {cfg.actions.length > 0 && (
                        <div className="flex gap-2">
                          {cfg.actions.map(action => (
                            <button key={action} onClick={e => { e.stopPropagation(); updateStatus(res.id, action as any) }} disabled={updating}
                              className="px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: action === "Confirmée" ? "#27AE60" : action === "Annulée" ? "#E74C3C" : "#95A5A6", color: "white" }}>
                              {action === "Confirmée" ? "✓ Confirmer" : action === "Annulée" ? "✗ Annuler" : "✓ Terminer"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Détail sous la réservation si sélectionnée (mobile uniquement) */}
                  {isMobile && isSelected && (
                    <ReservationDetail reservation={res} onUpdateStatus={updateStatus} updating={updating} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Panneau détail desktop (côté droit) */}
          {!isMobile && (
            <div className="lg:w-2/5">
              {selected ? (
                <ReservationDetail reservation={selected} onUpdateStatus={updateStatus} updating={updating} />
              ) : (
                <div className="flex items-center justify-center h-48 sm:h-64 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                  <div className="text-center">
                    <CalendarCheck size={28} className="mx-auto mb-2" style={{ color: "#DDD" }} />
                    <p className="text-xs sm:text-sm" style={{ color: "#BBB" }}>Cliquez sur une réservation</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}