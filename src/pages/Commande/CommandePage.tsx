// src/pages/Commande/CommandePage.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../../firebase"
import { useAuth } from "../../context/AuthContext"
import { useCart } from "../../context/CartContext"
import {
  ChefHat, ArrowLeft, ShoppingBag, Plus, Minus, Trash2, CheckCircle, MapPin, Clock, LogIn
} from "lucide-react"

interface MenuItem {
  id: string
  nom: string
  description: string
  prix: number
  categorie: string
  repas: string
  image: string
  disponible: boolean
  commandes: number
  tag?: string
}

export default function CommandePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cart, updateQty, removeItem, clearCart, cartCount: globalCartCount, cartTotal: globalCartTotal } = useCart()

  const [menu, setMenu] = useState<MenuItem[]>([])
  const [livraison, setLivraison] = useState<"livraison" | "emporter" | "table">("livraison")
  const [adresse, setAdresse] = useState("")
  const [table, setTable] = useState("")
  const [nom, setNom] = useState(user?.nom || "")
  const [telephone, setTelephone] = useState(user?.telephone || "")
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [loading, setLoading] = useState(false)

  // Chargement des plats disponibles
  useEffect(() => {
    const q = query(collection(db, "menu"), where("disponible", "==", true))
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
      setMenu(items)
    })
    return () => unsub()
  }, [])

  // Si l'utilisateur n'est pas connecté
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFAF5" }}>
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF0EE" }}>
            <ShoppingBag size={28} style={{ color: "#C0392B" }} />
          </div>
          <h2 className="font-bold text-xl mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
            Connectez-vous pour passer commande
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Vous pourrez suivre vos commandes et les retrouver même après déconnexion.
          </p>
          <button
            onClick={() => navigate("/login", { state: { from: "/commande" } })}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold mx-auto"
            style={{ background: "#C0392B" }}
          >
            <LogIn size={16} /> Se connecter
          </button>
        </div>
      </div>
    )
  }

  const subtotal = globalCartTotal
  const fraisLivraison = livraison === "livraison" ? 500 : 0
  const total = subtotal + fraisLivraison
  const cartCount = globalCartCount

  // Ajout au panier (depuis la page commande)
  const addToCart = (dish: MenuItem) => {
    
  }

  // Validation de la commande
  const handleCommander = async () => {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const orderData = {
        client: nom || user.nom,
        telephone: telephone || user.telephone || "—",
        email: user.email,
        adresse: livraison === "livraison" ? adresse : "—",
        table: livraison === "table" ? `Table ${table}` : livraison === "emporter" ? "À emporter" : "Livraison",
        type: livraison,
        items: cart.map(i => ({ nom: i.nom, quantite: i.quantite, prix: i.prix, id: i.id })),
        total,
        statut: "En attente",
        createdAt: serverTimestamp(),
        userId: user.id,
      }
      const docRef = await addDoc(collection(db, "orders"), orderData)
      setOrderId(docRef.id.slice(-6).toUpperCase())
      clearCart() // vide le panier global
      setSubmitted(true)
    } catch (err) {
      console.error("Erreur lors de la commande:", err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#FFFAF5" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(39,174,96,0.1)", border: "2px solid rgba(39,174,96,0.3)" }}>
            <CheckCircle size={42} style={{ color: "#27AE60" }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
            Commande envoyée ! 🎉
          </h1>
          <p className="mb-6" style={{ color: "#666" }}>
            Votre commande est visible par le restaurant en temps réel.
          </p>
          <div className="p-6 rounded-2xl mb-6 text-left" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="text-3xl font-bold text-center mb-1" style={{ color: "#C0392B", fontFamily: "'Georgia', serif" }}>
              #{orderId}
            </div>
            <div className="text-sm text-center mb-4" style={{ color: "#999" }}>Numéro de commande</div>
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantite}x {item.nom}</span>
                  <span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} FCFA</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: "#F0E8E0" }}>
                <span>Total</span>
                <span style={{ color: "#C0392B" }}>{total.toLocaleString()} FCFA</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm p-3 rounded-xl" style={{ background: "#FFF5EE", color: "#C0392B" }}>
              <Clock size={14} /> Temps estimé : {livraison === "livraison" ? "30-45 min" : "15-20 min"}
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => navigate("/mes-commandes")} className="w-full py-4 rounded-2xl font-semibold text-white" style={{ background: "#C0392B" }}>
              Suivre ma commande
            </button>
            <button onClick={() => navigate("/")} className="w-full py-3.5 rounded-2xl font-semibold text-sm border" style={{ color: "#888", border: "2px solid #E8E0D8" }}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Formulaire normal de commande
  return (
    <div className="min-h-screen" style={{ background: "#FFFAF5" }}>
      <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(255,250,245,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(192,57,43,0.1)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-50" style={{ color: "#C0392B" }}>
              <ArrowLeft size={16} /> Accueil
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg" style={{ background: "#C0392B" }}>
                <ShoppingBag size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Ma commande</span>
            </div>
          </div>
          {cartCount > 0 && <span className="text-sm font-semibold" style={{ color: "#C0392B" }}>{cartCount} article{cartCount > 1 ? "s" : ""}</span>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* Colonne gauche : informations client et mode de réception */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>Vos informations</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Nom complet</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" className="w-full px-4 py-3 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Téléphone</label>
                <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+221 77 000 00 00" className="w-full px-4 py-3 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>Mode de réception</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { val: "livraison" as const, label: "Livraison", icon: MapPin, desc: "+500 FCFA" },
                { val: "emporter" as const, label: "À emporter", icon: ShoppingBag, desc: "Gratuit" },
                { val: "table" as const, label: "Sur place", icon: ChefHat, desc: "N° table" },
              ].map(({ val, label, icon: Icon, desc }) => (
                <button key={val} onClick={() => setLivraison(val)} className="p-4 rounded-2xl text-center transition-all hover:scale-105 border-2" style={livraison === val ? { borderColor: "#C0392B", background: "rgba(192,57,43,0.05)" } : { borderColor: "#E8E0D8", background: "white" }}>
                  <Icon size={20} className="mx-auto mb-2" style={{ color: livraison === val ? "#C0392B" : "#AAA" }} />
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#AAA" }}>{desc}</div>
                </button>
              ))}
            </div>
            {livraison === "livraison" && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Adresse de livraison *</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
                  <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Votre adresse complète" className="w-full pl-9 pr-4 py-3.5 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                </div>
              </div>
            )}
            {livraison === "table" && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#555" }}>Numéro de table *</label>
                <input value={table} onChange={e => setTable(e.target.value)} placeholder="Ex: 5" className="w-40 px-4 py-3 rounded-xl text-sm border text-center" style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
              </div>
            )}
          </div>

          {/* Section "Ajouter des plats" – facultative, mais si vous voulez permettre au client d'ajouter encore des plats depuis cette page, vous gardez cette section. 
          Mais attention : cela nécessite d'utiliser la fonction addToCart du contexte. Vous devez donc l'exporter dans CartContext. Je ne la répète pas ici. */}
        </div>

        {/* Panier */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl overflow-hidden border" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <div className="p-5 border-b" style={{ borderColor: "#F0E8E0" }}>
              <h2 className="font-bold text-lg">Panier {cartCount > 0 && <span style={{ color: "#C0392B" }}>({cartCount})</span>}</h2>
            </div>
            {cart.length === 0 ? (
              <div className="p-8 text-center"><ShoppingBag size={32} className="mx-auto mb-3" style={{ color: "#DDD" }} /><p className="text-sm" style={{ color: "#BBB" }}>Panier vide</p></div>
            ) : (
              <>
                <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={item.image} alt={item.nom} className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{item.nom}</div>
                        <div className="text-xs" style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} FCFA</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center"><Minus size={11} style={{ color: "#C0392B" }} /></button>
                        <span className="w-5 text-center text-sm font-bold">{item.quantite}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-red-700 flex items-center justify-center"><Plus size={11} className="text-white" /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)}><Trash2 size={12} style={{ color: "#CCC" }} /></button>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t space-y-2" style={{ borderColor: "#F0E8E0" }}>
                  <div className="flex justify-between text-sm"><span>Sous-total</span><span>{subtotal.toLocaleString()} FCFA</span></div>
                  {livraison === "livraison" && <div className="flex justify-between text-sm"><span>Livraison</span><span>500 FCFA</span></div>}
                  <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span style={{ color: "#C0392B" }}>{total.toLocaleString()} FCFA</span></div>
                </div>
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 text-xs mb-4 p-3 rounded-xl bg-amber-50 text-amber-700"><Clock size={13} /> {livraison === "livraison" ? "30-45 min" : "15-20 min"}</div>
                  <button onClick={handleCommander} disabled={loading || cart.length === 0 || (livraison === "livraison" && !adresse) || (livraison === "table" && !table)} className="w-full py-4 rounded-2xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-40" style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}>
                    {loading ? "Envoi..." : "Confirmer la commande 🔥"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}