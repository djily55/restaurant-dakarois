// src/pages/Menu/MenuPage.tsx
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "../../firebase"
import { useCart } from "../../context/CartContext"
import { ChefHat, ShoppingBag, ArrowLeft, Search, X, Clock, Fish, Beef, Coffee, Cake, Soup, Pizza, Wine, Utensils, Package } from "lucide-react"

// Filtres statiques (affichage)
const filterCategories = [
  { id: "Tous", nom: "Tout le menu", icon: Utensils, color: "#1A1A1A", bg: "#F5F0EB" },
  { id: "senegalais", nom: "Plats Sénégalais", icon: Fish, color: "#C0392B", bg: "#FFF0EE" },
  { id: "boissons", nom: "Boissons", icon: Wine, color: "#27AE60", bg: "#F0FFF4" },
  { id: "desserts", nom: "Desserts", icon: Cake, color: "#9B59B6", bg: "#F8F0FF" },
  { id: "soupes", nom: "Soupes", icon: Soup, color: "#E67E22", bg: "#FFF8F0" },
  { id: "fataya", nom: "Fataya", icon: Package, color: "#D4A017", bg: "#FFFBF0" },
  { id: "burgers", nom: "Burgers", icon: Pizza, color: "#E74C3C", bg: "#FFF0EE" },
  { id: "gateaux", nom: "Gâteaux", icon: Cake, color: "#D35400", bg: "#FFF5EE" },
  { id: "plats-francais", nom: "Plats Français", icon: Beef, color: "#3498DB", bg: "#F0F8FF" },
  { id: "petit-dejeuner", nom: "Petit-déjeuner", icon: Coffee, color: "#E67E22", bg: "#FFFBF0" },
]

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

export default function MenuPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [search, setSearch] = useState("")
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null)
  const { addToCart, cartCount, cartTotal } = useCart()

  // Chargement des plats disponibles depuis Firestore
  useEffect(() => {
    const q = query(collection(db, "menu"), where("disponible", "==", true))
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
      setMenuItems(items)
    })
    return () => unsub()
  }, [])

  const activeCategorieId = searchParams.get("categorie") || "Tous"
  const activeFilter = filterCategories.find(c => c.id === activeCategorieId) || filterCategories[0]

  const setFilter = (catId: string) => {
    if (catId === "Tous") {
      searchParams.delete("categorie")
      setSearchParams(searchParams)
    } else {
      setSearchParams({ categorie: catId })
    }
    setSearch("")
  }

  const filtered = menuItems.filter(item => {
    const matchCat = activeCategorieId === "Tous" || item.categorie === activeCategorieId
    const matchSearch = item.nom.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const ActiveIcon = activeFilter.icon

  return (
    <div className="min-h-screen" style={{ background: "#FFFAF5" }}>
      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b" style={{ background: "rgba(255,250,245,0.98)", backdropFilter: "blur(12px)", borderColor: "rgba(192,57,43,0.1)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-medium hover:text-red-600" style={{ color: "#666" }}>
              <ArrowLeft size={16} /> Accueil
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#C0392B" }}>
                <ChefHat size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Notre Menu</span>
            </div>
          </div>
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#999" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un plat..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-600"
              style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }}
            />
          </div>
          {cartCount > 0 && (
            <button
              onClick={() => navigate("/commande")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold text-sm hover:opacity-90"
              style={{ background: "#C0392B" }}
            >
              <ShoppingBag size={16} /> {cartCount} · {cartTotal.toLocaleString()} FCFA
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Recherche mobile */}
        <div className="md:hidden mb-6 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#999" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un plat..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-600"
            style={{ background: "white", border: "1px solid #E8E0D8" }}
          />
        </div>

        {/* Filtres catégories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filterCategories.map(cat => {
            const Icon = cat.icon
            const isActive = activeCategorieId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={isActive ? { background: cat.color, color: "white" } : { background: "white", color: "#555", border: "1px solid #E8E0D8" }}
              >
                <Icon size={14} /> {cat.nom}
              </button>
            )
          })}
        </div>

        {/* Bandeau catégorie active */}
        {activeCategorieId !== "Tous" && (
          <div className="flex items-center justify-between mb-8 p-4 rounded-lg" style={{ background: activeFilter.bg, border: `1px solid ${activeFilter.color}15` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: activeFilter.color }}>
                <ActiveIcon size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>{activeFilter.nom}</h2>
                <p className="text-xs" style={{ color: "#888" }}>{filtered.length} plat{filtered.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <button onClick={() => setFilter("Tous")} className="p-1.5 rounded-lg hover:bg-black/5">
              <X size={14} style={{ color: "#999" }} />
            </button>
          </div>
        )}

        {/* Grille des plats */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ border: "2px dashed #E8E0D8" }}>
            <ChefHat size={40} className="mx-auto mb-4" style={{ color: "#DDD" }} />
            <p className="font-semibold mb-4" style={{ color: "#BBB" }}>Aucun plat trouvé</p>
            <button
              onClick={() => { setFilter("Tous"); setSearch("") }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90"
              style={{ background: "#C0392B" }}
            >
              Voir tout le menu
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(dish => (
              <div
                key={dish.id}
                className="rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col"
                style={{ background: "white", border: "1px solid #F0E8E0" }}
                onClick={() => setSelectedDish(dish)}
              >
                <div className="relative h-[280px] overflow-hidden">
                  <img src={dish.image} alt={dish.nom} className="w-full h-full object-cover" />
                  {dish.tag && (
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-semibold" style={{ background: "rgba(0,0,0,0.7)", color: "white" }}>
                      {dish.tag}
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-base mb-1 line-clamp-1" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>{dish.nom}</h3>
                  <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: "#999" }}>
                    <Clock size={10} /> {dish.repas}
                  </div>
                  <p className="text-xs mb-3 leading-relaxed line-clamp-2" style={{ color: "#666", lineHeight: "1.4" }}>{dish.description}</p>
                  <div className="flex items-center justify-between pt-2 mt-auto border-t" style={{ borderColor: "#F0E8E0" }}>
                    <div>
                      <span className="text-lg font-bold" style={{ color: "#C0392B" }}>{dish.prix.toLocaleString()}</span>
                      <span className="text-xs ml-0.5" style={{ color: "#AAA" }}>FCFA</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); addToCart({ id: dish.id, nom: dish.nom, prix: dish.prix, image: dish.image }) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                      style={{ background: "#C0392B" }}
                    >
                      <ShoppingBag size={12} /> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail plat (inchangé) – même code, utiliser addToCart du contexte */}
      {selectedDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedDish(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl bg-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-96">
              <img src={selectedDish.image} alt={selectedDish.nom} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)" }} />
              <button onClick={() => setSelectedDish(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-100">
                <X size={14} style={{ color: "#333" }} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>{selectedDish.nom}</h2>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#999" }}>
                    <Clock size={12} /> {selectedDish.repas}
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: "#C0392B" }}>
                  {selectedDish.prix.toLocaleString()} <span className="text-sm font-normal" style={{ color: "#AAA" }}>FCFA</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#666", lineHeight: "1.6" }}>{selectedDish.description}</p>
              <button
                onClick={() => { addToCart({ id: selectedDish.id, nom: selectedDish.nom, prix: selectedDish.prix, image: selectedDish.image }); setSelectedDish(null) }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}
              >
                <ShoppingBag size={16} /> Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panier flottant */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => navigate("/commande")}
            className="flex items-center gap-3 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #C0392B, #E74C3C)",
              boxShadow: "0 4px 15px rgba(192,57,43,0.3)"
            }}
          >
            <ShoppingBag size={18} />
            <span>Voir mon panier · {cartCount} article{cartCount > 1 ? "s" : ""} · {cartTotal.toLocaleString()} FCFA</span>
          </button>
        </div>
      )}
    </div>
  )
}