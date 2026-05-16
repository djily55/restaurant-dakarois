// src/pages/Dashboard/Menu.tsx
import { useState, useEffect } from "react"
import { Plus, Search, Edit2, Trash2, X, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../firebase"

type Repas = "Petit-déjeuner" | "Déjeuner" | "Dîner" | "Dessert" | "Boissons"

interface Category {
  id: string
  nom: string
  image: string
  active: boolean
  description: string
}

interface MenuItem {
  id: string
  nom: string
  description: string
  prix: number
  categorie: string
  repas: Repas
  image: string
  disponible: boolean
  commandes: number
  tag?: string
}

interface OrderItem {
  nom: string
  quantite: number
  prix: number
}

interface Order {
  items: OrderItem[]
}

const generateSlug = (nom: string) => {
  return nom
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

const getCategoryColor = (categoryId: string) => {
  const colors: Record<string, string> = {
    senegalais: "#C0392B", boissons: "#27AE60", desserts: "#9B59B6", soupes: "#E67E22",
    fataya: "#D4A017", burgers: "#E74C3C", gateaux: "#D35400", "plats-francais": "#3498DB", "petit-dejeuner": "#E67E22"
  }
  return colors[categoryId] || "#C0392B"
}

const repasOptions: Repas[] = ["Petit-déjeuner", "Déjeuner", "Dîner", "Dessert", "Boissons"]

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<"categories" | "dishes">("categories")
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [filter, setFilter] = useState<string>("Tous")
  const [search, setSearch] = useState("")

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({ id: "", nom: "", image: "", active: true, description: "" })

  const [showDishModal, setShowDishModal] = useState(false)
  const [editDish, setEditDish] = useState<MenuItem | null>(null)
  const [dishForm, setDishForm] = useState({
    nom: "", description: "", prix: "", categorie: "", repas: "Déjeuner" as Repas,
    image: "", disponible: true, tag: ""
  })

  const [saved, setSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const unsubCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))
      setCategories(cats)
    })
    const unsubMenu = onSnapshot(collection(db, "menu"), (snapshot) => {
      const menu = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
      setItems(menu)
      setLoading(false)
    })
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Order)
      setOrders(data)
    })
    return () => {
      unsubCats()
      unsubMenu()
      unsubOrders()
    }
  }, [])

  const getRealCommandCount = (nomPlat: string) => {
    return orders.reduce((total, order) => {
      const found = order.items?.find(i => i.nom === nomPlat)
      return total + (found ? found.quantite : 0)
    }, 0)
  }

  const hasDishesInCategory = (categoryId: string) => items.some(item => item.categorie === categoryId)

  const openAddCategory = () => {
    setEditCategory(null)
    setCategoryForm({ id: "", nom: "", image: "", active: true, description: "" })
    setShowCategoryModal(true)
  }
  const openEditCategory = (cat: Category) => {
    setEditCategory(cat)
    setCategoryForm(cat)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.id || !categoryForm.nom) return
    if (editCategory) {
      const oldId = editCategory.id
      const newId = categoryForm.id
      await updateDoc(doc(db, "categories", editCategory.id), {
        id: newId,
        nom: categoryForm.nom,
        image: categoryForm.image,
        active: categoryForm.active,
        description: categoryForm.description,
      })
      if (oldId !== newId) {
        for (const item of items.filter(i => i.categorie === oldId)) {
          await updateDoc(doc(db, "menu", item.id), { categorie: newId })
        }
      }
    } else {
      if (categories.some(c => c.id === categoryForm.id)) {
        alert("Cet ID existe déjà")
        return
      }
      await setDoc(doc(db, "categories", categoryForm.id), {
        id: categoryForm.id,
        nom: categoryForm.nom,
        image: categoryForm.image,
        active: categoryForm.active,
        description: categoryForm.description,
      })
    }
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setShowCategoryModal(false)
    }, 1200)
  }

  const toggleCategoryActive = async (id: string, currentActive: boolean) => {
    await updateDoc(doc(db, "categories", id), { active: !currentActive })
  }

  const handleDeleteCategory = async (id: string) => {
    if (hasDishesInCategory(id)) {
      alert(`Impossible de supprimer "${id}" (${items.filter(i => i.categorie === id).length} plat(s))`)
      return
    }
    await deleteDoc(doc(db, "categories", id))
    setDeleteCategoryId(null)
  }

  const openAddDish = (categoryId?: string) => {
    setEditDish(null)
    setDishForm({
      nom: "", description: "", prix: "", categorie: categoryId || (categories.find(c => c.active)?.id || ""),
      repas: "Déjeuner", image: "", disponible: true, tag: ""
    })
    setShowDishModal(true)
  }

  const openEditDish = (item: MenuItem) => {
    setEditDish(item)
    setDishForm({
      nom: item.nom,
      description: item.description,
      prix: item.prix.toString(),
      categorie: item.categorie,
      repas: item.repas,
      image: item.image,
      disponible: item.disponible,
      tag: item.tag || ""
    })
    setShowDishModal(true)
  }

  const handleSaveDish = async () => {
    if (isSaving) return
    if (!dishForm.nom || !dishForm.prix || !dishForm.categorie) return

    setIsSaving(true)
    try {
      const tagValue = dishForm.tag.trim() === "" ? undefined : dishForm.tag
      const prixInt = parseInt(dishForm.prix)
      if (isNaN(prixInt)) throw new Error("Prix invalide")

      const slug = generateSlug(dishForm.nom)
      const baseId = `${dishForm.categorie}_${slug}`
      let finalId = baseId

      if (!editDish) {
        const existing = items.find(i => i.id === baseId)
        if (existing) {
          alert("Un plat avec ce nom existe déjà dans cette catégorie. Modifiez le nom.")
          setIsSaving(false)
          return
        }
      } else {
        finalId = editDish.id
      }

      const data: Omit<MenuItem, "id"> = {
        nom: dishForm.nom,
        description: dishForm.description,
        prix: prixInt,
        categorie: dishForm.categorie,
        repas: dishForm.repas,
        image: dishForm.image,
        disponible: dishForm.disponible,
        commandes: editDish ? editDish.commandes : 0,
        tag: tagValue
      }

      if (editDish) {
        await updateDoc(doc(db, "menu", editDish.id), data)
      } else {
        await setDoc(doc(db, "menu", finalId), data)
      }

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setShowDishModal(false)
      }, 1200)
    } catch (err) {
      console.error("Erreur sauvegarde plat:", err)
      alert("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDish = async (id: string) => {
    await deleteDoc(doc(db, "menu", id))
    setDeleteId(null)
  }

  const toggleDispo = async (id: string, currentDispo: boolean) => {
    await updateDoc(doc(db, "menu", id), { disponible: !currentDispo })
  }

  const backToCategories = () => {
    setSelectedCategory(null)
    setView("categories")
    setFilter("Tous")
  }

  const getDisplayedDishes = () => {
    let filtered = items
    if (selectedCategory) filtered = filtered.filter(d => d.categorie === selectedCategory.id)
    else if (filter !== "Tous") filtered = filtered.filter(d => d.categorie === filter)
    if (search) filtered = filtered.filter(d => d.nom.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase()))
    return filtered
  }

  const displayedDishes = getDisplayedDishes()
  const totalPlats = items.length
  const disponibles = items.filter(i => i.disponible).length
  const activeCategories = categories.filter(c => c.active)

  const getItemTypeName = (categoryId: string) => {
    const types: Record<string, string> = {
      boissons: "boisson", desserts: "dessert", soupes: "soupe", fataya: "fataya",
      burgers: "burger", gateaux: "gâteau", "petit-dejeuner": "petit-déjeuner"
    }
    return types[categoryId] || "plat"
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {view === "dishes" && (
              <button onClick={backToCategories} className="flex items-center gap-1 text-xs sm:text-sm hover:text-red-600" style={{ color: "#888" }}>
                <ArrowLeft size={14} /> Retour
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
              {selectedCategory ? `Menu - ${selectedCategory.nom}` : view === "categories" ? "Gestion des Catégories" : "Gestion des Plats"}
            </h1>
          </div>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "#999" }}>
            {view === "categories"
              ? `${categories.length} catégories · ${activeCategories.length} actives`
              : `${totalPlats} plats · ${disponibles} disponibles`}
          </p>
        </div>
        <div className="flex gap-2">
          {view === "categories" ? (
            <button onClick={openAddCategory} className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-3 rounded-xl text-white font-semibold text-xs sm:text-sm transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)", boxShadow: "0 4px 15px rgba(192,57,43,0.3)" }}>
              <Plus size={16} /> Nouvelle catégorie
            </button>
          ) : (
            !selectedCategory && (
              <button onClick={() => openAddDish()} className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-3 rounded-xl text-white font-semibold text-xs sm:text-sm transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #27AE60, #2ECC71)", boxShadow: "0 4px 15px rgba(39,174,96,0.3)" }}>
                <Plus size={16} /> Nouveau plat
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">Chargement des données...</div>
      ) : (
        <>
          {/* Vue Catégories */}
          {view === "categories" && (
            <>
              <div className="relative max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une catégorie..." className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl text-sm border focus:outline-none" style={{ background: "white", border: "1px solid #E8E0D8" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {categories.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())).map(cat => {
                  const dishCount = items.filter(i => i.categorie === cat.id).length
                  const catColor = getCategoryColor(cat.id)
                  return (
                    <div key={cat.id} className="rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl" style={{ background: "white", border: "1px solid #F0E8E0", opacity: cat.active ? 1 : 0.6 }}>
                      <div className="relative h-32 sm:h-48 overflow-hidden">
                        <img src={cat.image} alt={cat.nom} className="w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                          <h3 className="text-base sm:text-xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>{cat.nom}</h3>
                          <p className="text-white/80 text-[10px] sm:text-xs line-clamp-1">{cat.description}</p>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button onClick={() => openEditCategory(cat)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}><Edit2 size={12} style={{ color: "#555" }} /></button>
                          <button onClick={() => setDeleteCategoryId(cat.id)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}><Trash2 size={12} style={{ color: "#E74C3C" }} /></button>
                        </div>
                      </div>
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold px-2 py-1 rounded-lg" style={{ background: catColor, color: "white" }}>{dishCount} {getItemTypeName(cat.id)}{dishCount > 1 ? "s" : ""}</span>
                          <div className="flex gap-2">
                            <button onClick={() => toggleCategoryActive(cat.id, cat.active)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold" style={cat.active ? { background: "#E8F5E9", color: "#27AE60" } : { background: "#FFEBEE", color: "#E74C3C" }}>
                              {cat.active ? <Eye size={10} /> : <EyeOff size={10} />}{cat.active ? "Active" : "Inactive"}
                            </button>
                            <button onClick={() => { setSelectedCategory(cat); setView("dishes"); setSearch("") }} className="px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold" style={{ background: "#F0E8E0", color: "#555" }}>Voir</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {categories.filter(c => c.nom.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #E8E0D8" }}>
                  <Plus size={32} className="mx-auto mb-3" style={{ color: "#DDD" }} />
                  <p className="font-semibold mb-3" style={{ color: "#BBB" }}>Aucune catégorie trouvée</p>
                  <button onClick={openAddCategory} className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: "#C0392B" }}>Créer une catégorie</button>
                </div>
              )}
            </>
          )}

          {/* Vue Plats (tous) */}
          {view === "dishes" && !selectedCategory && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un plat..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border" style={{ background: "white", border: "1px solid #E8E0D8" }} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setFilter("Tous")} className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold" style={filter === "Tous" ? { background: "#C0392B", color: "white" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>Tous</button>
                  {activeCategories.map(cat => (
                    <button key={cat.id} onClick={() => setFilter(cat.id)} className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold" style={filter === cat.id ? { background: getCategoryColor(cat.id), color: "white" } : { background: "white", color: "#555", border: "2px solid #E8E0D8" }}>{cat.nom}</button>
                  ))}
                </div>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: "#999" }}>{displayedDishes.length} plat{displayedDishes.length > 1 ? "s" : ""}</p>
            </>
          )}

          {/* Grille des plats */}
          {view === "dishes" && (
            <>
              {selectedCategory && (
                <div className="p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: "#F8F8F8", border: "1px solid #E8E0D8" }}>
                  <div>
                    <h2 className="font-bold text-base sm:text-lg" style={{ fontFamily: "'Georgia', serif" }}>{selectedCategory.nom}</h2>
                    <p className="text-[10px] sm:text-xs" style={{ color: "#888" }}>{displayedDishes.length} {getItemTypeName(selectedCategory.id)}{displayedDishes.length > 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => openAddDish(selectedCategory.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white transition-all hover:scale-105" style={{ background: getCategoryColor(selectedCategory.id) }}>
                    <Plus size={12} /> Ajouter {getItemTypeName(selectedCategory.id)}
                  </button>
                </div>
              )}

              {displayedDishes.length === 0 ? (
                <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #E8E0D8" }}>
                  <Plus size={32} className="mx-auto mb-3" style={{ color: "#DDD" }} />
                  <p className="font-semibold mb-3" style={{ color: "#BBB" }}>Aucun plat trouvé</p>
                  <button onClick={() => openAddDish(selectedCategory?.id)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: selectedCategory ? getCategoryColor(selectedCategory.id) : "#C0392B" }}>
                    Ajouter un plat
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {displayedDishes.map(item => {
                    const catColor = getCategoryColor(item.categorie)
                    const realCount = getRealCommandCount(item.nom)
                    return (
                      <div key={item.id} className="rounded-xl sm:rounded-2xl border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg" style={{ background: "white", border: "1px solid #F0E8E0", opacity: item.disponible ? 1 : 0.7 }}>
                        <div className="relative h-32 sm:h-44 overflow-hidden">
                          <img src={item.image} alt={item.nom} className="w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                          <div className="absolute top-2 left-2"><span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-bold text-white" style={{ background: catColor }}>{categories.find(c => c.id === item.categorie)?.nom || item.categorie}</span></div>
                          <div className="absolute top-2 right-2"><span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold" style={item.disponible ? { background: "rgba(39,174,96,0.9)", color: "white" } : { background: "rgba(231,76,60,0.9)", color: "white" }}>{item.disponible ? "✓ Dispo" : "✗ Indispo"}</span></div>
                          {item.tag && <div className="absolute bottom-2 left-2"><span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-xs font-semibold" style={{ background: "#D4A017", color: "white" }}>{item.tag}</span></div>}
                          <div className="absolute bottom-2 right-2 flex gap-1.5">
                            <button onClick={() => openEditDish(item)} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}><Edit2 size={11} style={{ color: "#555" }} /></button>
                            <button onClick={() => setDeleteId(item.id)} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}><Trash2 size={11} style={{ color: "#E74C3C" }} /></button>
                          </div>
                        </div>
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-xs sm:text-sm leading-tight" style={{ color: "#1A1A1A", fontFamily: "'Georgia', serif" }}>{item.nom}</h3>
                            <span className="text-sm sm:text-lg font-bold flex-shrink-0" style={{ color: "#C0392B" }}>{item.prix.toLocaleString()}<span className="text-[9px] sm:text-xs font-normal" style={{ color: "#BBB" }}> F</span></span>
                          </div>
                          <p className="text-[10px] sm:text-xs mb-2 line-clamp-2" style={{ color: "#888" }}>{item.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] sm:text-xs px-1.5 py-0.5 rounded-lg" style={{ background: "#FFF5EE", color: "#C0392B" }}>
                              {item.repas} · {realCount} cmd
                            </span>
                            <button onClick={() => toggleDispo(item.id, item.disponible)} className="px-2 py-1 rounded-lg text-[9px] sm:text-xs font-semibold border transition-all" style={item.disponible ? { borderColor: "#E74C3C", color: "#E74C3C" } : { borderColor: "#27AE60", color: "#27AE60" }}>
                              {item.disponible ? "Désactiver" : "Activer"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* MODAL CATÉGORIE (responsive) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{ background: "white" }}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
              <h2 className="font-bold text-base sm:text-lg" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>{editCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} style={{ color: "#888" }} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>ID *</label><input value={categoryForm.id} onChange={e => setCategoryForm({ ...categoryForm, id: e.target.value })} placeholder="senegalais" className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} /></div>
                <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Nom *</label><input value={categoryForm.nom} onChange={e => setCategoryForm({ ...categoryForm, nom: e.target.value })} placeholder="Plats Sénégalais" className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} /></div>
              </div>
              <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Description</label><textarea value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl text-sm border resize-none" style={{ border: "1px solid #E8E0D8" }} /></div>
              <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>URL Image</label><input value={categoryForm.image} onChange={e => setCategoryForm({ ...categoryForm, image: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} /></div>
              {categoryForm.image && <div className="h-24 rounded-xl overflow-hidden"><img src={categoryForm.image} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} /></div>}
            </div>
            <div className="px-4 sm:px-6 py-4 border-t flex gap-3" style={{ borderColor: "#F0E8E0" }}>
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Annuler</button>
              <button onClick={handleSaveCategory} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2" style={{ background: saved ? "#27AE60" : "#C0392B" }}>
                {saved ? <><CheckCircle size={14} /> Sauvegardé !</> : editCategory ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLAT (responsive) */}
      {showDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" style={{ background: "white" }}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: "#F0E8E0" }}>
              <h2 className="font-bold text-base sm:text-lg" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>{editDish ? "Modifier" : `Ajouter ${selectedCategory ? getItemTypeName(selectedCategory.id) : "un plat"}`}</h2>
              <button onClick={() => setShowDishModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} style={{ color: "#888" }} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Nom *</label><input value={dishForm.nom} onChange={e => setDishForm({ ...dishForm, nom: e.target.value })} className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} /></div>
              <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Description</label><textarea value={dishForm.description} onChange={e => setDishForm({ ...dishForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl text-sm border resize-none" style={{ border: "1px solid #E8E0D8" }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Prix (FCFA) *</label><input type="number" value={dishForm.prix} onChange={e => setDishForm({ ...dishForm, prix: e.target.value })} className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} /></div>
                <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Catégorie *</label><select value={dishForm.categorie} onChange={e => setDishForm({ ...dishForm, categorie: e.target.value })} className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }}><option value="">Sélectionner</option>{categories.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Repas</label><select value={dishForm.repas} onChange={e => setDishForm({ ...dishForm, repas: e.target.value as Repas })} className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }}>{repasOptions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Tag</label><input value={dishForm.tag} onChange={e => setDishForm({ ...dishForm, tag: e.target.value })} placeholder="Best-seller" className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} /></div>
              </div>
              {editDish && (
                <div className="p-2 rounded-xl" style={{ background: "#F5F5F5" }}>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>Commandes réelles</label>
                  <div className="text-base font-bold" style={{ color: "#C0392B" }}>{getRealCommandCount(editDish.nom)}</div>
                </div>
              )}
              <div className="flex items-center gap-3"><label className="flex items-center gap-2 cursor-pointer"><div onClick={() => setDishForm({ ...dishForm, disponible: !dishForm.disponible })} className="w-10 h-5 rounded-full transition-all relative" style={{ background: dishForm.disponible ? "#27AE60" : "#DDD" }}><div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm" style={{ left: dishForm.disponible ? "22px" : "2px" }} /></div><span className="text-xs font-medium" style={{ color: "#555" }}>Disponible</span></label></div>
              <div><label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#888" }}>URL Image</label><input value={dishForm.image} onChange={e => setDishForm({ ...dishForm, image: e.target.value })} className="w-full px-3 py-2 rounded-xl text-sm border" style={{ border: "1px solid #E8E0D8" }} />{dishForm.image && <div className="mt-2 h-20 rounded-xl overflow-hidden"><img src={dishForm.image} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} /></div>}</div>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t flex gap-3" style={{ borderColor: "#F0E8E0" }}>
              <button onClick={() => setShowDishModal(false)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Annuler</button>
              <button onClick={handleSaveDish} disabled={isSaving} className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2" style={{ background: saved ? "#27AE60" : "#C0392B" }}>
                {saved ? <><CheckCircle size={14} /> Sauvegardé !</> : editDish ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION CATÉGORIE (responsive) */}
      {deleteCategoryId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-xs rounded-2xl p-4 shadow-2xl" style={{ background: "white" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(231,76,60,0.1)" }}><Trash2 size={20} style={{ color: "#E74C3C" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "#1A1A1A" }}>Supprimer cette catégorie ?</h3>
            <p className="text-xs text-center mb-4" style={{ color: "#888" }}>Action irréversible.</p>
            <div className="flex gap-2"><button onClick={() => setDeleteCategoryId(null)} className="flex-1 py-2 rounded-xl font-semibold border text-xs" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Annuler</button><button onClick={() => handleDeleteCategory(deleteCategoryId)} className="flex-1 py-2 rounded-xl font-semibold text-white text-xs" style={{ background: "#E74C3C" }}>Supprimer</button></div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION PLAT (responsive) */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-xs rounded-2xl p-4 shadow-2xl" style={{ background: "white" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(231,76,60,0.1)" }}><Trash2 size={20} style={{ color: "#E74C3C" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "#1A1A1A" }}>Supprimer ce plat ?</h3>
            <p className="text-xs text-center mb-4" style={{ color: "#888" }}>Action irréversible.</p>
            <div className="flex gap-2"><button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl font-semibold border text-xs" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Annuler</button><button onClick={() => handleDeleteDish(deleteId)} className="flex-1 py-2 rounded-xl font-semibold text-white text-xs" style={{ background: "#E74C3C" }}>Supprimer</button></div>
          </div>
        </div>
      )}
    </div>
  )
}