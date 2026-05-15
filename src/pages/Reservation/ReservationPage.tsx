// src/pages/Reservation/ReservationPage.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
   ArrowLeft, CalendarCheck, Clock, Users, CheckCircle,
  ChevronLeft, ChevronRight, ShoppingBag, Plus, Minus, ClipboardList, LogIn
} from "lucide-react"
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp
} from "firebase/firestore"
import { db } from "../../firebase"
import { useAuth } from "../../context/AuthContext"

// Interface pour les plats depuis Firestore
interface MenuItem {
  id: string
  nom: string
  prix: number
  image: string
  categorie: string
  disponible: boolean
}

interface PrecommItem {
  id: string
  nom: string
  prix: number
  image: string
  quantite: number
}

interface Reservation {
  id: string
  userId: string
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
}

const timeSlots = ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]
const unavailable = ["12:30", "20:00"]
const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

const statusCfg: Record<string, { color: string; bg: string; label: string; border: string }> = {
  "En attente": { color: "#E67E22", bg: "rgba(230,126,34,0.08)", label: "En attente ⏳", border: "rgba(230,126,34,0.3)" },
  "Confirmée":  { color: "#27AE60", bg: "rgba(39,174,96,0.08)",  label: "Confirmée ✓",   border: "rgba(39,174,96,0.3)" },
  "Annulée":    { color: "#E74C3C", bg: "rgba(231,76,60,0.08)",  label: "Annulée ✗",     border: "rgba(231,76,60,0.3)" },
  "Terminée":   { color: "#95A5A6", bg: "rgba(149,165,166,0.08)", label: "Terminée",      border: "rgba(149,165,166,0.3)" },
}

type Step = 1 | 2 | 3 | 4

export default function ReservationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState({ nom: "", email: "", telephone: "", personnes: 2, date: "", heure: "", occasion: "", notes: "" })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState("")
  const [precomm, setPrecomm] = useState<PrecommItem[]>([])
  const [menuNote, setMenuNote] = useState("")
  const [showMenu, setShowMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<"nouvelle" | "historique">("nouvelle")
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingRes, setLoadingRes] = useState(true)
  const [saving, setSaving] = useState(false)
  const [menu, setMenu] = useState<MenuItem[]>([])

  // Chargement du menu depuis Firestore (plats disponibles)
  useEffect(() => {
    const q = query(collection(db, "menu"), where("disponible", "==", true))
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
      setMenu(items)
    })
    return () => unsub()
  }, [])

  // Pré‑remplir le formulaire si l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        nom: f.nom || user.nom || "",
        email: f.email || user.email || "",
        telephone: f.telephone || user.telephone || "",
      }))
    }
  }, [user])

  // Écoute en temps réel des réservations de l'utilisateur (historique)
  useEffect(() => {
    if (!user) {
      setLoadingRes(false)
      return
    }
    const q = query(
      collection(db, "reservations"),
      where("userId", "==", user.id),
      orderBy("serverTime", "desc")
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data()
        let displayDate = docData.createdAt
        const svTime = docData.serverTime
        if (svTime && typeof svTime.toDate === "function") {
          displayDate = svTime.toDate().toISOString()
        } else if (!displayDate) {
          displayDate = new Date().toISOString()
        }
        return { id: d.id, ...docData, createdAt: displayDate } as Reservation
      })
      setReservations(data)
      setLoadingRes(false)
    }, (err) => {
      console.error("Erreur Firestore réservations client:", err)
      setLoadingRes(false)
    })
    return () => unsub()
  }, [user?.id])

  // Utilitaires calendrier
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay()
  const today = new Date()
  const isDateAvailable = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return d >= today && d.getDay() !== 0
  }
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }
  const formatDateShort = (iso: string) => {
    if (!iso) return ""
    try {
      const d = new Date(iso)
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    } catch { return iso }
  }

  // Gestion de la précommande
  const addPrecomm = (item: MenuItem) => {
    setPrecomm(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantite: i.quantite + 1 } : i)
      return [...prev, { ...item, quantite: 1 }]
    })
  }
  const updatePrecomm = (id: string, delta: number) => {
    setPrecomm(prev =>
      prev.map(i => i.id === id ? { ...i, quantite: Math.max(0, i.quantite + delta) } : i)
         .filter(i => i.quantite > 0)
    )
  }
  const precommTotal = precomm.reduce((s, i) => s + i.prix * i.quantite, 0)
  const precommCount = precomm.reduce((s, i) => s + i.quantite, 0)

  // Soumission de la réservation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const docRef = await addDoc(collection(db, "reservations"), {
        userId: user?.id || "anonymous",
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        date: form.date,
        heure: form.heure,
        personnes: form.personnes,
        occasion: form.occasion || "Aucune",
        notes: form.notes,
        precomm: precomm.map(i => ({ nom: i.nom, quantite: i.quantite, prix: i.prix })),
        menuNote: menuNote,
        statut: "En attente",
        createdAt: new Date().toISOString(),
        serverTime: serverTimestamp(),
      })
      setSubmittedId(docRef.id.slice(-6).toUpperCase())
      setSubmitted(true)
    } catch (err) {
      console.error("Erreur réservation:", err)
    } finally {
      setSaving(false)
    }
  }

  // Si non connecté
  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: "#FFFAF5" }}>
        <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(255,250,245,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(192,57,43,0.1)" }}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-50" style={{ color: "#C0392B" }}><ArrowLeft size={16} /> Accueil</button>
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><CalendarCheck size={16} className="text-white" /></div><span className="font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Réservation</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF0EE" }}><CalendarCheck size={28} style={{ color: "#C0392B" }} /></div>
            <h2 className="font-bold text-xl mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Connectez-vous pour réserver</h2>
            <p className="text-sm text-gray-400 mb-6">Créez un compte pour réserver une table et suivre vos réservations.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate("/login")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold" style={{ background: "#C0392B" }}><LogIn size={15} /> Se connecter</button>
              <button onClick={() => navigate("/register")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold border-2" style={{ borderColor: "#C0392B", color: "#C0392B" }}>Créer un compte</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Rendu principal
  return (
    <div className="min-h-screen" style={{ background: "#FFFAF5" }}>
      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(255,250,245,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(192,57,43,0.1)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-all" style={{ color: "#C0392B" }}><ArrowLeft size={16} /> Accueil</button>
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><CalendarCheck size={16} className="text-white" /></div><span className="font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Réservation</span></div>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F0E8E0" }}>
            <button onClick={() => { setActiveTab("nouvelle"); setSubmitted(false) }} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={activeTab === "nouvelle" ? { background: "white", color: "#C0392B" } : { color: "#888" }}>Nouvelle</button>
            <button onClick={() => setActiveTab("historique")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={activeTab === "historique" ? { background: "white", color: "#C0392B" } : { color: "#888" }}><ClipboardList size={14} /> Mes réservations {reservations.length > 0 && `(${reservations.length})`}</button>
          </div>
        </div>
      </div>

      {/* HISTORIQUE DES RÉSERVATIONS */}
      {activeTab === "historique" && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Mes réservations</h2>
          {loadingRes ? (
            <div className="text-center py-16"><div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto" /></div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-20 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
              <CalendarCheck size={40} className="mx-auto mb-4" style={{ color: "#DDD" }} />
              <p className="font-semibold mb-2" style={{ color: "#BBB" }}>Aucune réservation</p>
              <button onClick={() => setActiveTab("nouvelle")} className="px-6 py-3 rounded-xl font-semibold text-white" style={{ background: "#C0392B" }}>Réserver une table</button>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map(res => {
                const cfg = statusCfg[res.statut] || statusCfg["En attente"]
                return (
                  <div key={res.id} className="rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5" style={{ background: "white", border: `1px solid ${cfg.border}` }}>
                    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                        {res.statut === "En attente" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(230,126,34,0.15)", color: "#E67E22" }}>En attente de confirmation</span>}
                        {res.statut === "Confirmée" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(39,174,96,0.15)", color: "#27AE60" }}>Votre table est réservée !</span>}
                        {res.statut === "Annulée" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(231,76,60,0.15)", color: "#E74C3C" }}>Contactez-nous</span>}
                      </div>
                      <span className="text-xs" style={{ color: "#AAA" }}>#{res.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="p-5">
                      <div className="font-bold text-lg" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{res.nom}</div>
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm" style={{ color: "#888" }}>
                        <span className="flex items-center gap-1"><CalendarCheck size={13} /> {formatDate(res.date)}</span>
                        <span className="flex items-center gap-1"><Clock size={13} /> {res.heure}</span>
                        <span className="flex items-center gap-1"><Users size={13} /> {res.personnes} pers.</span>
                      </div>
                      {res.occasion && res.occasion !== "Aucune" && <div className="text-sm mt-1" style={{ color: "#C0392B" }}>{res.occasion}</div>}
                      {res.precomm && res.precomm.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl" style={{ background: "#FFF5EE" }}>
                          <p className="text-xs font-semibold uppercase mb-2" style={{ color: "#C0392B" }}>Pré-commande ({res.precomm.length} plat{res.precomm.length > 1 ? "s" : ""})</p>
                          {res.precomm.map((item, i) => <div key={i} className="flex justify-between text-sm"><span>{item.quantite}x {item.nom}</span><span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} FCFA</span></div>)}
                        </div>
                      )}
                      {res.menuNote && <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: "#F8F8F8", color: "#666" }}><span className="font-semibold">Note : </span>{res.menuNote}</div>}
                      <div className="mt-3 text-xs" style={{ color: "#BBB" }}>Réservé le {formatDateShort(res.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* NOUVELLE RÉSERVATION */}
      {activeTab === "nouvelle" && !submitted && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={step >= s ? { background: "#C0392B", color: "white" } : { background: "#F0E8E0", color: "#AAA" }}>
                  {step > s ? "✓" : s}
                </div>
                {s < 4 && <div className="w-10 h-0.5" style={{ background: step > s ? "#C0392B" : "#E8E0D8" }} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mb-8 text-xs">
            {["Date & heure", "Détails", "Menu", "Coordonnées"].map((label, i) => (
              <span key={label} style={{ color: step === i + 1 ? "#C0392B" : "#AAA", fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
            ))}
          </div>

          {/* STEP 1 : Date et heure */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Choisissez votre date</h1>
              <p className="mb-8 text-sm" style={{ color: "#888" }}>Sélectionnez une date et un créneau horaire.</p>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} style={{ color: "#555" }} /></button>
                    <span className="font-bold" style={{ color: "#1A1A1A" }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} style={{ color: "#555" }} /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map(d => <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "#AAA" }}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDay(currentMonth.getFullYear(), currentMonth.getMonth()) }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }).map((_, i) => {
                      const day = i + 1
                      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      const available = isDateAvailable(day)
                      const selected = form.date === dateStr
                      return (
                        <button key={day} disabled={!available}
                          onClick={() => setForm({ ...form, date: dateStr, heure: "" })}
                          className="aspect-square rounded-xl text-sm font-medium transition-all hover:bg-red-50"
                          style={selected ? { background: "#C0392B", color: "white" } : available ? { color: "#1A1A1A" } : { color: "#DDD", cursor: "not-allowed" }}>
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  {form.date ? (
                    <>
                      <p className="font-semibold mb-4 text-sm" style={{ color: "#1A1A1A" }}>Créneaux — {formatDate(form.date)}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map(slot => {
                          const isUnavail = unavailable.includes(slot)
                          const isSelected = form.heure === slot
                          return (
                            <button key={slot} disabled={isUnavail}
                              onClick={() => setForm({ ...form, heure: slot })}
                              className="py-3 rounded-xl text-sm font-semibold transition-all"
                              style={isSelected ? { background: "#C0392B", color: "white" } : isUnavail ? { background: "#F5F5F5", color: "#CCC", cursor: "not-allowed", textDecoration: "line-through" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                      <div className="text-center p-8"><CalendarCheck size={32} className="mx-auto mb-3" style={{ color: "#DDD" }} /><p className="text-sm" style={{ color: "#BBB" }}>Sélectionnez d'abord une date</p></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button disabled={!form.date || !form.heure} onClick={() => setStep(2)} className="px-8 py-3.5 rounded-2xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-40" style={{ background: "#C0392B" }}>Continuer →</button>
              </div>
            </div>
          )}

          {/* STEP 2 : Détails (personnes, occasion, remarques) */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Détails de la réservation</h1>
              <p className="mb-6 text-sm" style={{ color: "#888" }}>Combien serez-vous ?</p>
              <div className="flex items-center gap-3 p-4 rounded-2xl mb-8" style={{ background: "rgba(192,57,43,0.05)", border: "1px solid rgba(192,57,43,0.15)" }}>
                <CalendarCheck size={18} style={{ color: "#C0392B" }} />
                <span className="text-sm font-medium" style={{ color: "#C0392B" }}>{formatDate(form.date)} à {form.heure}</span>
              </div>
              <div className="mb-8">
                <label className="block font-semibold mb-4" style={{ color: "#1A1A1A" }}>Nombre de personnes</label>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                    <button key={n} onClick={() => setForm({ ...form, personnes: n })}
                      className="w-14 h-14 rounded-xl font-bold text-base transition-all hover:scale-105"
                      style={form.personnes === n ? { background: "#C0392B", color: "white" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-8">
                <label className="block font-semibold mb-4" style={{ color: "#1A1A1A" }}>Occasion (optionnel)</label>
                <div className="flex flex-wrap gap-3">
                  {["Aucune", "Anniversaire 🎂", "Romantique ❤️", "Affaires 💼", "Famille 👨‍👩‍👧", "Célébration 🥂"].map(occ => (
                    <button key={occ} onClick={() => setForm({ ...form, occasion: occ })}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={form.occasion === occ ? { background: "#1A1A1A", color: "white" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-8">
                <label className="block font-semibold mb-2" style={{ color: "#1A1A1A" }}>Remarques</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Allergies, préférences de table, demandes spéciales..."
                  rows={3} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none border"
                  style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}><ArrowLeft size={16} /> Retour</button>
                <button onClick={() => setStep(3)} className="px-8 py-3.5 rounded-2xl font-semibold text-white transition-all hover:scale-105" style={{ background: "#C0392B" }}>Continuer →</button>
              </div>
            </div>
          )}

          {/* STEP 3 : Menu (précommande ou note) */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Votre menu</h1>
              <p className="mb-6 text-sm" style={{ color: "#888" }}>Pré-commandez vos plats ou laissez une note. (Optionnel)</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold" style={{ color: "#1A1A1A" }}>Choisir des plats</h3>
                    <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B" }}>
                      <ShoppingBag size={14} /> {showMenu ? "Masquer" : "Voir menu"}
                    </button>
                  </div>
                  {showMenu && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {menu.map(item => {
                        const inPrecomm = precomm.find(i => i.id === item.id)
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                            <img src={item.image} alt={item.nom} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate" style={{ color: "#1A1A1A" }}>{item.nom}</div>
                              <div className="text-xs" style={{ color: "#C0392B" }}>{item.prix.toLocaleString()} FCFA</div>
                            </div>
                            {inPrecomm ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => updatePrecomm(item.id, -1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F0E8E0" }}><Minus size={12} style={{ color: "#C0392B" }} /></button>
                                <span className="w-5 text-center font-bold text-sm">{inPrecomm.quantite}</span>
                                <button onClick={() => updatePrecomm(item.id, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><Plus size={12} className="text-white" /></button>
                              </div>
                            ) : (
                              <button onClick={() => addPrecomm(item)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><Plus size={14} className="text-white" /></button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {precomm.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl" style={{ background: "#FFF5EE", border: "1px solid rgba(192,57,43,0.15)" }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C0392B" }}>Pré-commande ({precommCount} plats)</p>
                      {precomm.map(item => (
                        <div key={item.id} className="flex justify-between text-sm mb-1">
                          <span style={{ color: "#555" }}>{item.quantite}x {item.nom}</span>
                          <span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} FCFA</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-2 border-t mt-2" style={{ borderColor: "rgba(192,57,43,0.2)" }}>
                        <span style={{ color: "#1A1A1A" }}>Total estimé</span>
                        <span style={{ color: "#C0392B" }}>{precommTotal.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold mb-4" style={{ color: "#1A1A1A" }}>Ou laissez une note</h3>
                  <textarea value={menuNote} onChange={e => setMenuNote(e.target.value)}
                    placeholder="Ex: Je voudrais le Thiéboudienne avec moins de sel, je suis végétarien..."
                    rows={6} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none border"
                    style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                  <p className="text-xs mt-2" style={{ color: "#AAA" }}>Notre équipe prendra note de vos préférences</p>
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}><ArrowLeft size={16} /> Retour</button>
                <button onClick={() => setStep(4)} className="px-8 py-3.5 rounded-2xl font-semibold text-white transition-all hover:scale-105" style={{ background: "#C0392B" }}>Continuer →</button>
              </div>
            </div>
          )}

          {/* STEP 4 : Coordonnées et validation */}
          {step === 4 && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Vos coordonnées</h1>
              <p className="mb-8 text-sm" style={{ color: "#888" }}>Pour confirmer votre réservation.</p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: CalendarCheck, val: formatDate(form.date), label: "Date" },
                  { icon: Clock, val: form.heure, label: "Heure" },
                  { icon: Users, val: `${form.personnes} pers.`, label: "Personnes" },
                ].map(({ icon: Icon, val, label }) => (
                  <div key={label} className="p-4 rounded-xl text-center" style={{ background: "rgba(192,57,43,0.05)", border: "1px solid rgba(192,57,43,0.15)" }}>
                    <Icon size={18} className="mx-auto mb-1" style={{ color: "#C0392B" }} />
                    <div className="font-bold text-sm" style={{ color: "#1A1A1A" }}>{val}</div>
                    <div className="text-xs" style={{ color: "#999" }}>{label}</div>
                  </div>
                ))}
              </div>
              {precomm.length > 0 && (
                <div className="p-4 rounded-xl mb-6" style={{ background: "#FFF5EE", border: "1px solid rgba(192,57,43,0.15)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#C0392B" }}>Pré-commande incluse</p>
                  <p className="text-sm" style={{ color: "#666" }}>{precomm.map(i => `${i.quantite}x ${i.nom}`).join(", ")}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Nom complet *</label>
                    <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                      placeholder="Mamadou Diallo"
                      className="w-full px-4 py-3.5 rounded-xl text-sm border focus:outline-none"
                      style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Téléphone *</label>
                    <input required value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                      placeholder="+221 77 000 00 00"
                      className="w-full px-4 py-3.5 rounded-xl text-sm border focus:outline-none"
                      style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}><ArrowLeft size={16} /> Retour</button>
                  <button type="submit" disabled={saving}
                    className="px-8 py-3.5 rounded-2xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 flex items-center gap-2"
                    style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)", boxShadow: "0 6px 20px rgba(192,57,43,0.35)" }}>
                    {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>) : "Confirmer la réservation ✓"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUCCÈS – après réservation */}
      {activeTab === "nouvelle" && submitted && (
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(39,174,96,0.1)", border: "2px solid rgba(39,174,96,0.3)" }}>
            <CheckCircle size={36} style={{ color: "#27AE60" }} />
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Demande envoyée ! 🎉</h1>
          <p className="mb-2" style={{ color: "#666" }}>Merci <strong>{form.nom}</strong> ! Votre demande est en cours de traitement.</p>
          <p className="text-sm mb-6" style={{ color: "#AAA" }}>Le restaurant va confirmer votre réservation sous peu.</p>

          <div className="p-5 rounded-2xl mb-8 text-left space-y-3" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold" style={{ color: "#C0392B", fontFamily: "'Georgia', serif" }}>#{submittedId}</div>
              <div className="text-xs" style={{ color: "#999" }}>Numéro de réservation</div>
            </div>
            <div className="p-3 rounded-xl text-sm text-center font-semibold" style={{ background: "rgba(230,126,34,0.08)", color: "#E67E22" }}>⏳ En attente de confirmation du restaurant</div>
            {[
              { icon: CalendarCheck, label: "Date", val: formatDate(form.date) },
              { icon: Clock, label: "Heure", val: form.heure },
              { icon: Users, label: "Personnes", val: `${form.personnes} personne${form.personnes > 1 ? "s" : ""}` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(192,57,43,0.08)" }}><Icon size={15} style={{ color: "#C0392B" }} /></div>
                <div><div className="text-xs uppercase tracking-wider" style={{ color: "#999" }}>{label}</div><div className="font-semibold text-sm" style={{ color: "#1A1A1A" }}>{val}</div></div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button onClick={() => setActiveTab("historique")} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white" style={{ background: "#C0392B" }}><ClipboardList size={18} /> Suivre ma réservation</button>
            <button onClick={() => navigate("/")} className="w-full py-3.5 rounded-2xl font-semibold text-sm border" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Retour à l'accueil</button>
          </div>
        </div>
      )}
    </div>
  )
}