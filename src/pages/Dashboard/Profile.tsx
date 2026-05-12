// src/pages/Dashboard/Profile.tsx
import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useAdminUsers } from "../../hooks/useAdminUsers"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../../firebase"
import { User, Mail, Lock, Shield, Plus, Trash2, Eye, EyeOff, CheckCircle, X, Crown, ChefHat, Truck } from "lucide-react"

const roleColors: Record<string, { color: string; bg: string; label: string; icon: any; shortLabel: string }> = {
  admin: { color: "#C0392B", bg: "rgba(192,57,43,0.08)", label: "Administrateur", shortLabel: "Admin", icon: Crown },
  serveur: { color: "#3498DB", bg: "rgba(52,152,219,0.08)", label: "Serveur", shortLabel: "Serveur", icon: User },
  cuisinier: { color: "#27AE60", bg: "rgba(39,174,96,0.08)", label: "Cuisinier", shortLabel: "Cuisto", icon: ChefHat },
  livreur: { color: "#F39C12", bg: "rgba(243,156,18,0.08)", label: "Livreur", shortLabel: "Livreur", icon: Truck },
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const { users, loading, addUser, updateUser, deleteUser } = useAdminUsers()
  const [activeTab, setActiveTab] = useState<"profil" | "equipe" | "securite">("profil")

  // Profil form
  const [profileForm, setProfileForm] = useState({
    nom: user?.nom ?? "",
    email: user?.email ?? "",
    telephone: user?.telephone ?? ""
  })
  const [profileSaved, setProfileSaved] = useState(false)

  // Sécurité form
  const [secForm, setSecForm] = useState({ current: "", nouveau: "", confirm: "" })
  const [showPwd, setShowPwd] = useState({ current: false, nouveau: false, confirm: false })
  const [secSaved, setSecSaved] = useState(false)
  const [secError, setSecError] = useState("")

  // Nouvel employé
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ nom: "", email: "", password: "", role: "serveur" as "admin" | "serveur" | "cuisinier" | "livreur", telephone: "" })
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [addSaved, setAddSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addError, setAddError] = useState("")

  // État pour la reconnexion admin
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    await updateUser(user.id, { nom: profileForm.nom, email: profileForm.email, telephone: profileForm.telephone })
    await refreshUser()
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const handleSaveSec = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecError("")
    if (!secForm.current || secForm.nouveau.length < 6 || secForm.nouveau !== secForm.confirm) {
      setSecError("Le nouveau mot de passe doit contenir au moins 6 caractères et correspondre à la confirmation.")
      return
    }
    try {
      const credential = EmailAuthProvider.credential(user!.email, secForm.current)
      await reauthenticateWithCredential(auth.currentUser!, credential)
      await updatePassword(auth.currentUser!, secForm.nouveau)
      setSecSaved(true)
      setSecForm({ current: "", nouveau: "", confirm: "" })
      setTimeout(() => setSecSaved(false), 2000)
    } catch (err: any) {
      setSecError(err.message || "Mot de passe actuel incorrect.")
    }
  }

  // Étape 1 : vérifier le formulaire, puis demander le mot de passe admin
  const requestAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError("")
    if (!newAdmin.nom || !newAdmin.email || !newAdmin.password) {
      setAddError("Tous les champs sont requis.")
      return
    }
    setShowPwdModal(true)
  }

  // Étape 2 : créer le compte et reconnecter l'admin
  const confirmAddAdmin = async () => {
    try {
      // 1. Créer le nouveau compte (cela déconnecte l'admin actuel)
      await addUser(newAdmin.nom, newAdmin.email, newAdmin.password, newAdmin.role, newAdmin.telephone)
      // 2. Reconnecter l'admin principal
      await signInWithEmailAndPassword(auth, user!.email, adminPassword)
      await refreshUser()
      setAddSaved(true)
      setTimeout(() => {
        setAddSaved(false)
        setShowAddModal(false)
        setShowPwdModal(false)
        setAdminPassword("")
        setNewAdmin({ nom: "", email: "", password: "", role: "serveur", telephone: "" })
      }, 1200)
    } catch (err: any) {
      setAddError(err.message || "Erreur lors de l'ajout")
      setShowPwdModal(false)
    }
  }

  const toggleActif = async (id: string, current: boolean) => {
    if (user?.role !== "admin") return
    await updateUser(id, { actif: !current })
  }

  const handleDelete = async (id: string) => {
    if (user?.role !== "admin") return
    await deleteUser(id)
    setDeleteId(null)
  }

  const canManage = user?.role === "admin"
  const otherUsers = users.filter(u => u.id !== user?.id)

  const RoleIcon = ({ role }: { role: string }) => {
    const Icon = roleColors[role]?.icon
    return Icon ? <Icon size={11} /> : null
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: "#999" }}>Gérez votre profil, votre équipe et la sécurité</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: "#F0E8E0" }}>
        {[
          { id: "profil" as const, label: "Mon profil", icon: User },
          { id: "equipe" as const, label: "Équipe", icon: Shield },
          { id: "securite" as const, label: "Sécurité", icon: Lock },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={activeTab === id
              ? { background: "white", color: "#C0392B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
              : { color: "#888" }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ========== TAB PROFIL ========== */}
      {activeTab === "profil" && (
        // ... (identique à la version précédente, je ne le répète pas pour la lisibilité)
        // Vous pouvez reprendre le code du profil inchangé
        <div>Votre profil (inchangé)</div>
      )}

      {/* ========== TAB EQUIPE ========== */}
      {activeTab === "equipe" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "#999" }}>{users.length} membre(s) dans l'équipe</p>
            {canManage && (
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)", boxShadow: "0 4px 15px rgba(192,57,43,0.3)" }}>
                <Plus size={16} /> Ajouter un membre
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Admin connecté */}
              {user && (
                <div className="rounded-2xl border p-5" style={{ background: "white", border: "1px solid #F0E8E0" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ background: "#C0392B" }}>
                        {user.nom?.charAt(0) ?? "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: "#1A1A1A" }}>{user.nom} (Vous)</div>
                        <div className="text-xs truncate" style={{ color: "#AAA" }}>{user.email}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: roleColors[user.role]?.color }}>
                      <RoleIcon role={user.role} />
                      {roleColors[user.role]?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: roleColors[user.role]?.bg, color: roleColors[user.role]?.color }}>
                      {roleColors[user.role]?.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Autres membres */}
              {otherUsers.map(member => {
                const cfg = roleColors[member.role]
                return (
                  <div key={member.id} className="rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
                    style={{ background: "white", border: "1px solid #F0E8E0", opacity: member.actif ? 1 : 0.6 }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ background: "#C0392B" }}>
                          {member.nom?.charAt(0) ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate" style={{ color: "#1A1A1A" }}>{member.nom}</div>
                          <div className="text-xs truncate" style={{ color: "#AAA" }}>{member.email}</div>
                        </div>
                      </div>
                      {canManage && (
                        <button onClick={() => setDeleteId(member.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                          <Trash2 size={14} style={{ color: "#CCC" }} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-xs" style={{ color: "#BBB" }}>depuis {member.dateCreation}</span>
                      </div>
                      {canManage && (
                        <button onClick={() => toggleActif(member.id, member.actif!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={member.actif
                            ? { borderColor: "#E74C3C", color: "#E74C3C" }
                            : { borderColor: "#27AE60", color: "#27AE60" }}>
                          {member.actif ? "Désactiver" : "Activer"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB SÉCURITÉ (inchangé) ========== */}
      {activeTab === "securite" && (
        <div className="max-w-lg">
          <div className="rounded-2xl border p-6" style={{ background: "white", border: "1px solid #F0E8E0" }}>
            <h2 className="font-bold text-lg mb-2" style={{ color: "#1A1A1A" }}>Changer le mot de passe</h2>
            <p className="text-sm mb-6" style={{ color: "#999" }}>Utilisez un mot de passe fort pour sécuriser votre compte.</p>
            {secError && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: "rgba(231,76,60,0.08)", color: "#E74C3C" }}>
                <X size={14} /> {secError}
              </div>
            )}
            {secSaved && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: "rgba(39,174,96,0.08)", color: "#27AE60" }}>
                <CheckCircle size={14} /> Mot de passe modifié !
              </div>
            )}
            <form onSubmit={handleSaveSec} className="space-y-5">
              {[
                { key: "current" as const, label: "Mot de passe actuel" },
                { key: "nouveau" as const, label: "Nouveau mot de passe" },
                { key: "confirm" as const, label: "Confirmer le nouveau" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>{label}</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#BBB" }} />
                    <input type={showPwd[key] ? "text" : "password"} value={secForm[key]}
                      onChange={e => setSecForm({ ...secForm, [key]: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3.5 rounded-xl text-sm border focus:outline-none"
                      style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                    <button type="button" onClick={() => setShowPwd({ ...showPwd, [key]: !showPwd[key] })}
                      className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#BBB" }}>
                      {showPwd[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="p-4 rounded-xl text-xs space-y-1" style={{ background: "#FFF5EE" }}>
                <p className="font-semibold mb-2" style={{ color: "#C0392B" }}>Conseils de sécurité :</p>
                {["Au moins 8 caractères", "Mélangez lettres, chiffres et symboles", "Ne réutilisez pas un ancien mot de passe"].map(tip => (
                  <p key={tip} className="flex items-center gap-2" style={{ color: "#888" }}>
                    <span style={{ color: "#C0392B" }}>·</span> {tip}
                  </p>
                ))}
              </div>
              <button type="submit"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
                style={{ background: "#C0392B" }}>
                <Lock size={15} /> Mettre à jour le mot de passe
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL AJOUTER UN MEMBRE ========== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" style={{ background: "white" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#F0E8E0" }}>
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Ajouter un membre</h2>
              <button onClick={() => { setShowAddModal(false); setNewAdmin({ nom: "", email: "", password: "", role: "serveur", telephone: "" }); setAddError("") }} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} style={{ color: "#888" }} />
              </button>
            </div>
            <form onSubmit={requestAddAdmin} className="p-6 space-y-4">
              {addError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{addError}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>Nom complet *</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#BBB" }} />
                  <input required value={newAdmin.nom} onChange={e => setNewAdmin({ ...newAdmin, nom: e.target.value })}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>Email *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#BBB" }} />
                  <input required type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>Mot de passe *</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#BBB" }} />
                  <input required type={showNewPwd ? "text" : "password"} value={newAdmin.password}
                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#BBB" }}>
                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>Téléphone</label>
                <input value={newAdmin.telephone} onChange={e => setNewAdmin({ ...newAdmin, telephone: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl text-sm border focus:outline-none"
                  style={{ border: "1px solid #E8E0D8", color: "#1A1A1A" }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["admin", "serveur", "cuisinier", "livreur"] as const).map(r => {
                  const cfg = roleColors[r]
                  const buttonLabel = cfg.shortLabel || cfg.label
                  return (
                    <button key={r} type="button" onClick={() => setNewAdmin({ ...newAdmin, role: r })}
                      className="py-3 rounded-xl text-sm font-semibold border-2 transition-all capitalize"
                      style={newAdmin.role === r
                        ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color }
                        : { color: "#888", borderColor: "#E8E0D8" }}>
                      {buttonLabel}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setNewAdmin({ nom: "", email: "", password: "", role: "serveur", telephone: "" }) }}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-sm border" style={{ color: "#888", border: "2px solid #E8E0D8" }}>
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: addSaved ? "#27AE60" : "#C0392B" }}>
                  {addSaved ? <><CheckCircle size={15} /> Ajouté !</> : <><Plus size={15} /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODALE CONFIRMATION MOT DE PASSE ADMIN ========== */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 bg-white">
            <h3 className="text-lg font-bold mb-2">Confirmation requise</h3>
            <p className="text-sm text-gray-600 mb-4">
              Pour des raisons de sécurité, entrez votre mot de passe d'administrateur principal.
            </p>
            <input
              type="password"
              placeholder="Votre mot de passe"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-600"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPwdModal(false)} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700">Annuler</button>
              <button onClick={confirmAddAdmin} className="flex-1 py-2 rounded-xl bg-red-700 text-white">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL SUPPRESSION ========== */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "white" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(231,76,60,0.1)" }}>
              <Trash2 size={24} style={{ color: "#E74C3C" }} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2" style={{ color: "#1A1A1A" }}>Supprimer ce membre ?</h3>
            <p className="text-sm text-center mb-6" style={{ color: "#888" }}>Il perdra l'accès au dashboard immédiatement.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-semibold border text-sm" style={{ color: "#888", border: "2px solid #E8E0D8" }}>Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: "#E74C3C" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}