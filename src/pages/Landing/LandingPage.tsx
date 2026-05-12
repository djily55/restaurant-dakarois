// src/pages/Landing/LandingPage.tsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useCart } from "../../context/CartContext"  // ← ajout
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "../../firebase"
import {
  ChefHat, Star, MapPin, Phone, Mail, Menu, X,
  ArrowRight, Clock, Award,
  ShoppingBag, CalendarCheck, ShoppingCart, Plus, Minus, Trash2, ClipboardList,
  Fish, Beef, Coffee, Cake, Soup, Pizza, Wine, Utensils, Package,
  LogOut, ChevronDown
} from "lucide-react"

// Interfaces (inchangées)
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

interface Category {
  id: string
  nom: string
  image: string
  color: string
  bg: string
  active: boolean
  description: string
}

const navLinks = [
  { label: "Accueil", id: "accueil" },
  { label: "Menu", id: "menu-section" },
  { label: "À propos", id: "apropos" },
  { label: "Témoignages", id: "temoignages" },
  { label: "Contact", id: "contact" },
]

const testimonials = [
  { nom: "Djily Ndiaye",  role: "client",    avis: "Le meilleur Thiéboudienne de Dakar. Service impeccable, ambiance chaleureuse.", note: 5, avatar: "DN", color: "#C0392B" },
  { nom: "Meissa Fall", role: "Étudiant",  avis: "Service exceptionnel et plats délicieux.",             note: 5, avatar: "MD", color: "#D4A017" },
  { nom: "Moustapha Diakhaté",  role: "Étudiant", avis: "Une découverte incroyable ! Le Yassa était divin.",                            note: 5, avatar: "MD", color: "#2E86AB" },
]

const getIconForCategory = (categoryId: string) => {
  const icons: Record<string, React.ElementType> = {
    senegalais: Fish,
    boissons: Wine,
    desserts: Cake,
    soupes: Soup,
    fataya: Package,
    burgers: Pizza,
    gateaux: Cake,
    "plats-francais": Beef,
    "petit-dejeuner": Coffee,
  }
  return icons[categoryId] || Utensils
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const { cart, updateQty, removeItem, cartCount, cartTotal } = useCart() // ← utilisation du contexte global

  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  // Redirect non-clients to dashboard
  useEffect(() => {
    if (isAuthenticated && user && user.role !== "client") {
      navigate("/dashboard", { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  // Load active categories from Firestore
  useEffect(() => {
    const q = query(collection(db, "categories"), where("active", "==", true))
    const unsub = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))
      setCategories(cats)
    })
    return () => unsub()
  }, [])

  // Load available dishes from Firestore
  useEffect(() => {
    const q = query(collection(db, "menu"), where("disponible", "==", true))
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
      setMenuItems(items)
    })
    return () => unsub()
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMobileOpen(false)
  }

  const goToCategory = (categorieId: string) => {
    navigate(`/menu?categorie=${encodeURIComponent(categorieId)}`)
  }

  const countPlatsByCategory = (categoryId: string) => {
    return menuItems.filter(item => item.categorie === categoryId && item.disponible).length
  }

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: "#FFFAF5", color: "#1A1A1A" }}>
      {/* ========== NAVBAR ========== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(255,250,245,0.97)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(192,57,43,0.1)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo("accueil")}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}>
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-lg leading-none" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Le Dakarois</div>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#C0392B" }}>Restaurant</div>
            </div>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium transition-colors hover:text-red-600" style={{ color: "#555" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => setCartOpen(!cartOpen)} className="relative p-2.5 rounded-xl transition-all hover:scale-105">
              <ShoppingCart size={20} style={{ color: "#C0392B" }} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#C0392B" }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => navigate("/reservation")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:scale-105" style={{ borderColor: "#C0392B", color: "#C0392B" }}>
              <CalendarCheck size={15} /> Réserver
            </button>
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all hover:scale-105" style={{ borderColor: "#E8E0D8", background: "white" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#C0392B" }}>{user.nom?.charAt(0).toUpperCase()}</div>
                  <span className="text-sm font-medium" style={{ color: "#1A1A1A" }}>Bonjour, {user.nom?.split(" ")[0]}</span>
                  <ChevronDown size={14} style={{ color: "#AAA", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-xl overflow-hidden z-50" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "#F0E8E0" }}>
                      <div className="font-semibold text-sm text-gray-800">{user.nom}</div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    </div>
                    <button onClick={() => { navigate("/mes-commandes"); setUserMenuOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-amber-50 transition-colors" style={{ color: "#555" }}>
                      <ShoppingBag size={15} style={{ color: "#C0392B" }} /> Mes commandes
                    </button>
                    <button onClick={() => { navigate("/reservation"); setUserMenuOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-amber-50 transition-colors" style={{ color: "#555" }}>
                      <CalendarCheck size={15} style={{ color: "#C0392B" }} /> Mes réservations
                    </button>
                    <div className="border-t" style={{ borderColor: "#F0E8E0" }}>
                      <button onClick={async () => { await logout(); setUserMenuOpen(false) }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-red-50 transition-colors" style={{ color: "#C0392B" }}>
                        <LogOut size={15} /> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="text-sm font-medium px-4 py-2.5 rounded-xl border transition-all hover:scale-105" style={{ borderColor: "#E8E0D8", color: "#555" }}>
                Connexion
              </button>
            )}
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden px-6 py-4 flex flex-col gap-3 border-t" style={{ background: "#FFFAF5", borderColor: "rgba(192,57,43,0.1)" }}>
            {navLinks.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left py-2 text-sm font-medium" style={{ color: "#555" }}>{label}</button>
            ))}
            <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <button onClick={() => navigate("/reservation")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: "#C0392B", color: "#C0392B" }}>Réserver</button>
              {user ? (
                <button onClick={async () => { await logout(); setMobileOpen(false) }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: "#C0392B" }}>
                  <LogOut size={14} /> Déconnexion
                </button>
              ) : (
                <button onClick={() => navigate("/login")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#C0392B" }}>Connexion</button>
              )}
            </div>
            {user && <div className="pt-2 text-sm font-medium" style={{ color: "#C0392B" }}>Bonjour, {user.nom?.split(" ")[0]} 👋</div>}
          </div>
        )}
      </nav>

      {/* ========== CART DRAWER (utilise le contexte) ========== */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setCartOpen(false)} />
          <div className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl bg-white" style={{ width: "380px" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#F0E8E0" }}>
              <div className="flex items-center gap-3"><ShoppingBag size={20} style={{ color: "#C0392B" }} /><h2 className="font-bold text-lg">Mon panier {cartCount > 0 && <span style={{ color: "#C0392B" }}>({cartCount})</span>}</h2></div>
              <button onClick={() => setCartOpen(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <ShoppingCart size={48} className="mb-4" style={{ color: "#E8E0D8" }} />
                <p className="font-semibold mb-1 text-gray-400">Votre panier est vide</p>
                <button onClick={() => { setCartOpen(false); scrollTo("menu-section") }} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#C0392B" }}>Voir le menu</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50">
                      <img src={item.image} alt={item.nom} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1"><div className="font-semibold text-sm">{item.nom}</div><div className="text-sm font-bold text-red-700">{(item.prix * item.quantite).toLocaleString()} FCFA</div></div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center"><Minus size={12} className="text-red-700" /></button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantite}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-red-700 flex items-center justify-center"><Plus size={12} className="text-white" /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-1"><Trash2 size={13} className="text-gray-400" /></button>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t space-y-3" style={{ borderColor: "#F0E8E0" }}>
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span style={{ color: "#C0392B" }}>{cartTotal.toLocaleString()} FCFA</span></div>
                  <button onClick={() => navigate("/commande")} className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-red-700 to-red-600">Commander maintenant</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ========== HERO SECTION ========== */}
      <section id="accueil" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('images/63a47191df44b-restaurant senegal.jpg')" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(255,250,245,0.97) 45%, rgba(255,250,245,0.5) 70%, rgba(255,250,245,0.1) 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pt-24 pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 bg-red-100 text-red-700">
              <span className="w-2 h-2 rounded-full animate-pulse bg-red-700" /> Ouvert maintenant · 12h – 23h
            </div>
            <h1 className="font-bold leading-tight mb-6 text-5xl md:text-7xl">
              L'Excellence de la<br />
              <span style={{ color: "#C0392B" }}>Cuisine Sénégalaise</span><br />
              à Dakar
            </h1>
            <p className="text-lg mb-8 leading-relaxed text-gray-600 max-w-md">
              Saveurs authentiques, ingrédients frais du marché local. Thiéboudienne, Yassa, Mafé — une invitation au voyage culinaire.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <button onClick={() => scrollTo("menu-section")} className="flex items-center gap-3 px-7 py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-red-700 to-red-600 hover:scale-105 transition-transform">
                <ShoppingBag size={20} /> Commander maintenant
              </button>
              <button onClick={() => navigate("/reservation")} className="flex items-center gap-3 px-7 py-4 rounded-2xl font-semibold border-2 bg-white hover:scale-105 transition-transform" style={{ borderColor: "#C0392B", color: "#C0392B" }}>
                <CalendarCheck size={20} /> Réserver une table
              </button>
            </div>
            <div className="flex flex-wrap gap-8">
              {[
                { val: "4.9★", label: "Note moyenne" },
                { val: "2500+", label: "Clients heureux" },
                { val: `${menuItems.length}+`, label: "Plats au menu" },
                { val: "8 ans", label: "D'excellence" },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-2xl font-bold" style={{ color: "#C0392B", fontFamily: "'Georgia', serif" }}>{val}</div>
                  <div className="text-xs uppercase tracking-widest mt-0.5 text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SERVICE BANNER ========== */}
      <section className="py-8 bg-red-500">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => scrollTo("menu-section")} className="flex items-center gap-4 p-5 rounded-2xl bg-white/15 hover:bg-white/25 transition text-left">
            <ShoppingBag size={22} className="text-white" /><div><div className="text-white font-bold">Commander en ligne</div><div className="text-white/70 text-sm">Commandez vos plats préférés</div></div>
          </button>
          <button onClick={() => navigate("/reservation")} className="flex items-center gap-4 p-5 rounded-2xl bg-white/15 hover:bg-white/25 transition text-left">
            <CalendarCheck size={22} className="text-white" /><div><div className="text-white font-bold">Réserver une table</div><div className="text-white/70 text-sm">Réservez en quelques clics</div></div>
          </button>
          <button onClick={() => navigate("/mes-commandes")} className="flex items-center gap-4 p-5 rounded-2xl bg-white/15 hover:bg-white/25 transition text-left">
            <ClipboardList size={22} className="text-white" /><div><div className="text-white font-bold">Mes commandes</div><div className="text-white/70 text-sm">Suivez vos commandes</div></div>
          </button>
        </div>
      </section>

      {/* ========== DYNAMIC CATEGORIES (from Firestore) ========== */}
      <section id="menu-section" className="py-24 px-6 bg-amber-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-sm font-bold uppercase tracking-widest text-red-700">Notre Carte</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-3" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Notre carte à la maison</h2>
            <p className="text-base max-w-lg mx-auto text-gray-500">Cliquez sur une catégorie pour découvrir et commander vos plats, jus préférés</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(cat => {
              const Icon = getIconForCategory(cat.id)
              const platCount = countPlatsByCategory(cat.id)
              return (
                <button key={cat.id} onClick={() => goToCategory(cat.id)} className="group rounded-2xl overflow-hidden transition-all hover:-translate-y-2 hover:shadow-2xl text-left w-full" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                  <div className="relative h-48 overflow-hidden">
                    <img src={cat.image} alt={cat.nom} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80"} />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="flex items-center gap-2 mb-1"><Icon size={22} className="text-white" /><h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>{cat.nom}</h3></div>
                      <p className="text-white/80 text-xs line-clamp-1">{cat.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-white/60 text-xs">{platCount} plat{platCount > 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1 text-white text-sm font-semibold">Voir les plats <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {categories.length === 0 && <div className="text-center py-20"><p className="text-gray-400">Aucune catégorie disponible pour le moment.</p></div>}
        </div>
      </section>

      {/* ========== ABOUT SECTION ========== */}
      <section id="apropos" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative h-[480px] hidden md:block">
            <img src="images/63a47191df44b-restaurant senegal.jpg" alt="Restaurant" className="absolute top-0 left-0 w-64 h-72 object-cover rounded-3xl shadow-xl" />
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvOHppBYOubmco4f1xo20UeVlSkJGxU7pviw&s" alt="Chef" className="absolute bottom-0 right-0 w-72 h-64 object-cover rounded-3xl shadow-xl" />
            <div className="absolute bottom-24 left-16 rounded-2xl p-5 text-white shadow-2xl bg-gradient-to-r from-red-700 to-red-600">
              <div className="text-3xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>1 ans</div>
              <div className="text-white/80 text-sm">d'excellence culinaire</div>
            </div>
          </div>
          <div>
            <span className="text-sm font-bold uppercase tracking-widest text-red-700">Notre Histoire</span>
            <h2 className="text-4xl font-bold mt-2 mb-6 leading-tight" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Une Passion pour la<br /><span className="text-red-700">Gastronomie Africaine</span></h2>
            <p className="leading-relaxed mb-4 text-gray-600">Fondé en 2025 au cœur de Dakar, Le Dakarois est né d'une passion simple : célébrer la richesse de la cuisine sénégalaise.</p>
            <p className="leading-relaxed mb-8 text-gray-600">De la teranga à l'assiette, nous mettons tout notre cœur dans ce que nous faisons. Chaque plat est une invitation au voyage.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: ChefHat, label: "Chefs certifiés", val: "6" },
                { icon: Clock, label: "Service", val: "12h – 23h" },
                { icon: MapPin, label: "Adresse", val: "Plateau, Dakar" },
                { icon: Award, label: "Récompenses", val: "3 prix" },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100"><Icon size={18} className="text-red-700" /></div>
                  <div><div className="font-bold text-sm text-gray-800">{val}</div><div className="text-xs text-gray-400">{label}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="temoignages" className="py-24 px-6 bg-amber-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12"><span className="text-sm font-bold uppercase tracking-widest text-red-700">Avis clients</span><h2 className="text-4xl font-bold mt-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Ce qu'ils disent de nous</h2></div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ nom, role, avis, note, avatar, color }) => (
              <div key={nom} className="p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg bg-white border border-gray-100">
                <div className="flex gap-1 mb-4">{Array.from({ length: note }).map((_, j) => <Star key={j} size={15} style={{ color: "#D4A017", fill: "#D4A017" }} />)}</div>
                <p className="text-sm leading-relaxed mb-6 italic text-gray-600">"{avis}"</p>
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>{avatar}</div><div><div className="font-bold text-sm text-gray-800">{nom}</div><div className="text-xs text-gray-400">{role}</div></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA RESERVATION ========== */}
      <section className="py-20 px-6 bg-gradient-to-r from-gray-900 to-red-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-r from-red-700 to-red-600"><Utensils size={28} className="text-white" /></div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Georgia', serif" }}>Réservez votre table ce soir</h2>
          <p className="text-lg mb-8 text-white/60">Disponible pour 2 à 10 personnes. Privatisation possible sur demande.</p>
          <button onClick={() => navigate("/reservation")} className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-red-700 to-red-600 mx-auto hover:scale-105 transition-transform"><CalendarCheck size={20} /> Réserver maintenant</button>
        </div>
      </section>

      {/* ========== CONTACT ========== */}
      <section id="contact" className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10"><span className="text-sm font-bold uppercase tracking-widest text-red-700">Nous trouver</span><h2 className="text-3xl font-bold mt-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Contact & Localisation</h2></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: "Adresse", info: "Avenue Léopold Sédar Senghor, Plateau, Dakar" },
              { icon: Phone, title: "Téléphone", info: "+221 78 309 22 12" },
              { icon: Mail, title: "Email", info: "contact@ledakarois.sn" },
            ].map(({ icon: Icon, title, info }) => (
              <div key={title} className="flex items-start gap-4 p-6 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100"><Icon size={20} className="text-red-700" /></div>
                <div><div className="font-bold mb-1 text-gray-800">{title}</div><div className="text-sm text-gray-500">{info}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-8 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-700"><ChefHat size={14} className="text-white" /></div><span className="text-sm text-white/50">Le Dakarois — Restaurant © 2025</span></div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/menu")} className="text-xs text-white/40 hover:text-white transition-colors">Menu</button>
            <button onClick={() => navigate("/reservation")} className="text-xs text-white/40 hover:text-white transition-colors">Réservation</button>
            <button onClick={() => navigate("/mes-commandes")} className="text-xs text-white/40 hover:text-white transition-colors">Mes commandes</button>
            {user ? (
              <button onClick={async () => await logout()} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors flex items-center gap-1.5"><LogOut size={11} /> Déconnexion</button>
            ) : (
              <button onClick={() => navigate("/login")} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors">Connexion</button>
            )}
          </div>
        </div>
      </footer>

      {/* Floating cart button (mobile) */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl bg-red-700 md:hidden">
          <ShoppingCart size={22} className="text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-black">{cartCount}</span>
        </button>
      )}
    </div>
  )
}