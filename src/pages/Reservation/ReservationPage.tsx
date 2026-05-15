// src/pages/Reservation/ReservationPage.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
   ArrowLeft, CalendarCheck, Clock, Users, CheckCircle,
   ShoppingBag, Plus, Minus, ClipboardList, LogIn
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

// Créneaux horaires disponibles
const timeSlots = ["12:00", "12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]
const unavailable = ["12:30", "20:00"]  // créneaux indisponibles

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

  // Non connecté
  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: "#FFFAF5" }}>
        <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(255,250,245,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(192,57,43,0.1)" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-red-50" style={{ color: "#C0392B" }}><ArrowLeft size={16} /> Accueil</button>
            <div className="flex items-center gap-2"><div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><CalendarCheck size={14} className="text-white" /></div><span className="font-bold text-sm sm:text-base" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Réservation</span></div>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-red-50" style={{ color: "#C0392B" }}><ArrowLeft size={16} /> <span className="hidden sm:inline">Accueil</span></button>
            <div className="flex items-center gap-2"><div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><CalendarCheck size={14} className="text-white" /></div><span className="font-bold text-sm sm:text-base" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Réservation</span></div>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F0E8E0" }}>
            <button onClick={() => { setActiveTab("nouvelle"); setSubmitted(false); setStep(1); setForm({ ...form, date: "", heure: "" }); setPrecomm([]); setMenuNote("") }} className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all" style={activeTab === "nouvelle" ? { background: "white", color: "#C0392B" } : { color: "#888" }}>Nouvelle</button>
            <button onClick={() => setActiveTab("historique")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all" style={activeTab === "historique" ? { background: "white", color: "#C0392B" } : { color: "#888" }}><ClipboardList size={14} /> <span className="hidden sm:inline">Mes réservations</span><span className="sm:hidden">{reservations.length}</span></button>
          </div>
        </div>
      </div>

      {/* HISTORIQUE DES RÉSERVATIONS */}
      {activeTab === "historique" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Mes réservations</h2>
          {loadingRes ? (
            <div className="text-center py-12"><div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto" /></div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
              <CalendarCheck size={40} className="mx-auto mb-4" style={{ color: "#DDD" }} />
              <p className="font-semibold mb-2" style={{ color: "#BBB" }}>Aucune réservation</p>
              <button onClick={() => setActiveTab("nouvelle")} className="px-6 py-3 rounded-xl font-semibold text-white" style={{ background: "#C0392B" }}>Réserver une table</button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {reservations.map(res => {
                const cfg = statusCfg[res.statut] || statusCfg["En attente"]
                return (
                  <div key={res.id} className="rounded-xl sm:rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5" style={{ background: "white", border: `1px solid ${cfg.border}` }}>
                    <div className="flex items-center justify-between px-4 py-2 sm:px-5 sm:py-3 border-b" style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-xs sm:text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                        {res.statut === "En attente" && <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(230,126,34,0.15)", color: "#E67E22" }}>Attente</span>}
                        {res.statut === "Confirmée" && <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(39,174,96,0.15)", color: "#27AE60" }}>Confirmée</span>}
                      </div>
                      <span className="text-[10px] sm:text-xs" style={{ color: "#AAA" }}>#{res.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="p-3 sm:p-5">
                      <div className="font-bold text-base sm:text-lg" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{res.nom}</div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm" style={{ color: "#888" }}>
                        <span className="flex items-center gap-1"><CalendarCheck size={12} /> {formatDate(res.date)}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {res.heure}</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {res.personnes} pers.</span>
                      </div>
                      {res.occasion && res.occasion !== "Aucune" && <div className="text-xs mt-1" style={{ color: "#C0392B" }}>{res.occasion}</div>}
                      {res.precomm && res.precomm.length > 0 && (
                        <div className="mt-2 p-2 rounded-xl" style={{ background: "#FFF5EE" }}>
                          <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#C0392B" }}>Pré-commande ({res.precomm.length})</p>
                          <div className="text-xs space-y-0.5">{res.precomm.map((item, i) => <div key={i} className="flex justify-between"><span>{item.quantite}x {item.nom}</span><span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} F</span></div>)}</div>
                        </div>
                      )}
                      {res.menuNote && <div className="mt-2 text-xs p-2 rounded-xl" style={{ background: "#F8F8F8", color: "#666" }}><span className="font-semibold">Note : </span>{res.menuNote}</div>}
                      <div className="mt-2 text-[10px]" style={{ color: "#BBB" }}>Réservé le {formatDateShort(res.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* NOUVELLE RÉSERVATION – avec input date compact (alternative au grand calendrier) */}
      {activeTab === "nouvelle" && !submitted && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Steps */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1 sm:gap-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-[#C0392B] text-white" : "bg-[#F0E8E0] text-[#AAA]"}`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 4 && <div className={`w-6 sm:w-10 h-0.5 ${step > s ? "bg-[#C0392B]" : "bg-[#E8E0D8]"}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 sm:gap-6 mb-6 text-xs">
            {["Date", "Détails", "Menu", "Coords"].map((label, i) => (
              <span key={label} style={{ color: step === i + 1 ? "#C0392B" : "#AAA", fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
            ))}
          </div>

          {/* STEP 1 – Date & Heure avec input date natif (compact et pro) */}
          {step === 1 && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Choisissez votre date</h1>
              <p className="mb-5 text-sm" style={{ color: "#888" }}>Sélectionnez une date et un créneau horaire.</p>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input date natif – compact */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#1A1A1A" }}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setForm({ ...form, date: e.target.value, heure: "" })}
                    className="w-full px-3 py-2 rounded-xl border text-sm"
                    style={{ border: "1px solid #E8E0D8" }}
                  />
                </div>
                {/* Créneaux horaires */}
                <div>
                  {form.date ? (
                    <>
                      <label className="block text-sm font-medium mb-1" style={{ color: "#1A1A1A" }}>Heure</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeSlots.map(slot => {
                          const isUnavail = unavailable.includes(slot)
                          const isSelected = form.heure === slot
                          return (
                            <button
                              key={slot}
                              disabled={isUnavail}
                              onClick={() => setForm({ ...form, heure: slot })}
                              className={`py-2 rounded-xl text-xs font-semibold transition-all ${isSelected ? "bg-[#C0392B] text-white" : isUnavail ? "bg-gray-100 text-[#CCC] cursor-not-allowed line-through" : "bg-white text-[#555] border"}`}
                              style={{ border: "1px solid #E8E0D8" }}
                            >
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed h-full min-h-[100px]" style={{ borderColor: "#E8E0D8" }}>
                      <div className="text-center p-3"><CalendarCheck size={24} className="mx-auto mb-1" style={{ color: "#DDD" }} /><p className="text-xs" style={{ color: "#BBB" }}>Choisissez d'abord une date</p></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button disabled={!form.date || !form.heure} onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-40 text-sm" style={{ background: "#C0392B" }}>Continuer →</button>
              </div>
            </div>
          )}

          {/* STEP 2 – Détails (personnes, occasion, remarques) */}
          {step === 2 && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Détails de la réservation</h1>
              <p className="mb-5 text-sm" style={{ color: "#888" }}>Combien serez-vous ?</p>
              <div className="flex items-center gap-2 p-2 rounded-xl mb-5" style={{ background: "rgba(192,57,43,0.05)", border: "1px solid rgba(192,57,43,0.15)" }}>
                <CalendarCheck size={14} style={{ color: "#C0392B" }} />
                <span className="text-xs font-medium" style={{ color: "#C0392B" }}>{formatDate(form.date)} à {form.heure}</span>
              </div>
              <div className="mb-5">
                <label className="block font-semibold mb-2 text-sm" style={{ color: "#1A1A1A" }}>Nombre de personnes</label>
                <div className="flex flex-wrap gap-2">
                  {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                    <button key={n} onClick={() => setForm({ ...form, personnes: n })}
                      className="w-10 h-10 rounded-xl font-bold text-sm transition-all hover:scale-105"
                      style={form.personnes === n ? { background: "#C0392B", color: "white" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-5">
                <label className="block font-semibold mb-2 text-sm" style={{ color: "#1A1A1A" }}>Occasion</label>
                <div className="flex flex-wrap gap-2">
                  {["Aucune","Anniversaire 🎂","Romantique ❤️","Affaires 💼","Famille 👨‍👩‍👧","Célébration 🥂"].map(occ => (
                    <button key={occ} onClick={() => setForm({ ...form, occasion: occ })}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={form.occasion === occ ? { background: "#1A1A1A", color: "white" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-5">
                <label className="block font-semibold mb-2 text-sm" style={{ color: "#1A1A1A" }}>Remarques</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 rounded-xl text-sm border resize-none" style={{ border: "1px solid #E8E0D8" }} />
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}><ArrowLeft size={14} /> Retour</button>
                <button onClick={() => setStep(3)} className="px-5 py-2 rounded-xl font-semibold text-white transition-all hover:scale-105 text-sm" style={{ background: "#C0392B" }}>Continuer →</button>
              </div>
            </div>
          )}

          {/* STEP 3 – Menu (précommande ou note) – compact */}
          {step === 3 && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Votre menu</h1>
              <p className="mb-5 text-sm" style={{ color: "#888" }}>Pré-commandez vos plats ou laissez une note. (Optionnel)</p>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Choisir des plats</h3>
                    <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B" }}>
                      <ShoppingBag size={12} /> {showMenu ? "Masquer" : "Voir menu"}
                    </button>
                  </div>
                  {showMenu && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {menu.map(item => {
                        const inPrecomm = precomm.find(i => i.id === item.id)
                        return (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl border" style={{ border: "1px solid #F0E8E0" }}>
                            <img src={item.image} alt={item.nom} className="w-9 h-9 rounded-lg object-cover" />
                            <div className="flex-1">
                              <div className="font-medium text-xs truncate">{item.nom}</div>
                              <div className="text-[10px]" style={{ color: "#C0392B" }}>{item.prix.toLocaleString()} FCFA</div>
                            </div>
                            {inPrecomm ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => updatePrecomm(item.id, -1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={10} style={{ color: "#C0392B" }} /></button>
                                <span className="w-5 text-center text-xs font-bold">{inPrecomm.quantite}</span>
                                <button onClick={() => updatePrecomm(item.id, 1)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><Plus size={10} className="text-white" /></button>
                              </div>
                            ) : (
                              <button onClick={() => addPrecomm(item)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}><Plus size={12} className="text-white" /></button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {precomm.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl" style={{ background: "#FFF5EE" }}>
                      <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#C0392B" }}>Pré-commande ({precommCount})</p>
                      {precomm.map(item => (
                        <div key={item.id} className="flex justify-between text-xs mb-1"><span>{item.quantite}x {item.nom}</span><span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} F</span></div>
                      ))}
                      <div className="flex justify-between font-bold pt-1 border-t text-xs"><span>Total estimé</span><span style={{ color: "#C0392B" }}>{precommTotal.toLocaleString()} F</span></div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-2">Ou laissez une note</h3>
                  <textarea value={menuNote} onChange={e => setMenuNote(e.target.value)}
                    rows={4} className="w-full px-3 py-2 rounded-xl text-sm border resize-none" style={{ border: "1px solid #E8E0D8" }} />
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}><ArrowLeft size={14} /> Retour</button>
                <button onClick={() => setStep(4)} className="px-5 py-2 rounded-xl font-semibold text-white transition-all hover:scale-105 text-sm" style={{ background: "#C0392B" }}>Continuer →</button>
              </div>
            </div>
          )}

          {/* STEP 4 – Coordonnées et validation – compact */}
          {step === 4 && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Vos coordonnées</h1>
              <p className="mb-5 text-sm" style={{ color: "#888" }}>Pour confirmer votre réservation.</p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: CalendarCheck, val: formatDate(form.date), label: "Date" },
                  { icon: Clock, val: form.heure, label: "Heure" },
                  { icon: Users, val: `${form.personnes} pers.`, label: "Personnes" },
                ].map(({ icon: Icon, val, label }) => (
                  <div key={label} className="p-2 rounded-xl text-center" style={{ background: "rgba(192,57,43,0.05)", border: "1px solid rgba(192,57,43,0.15)" }}>
                    <Icon size={14} className="mx-auto mb-1" style={{ color: "#C0392B" }} />
                    <div className="font-bold text-xs">{val}</div>
                    <div className="text-[10px]" style={{ color: "#999" }}>{label}</div>
                  </div>
                ))}
              </div>
              {precomm.length > 0 && (
                <div className="p-3 rounded-xl mb-5" style={{ background: "#FFF5EE", border: "1px solid rgba(192,57,43,0.15)" }}>
                  <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#C0392B" }}>Pré-commande incluse</p>
                  <p className="text-xs">{precomm.map(i => `${i.quantite}x ${i.nom}`).join(", ")}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#555" }}>Nom complet *</label>
                    <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#555" }}>Téléphone *</label>
                    <input required value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#555" }}>Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} />
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(3)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}><ArrowLeft size={14} /> Retour</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 flex items-center gap-2 text-sm"
                    style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}>
                    {saving ? (<><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>) : "Confirmer"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUCCÈS – après réservation */}
      {activeTab === "nouvelle" && submitted && (
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(39,174,96,0.1)", border: "2px solid rgba(39,174,96,0.3)" }}>
            <CheckCircle size={32} style={{ color: "#27AE60" }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Demande envoyée ! 🎉</h1>
          <p className="mb-2 text-sm" style={{ color: "#666" }}>Merci <strong>{form.nom}</strong> !</p>
          <p className="text-xs mb-4" style={{ color: "#AAA" }}>Le restaurant va confirmer sous peu.</p>

          <div className="p-4 rounded-2xl mb-6 text-left space-y-2" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="text-center mb-2">
              <div className="text-xl font-bold" style={{ color: "#C0392B" }}>#{submittedId}</div>
              <div className="text-[10px]" style={{ color: "#999" }}>Numéro de réservation</div>
            </div>
            <div className="p-2 rounded-xl text-xs text-center font-semibold" style={{ background: "rgba(230,126,34,0.08)", color: "#E67E22" }}>⏳ En attente de confirmation</div>
            {[
              { icon: CalendarCheck, label: "Date", val: formatDate(form.date) },
              { icon: Clock, label: "Heure", val: form.heure },
              { icon: Users, label: "Personnes", val: `${form.personnes} personne${form.personnes > 1 ? "s" : ""}` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(192,57,43,0.08)" }}><Icon size={12} style={{ color: "#C0392B" }} /></div>
                <div><div className="text-[10px] uppercase" style={{ color: "#999" }}>{label}</div><div className="font-semibold text-sm">{val}</div></div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button onClick={() => setActiveTab("historique")} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: "#C0392B" }}><ClipboardList size={16} /> Suivre ma réservation</button>
            <button onClick={() => navigate("/")} className="w-full py-2.5 rounded-xl font-semibold text-sm border" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Retour à l'accueil</button>
          </div>
        </div>
      )}
    </div>
  )
}