// src/pages/Dashboard/Orders.tsx
import { useState, useEffect } from "react"
import { ShoppingBag, Clock, ChefHat, CheckCircle, Truck, Search, Filter, Phone, RefreshCw } from "lucide-react"
import { collection, onSnapshot, query, orderBy, updateDoc, doc, getDocs } from "firebase/firestore"
import { db } from "../../firebase"


type OrderStatut = "En attente" | "En cuisine" | "Prêt" | "En livraison" | "Terminé" | "Livré"

import type { Timestamp } from "firebase/firestore"

interface Order {
  id: string
  client: string
  telephone: string
  adresse: string
  table: string
  type: "livraison" | "emporter" | "table"
  items: { nom: string; quantite: number; prix: number }[]
  total: number
  statut: OrderStatut
  createdAt: string
  serverTime?: Timestamp
  userId?: string
}

const getStatutFlow = (type: string): OrderStatut[] => {
  if (type === "livraison") return ["En attente", "En cuisine", "Prêt", "En livraison", "Livré"]
  return ["En attente", "En cuisine", "Terminé"]
}

const statusCfg: Record<OrderStatut, { color: string; bg: string; border: string; icon: React.ElementType; next?: string }> = {
  "En attente": { color: "#E67E22", bg: "rgba(230,126,34,0.08)", border: "rgba(230,126,34,0.2)", icon: Clock, next: "En cuisine" },
  "En cuisine": { color: "#3498DB", bg: "rgba(52,152,219,0.08)", border: "rgba(52,152,219,0.2)", icon: ChefHat, next: "Prêt" },
  "Prêt": { color: "#9B59B6", bg: "rgba(155,89,182,0.08)", border: "rgba(155,89,182,0.2)", icon: CheckCircle, next: "En livraison" },
  "En livraison": { color: "#E74C3C", bg: "rgba(231,76,60,0.08)", border: "rgba(231,76,60,0.2)", icon: Truck, next: "Livré" },
  "Terminé": { color: "#27AE60", bg: "rgba(39,174,96,0.08)", border: "rgba(39,174,96,0.2)", icon: CheckCircle },
  "Livré": { color: "#27AE60", bg: "rgba(39,174,96,0.08)", border: "rgba(39,174,96,0.2)", icon: CheckCircle },
}

const typeLabel: Record<string, string> = { livraison: "🛵 Livraison", emporter: "🛍 À emporter", table: "🍽 Sur place" }

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatut | "Tous">("Tous")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Order | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [showFinished, setShowFinished] = useState(false)
  const [loading, setLoading] = useState(true)

  // Vérification initiale (optionnelle)
  useEffect(() => {
    const checkCollection = async () => {
      const snapshot = await getDocs(collection(db, "orders"));
      console.log("🔥 Nombre total de commandes dans Firestore :", snapshot.size);
      snapshot.forEach(doc => console.log(" - Commande ID:", doc.id, doc.data().client));
    };
    checkCollection();
  }, []);

  // Écoute en temps réel – CORRECTION ICI : orderBy("createdAt", "desc")
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      console.log("📦 Snapshot reçu, taille :", snapshot.size);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        let displayDate = docData.createdAt;
        const serverTime = docData.serverTime;
        if (serverTime && typeof serverTime.toDate === "function") {
          displayDate = serverTime.toDate().toISOString();
        } else if (displayDate && typeof displayDate.toDate === "function") {
          displayDate = displayDate.toDate().toISOString();
        } else if (!displayDate) {
          displayDate = new Date().toISOString();
        }
        return { id: doc.id, ...docData, createdAt: displayDate } as Order;
      });
      setOrders(data);
      setLoading(false);
      setLastRefresh(new Date());
      if (selected) {
        const updated = data.find(o => o.id === selected.id);
        if (updated) setSelected(updated);
        else setSelected(null);
      }
    }, (error) => {
      console.error("❌ Erreur Firestore :", error);
      setLoading(false);
    });
    return () => unsub();
  }, [selected]);

  const updateOrderStatut = async (id: string, newStatut: OrderStatut) => {
    try {
      await updateDoc(doc(db, "orders", id), { statut: newStatut });
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
    }
  };

  const handleAdvance = (id: string, nextStatut: OrderStatut) => updateOrderStatut(id, nextStatut);

  const filtered = orders
    .filter(o => {
      const matchFilter = filter === "Tous" || o.statut === filter;
      const matchSearch = o.id.includes(search) || o.client.toLowerCase().includes(search.toLowerCase()) || o.items.some(i => i.nom.toLowerCase().includes(search.toLowerCase()));
      const isFinished = o.statut === "Livré" || o.statut === "Terminé";
      if (!showFinished && isFinished) return false;
      return matchFilter && matchSearch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = orders.reduce((acc, o) => {
    acc[o.statut] = (acc[o.statut] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const revenue = orders.filter(o => o.statut === "Livré" || o.statut === "Terminé").reduce((s, o) => s + o.total, 0);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="text-center py-20">Chargement des commandes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Gestion des commandes</h1>
          <p className="text-sm mt-1" style={{ color: "#999" }}>{orders.length} commandes · {revenue.toLocaleString()} FCFA encaissés</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#27AE60" }} /><span className="text-xs" style={{ color: "#27AE60" }}>En direct</span></div>
          <span className="text-xs" style={{ color: "#AAA" }}>{lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button onClick={() => setLastRefresh(new Date())} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-50" style={{ color: "#C0392B" }}><RefreshCw size={14} /> Actualiser</button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {["En attente", "En cuisine", "Prêt", "En livraison", "Terminé", "Livré"].map(s => {
          const statut = s as OrderStatut;
          const cfg = statusCfg[statut];
          const count = counts[statut] || 0;
          return (
            <button key={statut} onClick={() => setFilter(filter === statut ? "Tous" : statut)}
              className="p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5"
              style={{ background: filter === statut ? cfg.bg : "white", border: `1px solid ${filter === statut ? cfg.border : "#F0E8E0"}` }}>
              <cfg.icon size={16} style={{ color: cfg.color }} />
              <div className="text-xl font-bold mt-2" style={{ color: "#1A1A1A" }}>{count}</div>
              <div className="text-xs mt-0.5" style={{ color: "#AAA" }}>{statut}</div>
            </button>
          );
        })}
      </div>

      {/* Search + filtre + checkbox */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm border focus:outline-none"
            style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} style={{ color: "#AAA" }} />
          <select 
  value={filter} 
  onChange={e => setFilter(e.target.value as OrderStatut | "Tous")}
  className="px-4 py-3 rounded-xl text-sm border focus:outline-none"
  style={{ background: "white", border: "1px solid #E8E0D8", color: "#555" }}
>
  <option value="Tous">Tous les statuts</option>
  {["En attente", "En cuisine", "Prêt", "En livraison", "Terminé", "Livré"].map(s => (
    <option key={s} value={s}>{s}</option>
  ))}
</select>
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: "#555" }}>
          <input type="checkbox" checked={showFinished} onChange={e => setShowFinished(e.target.checked)} />
          Afficher les commandes terminées
        </label>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: "white", border: "1px solid #F0E8E0" }}>
          <ShoppingBag size={40} className="mx-auto mb-4" style={{ color: "#DDD" }} />
          <p className="font-semibold mb-2" style={{ color: "#BBB" }}>Aucune commande pour le moment</p>
          <p className="text-sm mt-2" style={{ color: "#AAA" }}>Assurez-vous d'avoir passé une commande depuis le site client.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Liste des commandes */}
          <div className="lg:col-span-3 space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                <ShoppingBag size={32} className="mx-auto mb-3" style={{ color: "#DDD" }} />
                <p style={{ color: "#BBB" }}>Aucune commande trouvée pour ce filtre</p>
              </div>
            ) : (
              filtered.map(order => {
                const cfg = statusCfg[order.statut];
                const Icon = cfg.icon;
                const isSelected = selected?.id === order.id;
                const flow = getStatutFlow(order.type);
                const nextStatut = flow[flow.indexOf(order.statut) + 1];
                return (
                  <div key={order.id} onClick={() => setSelected(order)}
                    className="p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5"
                    style={{ background: "white", border: isSelected ? "2px solid #C0392B" : "1px solid #F0E8E0", boxShadow: isSelected ? "0 4px 20px rgba(192,57,43,0.12)" : "none" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B" }}>#{order.id.slice(-3)}</div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: "#1A1A1A" }}>{order.client}</div>
                          <div className="text-xs" style={{ color: "#AAA" }}>{formatTime(order.createdAt)} · {typeLabel[order.type]}{order.type === "table" && order.table && <span className="ml-2 text-[#C0392B]">Table n°{order.table}</span>}</div>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}><Icon size={10} /> {order.statut}</span>
                    </div>
                    <div className="text-xs mb-3 truncate" style={{ color: "#888" }}>{order.items.map(i => `${i.quantite}x ${i.nom}`).join(", ")}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold" style={{ color: "#C0392B" }}>{order.total.toLocaleString()} FCFA</span>
                      {nextStatut && order.statut !== "Livré" && order.statut !== "Terminé" && (
                        <button onClick={e => { e.stopPropagation(); handleAdvance(order.id, nextStatut) }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105"
                          style={{ background: "#C0392B" }}>→ {nextStatut}</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Détail commande */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              {selected ? (() => {
                const cfg = statusCfg[selected.statut];
                const Icon = cfg.icon;
                const flow = getStatutFlow(selected.type);
                const currentStep = flow.indexOf(selected.statut);
                const nextStatut = flow[currentStep + 1];
                return (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                    <div className="p-5 border-b" style={{ borderColor: "#F0E8E0", background: cfg.bg }}>
                      <div className="flex items-center justify-between">
                        <div><div className="font-bold">{selected.client}</div><div className="text-xs mt-0.5">{formatTime(selected.createdAt)} · {typeLabel[selected.type]}{selected.type === "table" && selected.table && <span className="ml-2 text-[#C0392B]">Table n°{selected.table}</span>}</div></div>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: "white", color: cfg.color }}><Icon size={12} /> {selected.statut}</span>
                      </div>
                    </div>
                    <div className="px-5 py-4 border-b">
                      <div className="flex items-center">
                        {flow.map((s, i) => (
                          <div key={s} className="flex-1 flex flex-col items-center">
                            <div className="flex items-center w-full">
                              <div className="flex-1 h-1" style={{ background: i === 0 ? "transparent" : i <= currentStep ? "#C0392B" : "#F0E8E0" }} />
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={i <= currentStep ? { background: "#C0392B", color: "white" } : { background: "#F0E8E0", color: "#BBB" }}>{i < currentStep ? "✓" : i + 1}</div>
                              <div className="flex-1 h-1" style={{ background: i === flow.length - 1 ? "transparent" : i < currentStep ? "#C0392B" : "#F0E8E0" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selected.client !== "Client anonyme" && (
                      <div className="px-5 py-4 border-b">
                        <div className="font-semibold text-sm mb-2">Client</div>
                        <div className="flex items-center justify-between">
                          <div><div className="text-sm font-medium">{selected.client}</div>{selected.adresse && selected.adresse !== "—" && <div className="text-xs mt-0.5">📍 {selected.adresse}</div>}</div>
                          {selected.telephone && selected.telephone !== "—" && <a href={`tel:${selected.telephone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "rgba(39,174,96,0.1)", color: "#27AE60" }}><Phone size={12} /> Appeler</a>}
                        </div>
                      </div>
                    )}
                    <div className="px-5 py-4 border-b">
                      <div className="font-semibold text-sm mb-3">Articles</div>
                      <div className="space-y-2">{selected.items.map((item, i) => <div key={i} className="flex justify-between text-sm"><span>{item.quantite}x {item.nom}</span><span style={{ color: "#C0392B" }}>{(item.prix * item.quantite).toLocaleString()} FCFA</span></div>)}</div>
                      <div className="flex justify-between font-bold pt-3 mt-2 border-t"><span>Total</span><span style={{ color: "#C0392B" }}>{selected.total.toLocaleString()} FCFA</span></div>
                    </div>
                    <div className="p-5">
                      {nextStatut && <button onClick={() => handleAdvance(selected.id, nextStatut)} className="w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}>Passer à : {nextStatut}</button>}
                      {(!nextStatut || selected.statut === "Livré" || selected.statut === "Terminé") && <div className="text-center py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(39,174,96,0.1)", color: "#27AE60" }}>✓ Commande terminée</div>}
                    </div>
                  </div>
                );
              })() : (
                <div className="flex items-center justify-center h-64 rounded-2xl" style={{ border: "2px dashed #E8E0D8" }}>
                  <div className="text-center"><ShoppingBag size={28} className="mx-auto mb-2" style={{ color: "#DDD" }} /><p className="text-sm" style={{ color: "#BBB" }}>Cliquez sur une commande</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}