// src/pages/Dashboard/Reservations.tsx
import { useState, useEffect } from "react"
import { CalendarCheck, Clock, Users, Search, Filter, RefreshCw } from "lucide-react"
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
  serverTime?: Timestamp | FieldValue  // ← plus de any
}

const statusConfig: Record<string, { color: string; bg: string; label: string; actions: string[] }> = {
  "En attente": { color: "#E67E22", bg: "rgba(230,126,34,0.08)", label: "En attente", actions: ["Confirmée", "Annulée"] },
  "Confirmée":  { color: "#27AE60", bg: "rgba(39,174,96,0.08)",  label: "Confirmée",  actions: ["Terminée", "Annulée"] },
  "Annulée":    { color: "#E74C3C", bg: "rgba(231,76,60,0.08)",  label: "Annulée",    actions: [] },
  "Terminée":   { color: "#95A5A6", bg: "rgba(149,165,166,0.08)", label: "Terminée",   actions: [] },
}

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<string>("Tous")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [updating, setUpdating] = useState(false)

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
          return { id: doc.id, ...d, createdAt: displayDate } as Reservation
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

  const filtered = reservations.filter(res => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
            Gestion des réservations
          </h1>
          <p className="text-sm mt-1" style={{ color: "#999" }}>
            {stats.total} réservation(s) · {stats.enAttente} en attente · {stats.confirmees} confirmée(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#27AE60" }} />
            <span className="text-xs" style={{ color: "#27AE60" }}>En direct</span>
          </div>
          <span className="text-xs" style={{ color: "#AAA" }}>{lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button onClick={() => setLastRefresh(new Date())}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-50"
            style={{ color: "#C0392B" }}><RefreshCw size={14} /> Actualiser</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Toutes", val: stats.total, color: "#1A1A1A", filter: "Tous" },
          { label: "En attente", val: stats.enAttente, color: "#E67E22", filter: "En attente" },
          { label: "Confirmées", val: stats.confirmees, color: "#27AE60", filter: "Confirmée" },
          { label: "Annulées", val: stats.annulees, color: "#E74C3C", filter: "Annulée" },
          { label: "Terminées", val: stats.terminees, color: "#95A5A6", filter: "Terminée" },
        ].map(({ label, val, color, filter: f }) => (
          <button key={label} onClick={() => setFilter(f)}
            className="p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5"
            style={{ background: filter === f ? `${color}15` : "white", border: `1px solid ${filter === f ? color : "#F0E8E0"}` }}>
            <div className="text-xl font-bold" style={{ color }}>{val}</div>
            <div className="text-xs mt-1" style={{ color: "#AAA" }}>{label}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher (nom, email, n° réservation)"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} style={{ color: "#AAA" }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#555" }}>
            <option value="Tous">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="Confirmée">Confirmée</option>
            <option value="Annulée">Annulée</option>
            <option value="Terminée">Terminée</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
          <CalendarCheck size={40} className="mx-auto mb-4" style={{ color: "#DDD" }} />
          <p className="font-semibold mb-2" style={{ color: "#BBB" }}>Aucune réservation trouvée</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filtered.map(res => {
              const cfg = statusConfig[res.statut]
              const isSelected = selected?.id === res.id
              return (
                <div key={res.id} onClick={() => setSelected(res)}
                  className="p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ background: "white", border: isSelected ? "2px solid #C0392B" : "1px solid #F0E8E0", boxShadow: isSelected ? "0 4px 20px rgba(192,57,43,0.12)" : "none" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold" style={{ color: "#1A1A1A" }}>{res.nom}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#AAA" }}>{formatDate(res.date)} · {res.heure}</div>
                    </div>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div className="text-sm mb-2" style={{ color: "#666" }}>{res.personnes} personne{res.personnes > 1 ? "s" : ""} · {res.telephone}</div>
                  {res.precomm && res.precomm.length > 0 && (
                    <div className="text-xs truncate" style={{ color: "#888" }}>Pré-commande: {res.precomm.map(i => `${i.quantite}x ${i.nom}`).join(", ")}</div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs" style={{ color: "#BBB" }}>#{res.id.slice(-6).toUpperCase()}</span>
                    {cfg.actions.length > 0 && (
                      <div className="flex gap-2">
                        {cfg.actions.map(action => (
                          <button key={action} onClick={e => { e.stopPropagation(); updateStatus(res.id, action as any) }} disabled={updating}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: action === "Confirmée" ? "#27AE60" : action === "Annulée" ? "#E74C3C" : "#95A5A6", color: "white" }}>
                            {action === "Confirmée" ? "✓ Confirmer" : action === "Annulée" ? "✗ Annuler" : "✓ Terminer"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {selected ? (
                <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                  <div className="p-5 border-b" style={{ background: "rgba(192,57,43,0.05)", borderColor: "#F0E8E0" }}>
                    <div className="flex items-center justify-between">
                      <div><div className="font-bold text-lg">{selected.nom}</div><div className="text-xs mt-0.5">#{selected.id.slice(-6).toUpperCase()}</div></div>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                        style={{ background: statusConfig[selected.statut].bg, color: statusConfig[selected.statut].color }}>{statusConfig[selected.statut].label}</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm"><CalendarCheck size={14} style={{ color: "#C0392B" }} /> {formatDate(selected.date)}</div>
                      <div className="flex items-center gap-2 text-sm"><Clock size={14} style={{ color: "#C0392B" }} /> {selected.heure}</div>
                      <div className="flex items-center gap-2 text-sm"><Users size={14} style={{ color: "#C0392B" }} /> {selected.personnes} personne{selected.personnes > 1 ? "s" : ""}</div>
                    </div>
                    <div className="border-t pt-3"><h3 className="font-semibold text-sm mb-2">Contact</h3><p className="text-sm">{selected.email}</p><p className="text-sm">{selected.telephone}</p></div>
                    {selected.occasion && selected.occasion !== "Aucune" && <div className="border-t pt-3"><h3 className="font-semibold text-sm mb-1">Occasion</h3><p className="text-sm" style={{ color: "#C0392B" }}>{selected.occasion}</p></div>}
                    {selected.notes && <div className="border-t pt-3"><h3 className="font-semibold text-sm mb-1">Remarques</h3><p className="text-sm" style={{ color: "#666" }}>{selected.notes}</p></div>}
                    {selected.precomm && selected.precomm.length > 0 && (
                      <div className="border-t pt-3"><h3 className="font-semibold text-sm mb-2">Pré-commande</h3><div className="space-y-1">{selected.precomm.map((item, i) => <div key={i} className="flex justify-between text-sm"><span>{item.quantite}x {item.nom}</span><span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} F</span></div>)}</div></div>
                    )}
                    {selected.menuNote && <div className="border-t pt-3"><h3 className="font-semibold text-sm mb-1">Note pour le menu</h3><p className="text-sm">{selected.menuNote}</p></div>}
                    <div className="border-t pt-3 text-xs" style={{ color: "#BBB" }}>Réservé le {formatTimeAgo(selected.createdAt)}</div>
                    {statusConfig[selected.statut].actions.length > 0 && (
                      <div className="flex gap-3 pt-2">
                        {statusConfig[selected.statut].actions.map(action => (
                          <button key={action} onClick={() => updateStatus(selected.id, action as any)} disabled={updating}
                            className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
                            style={{ background: action === "Confirmée" ? "#27AE60" : action === "Annulée" ? "#E74C3C" : "#95A5A6" }}>
                            {action === "Confirmée" ? "Confirmer la réservation" : action === "Annulée" ? "Annuler" : "Marquer terminée"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                  <div className="text-center"><CalendarCheck size={28} className="mx-auto mb-2" style={{ color: "#DDD" }} /><p className="text-sm" style={{ color: "#BBB" }}>Cliquez sur une réservation</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}