// src/pages/Auth/Register.tsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ChefHat, Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ nom: "", email: "", telephone: "", password: "", confirm: "" })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const getStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: "", color: "" }
    if (pwd.length < 4) return { level: 1, label: "Faible", color: "#E74C3C" }
    if (pwd.length < 7) return { level: 2, label: "Moyen", color: "#E67E22" }
    return { level: 3, label: "Fort", color: "#27AE60" }
  }
  const strength = getStrength(form.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.nom || !form.email || !form.telephone || !form.password) {
      setError("Veuillez remplir tous les champs.")
      return
    }
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

    setLoading(true)
    const success = await register(form.nom, form.email, form.password, form.telephone)
    setLoading(false)
    if (success) {
      navigate("/login")
    } else {
      setError("Cet email est déjà utilisé ou une erreur est survenue.")
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#FFFAF5" }}>
      {/* Panneau gauche – décor (légèrement assombri mais restant clair) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/63a47191df44b-restaurant senegal.jpg')" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,250,245,0.92) 0%, rgba(192,57,43,0.15) 100%)" }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#C0392B" }}>
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-xl" style={{ color: "#1A1A1A" }}>Le Dakarois</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "#C0392B" }}>Restaurant</div>
          </div>
        </div>
        <div className="relative z-10">
          <div className="w-12 h-1 rounded mb-6" style={{ background: "#C0392B" }} />
          <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>
            Rejoignez notre<br /><span style={{ color: "#C0392B" }}>communauté</span>
          </h2>
          <div className="space-y-3">
            {[
              "Commandez vos plats préférés en ligne",
              "Suivez vos commandes en temps réel",
              "Réservez votre table facilement",
              "Accédez à votre historique de commandes"
            ].map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle size={14} style={{ color: "#27AE60" }} />
                <span className="text-sm" style={{ color: "rgba(0,0,0,0.6)" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit – formulaire clair */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#C0392B" }}>
              <ChefHat size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: "#1A1A1A" }}>Le Dakarois</span>
          </div>

          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Georgia', serif", color: "#1A1A1A" }}>Créer un compte</h1>
          <p className="text-sm mb-8" style={{ color: "rgba(0,0,0,0.5)" }}>Commandez, réservez, savourez.</p>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-6 text-sm" style={{ background: "rgba(231,76,60,0.08)", color: "#E74C3C", border: "1px solid rgba(231,76,60,0.2)" }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: "nom", label: "Nom complet", icon: User, type: "text", placeholder: "Djily Nidaye" },
              { key: "email", label: "Email", icon: Mail, type: "email", placeholder: "vous@email.com" },
              { key: "telephone", label: "Téléphone", icon: Phone, type: "tel", placeholder: "+221 77 000 00 00" },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#666" }}>{label}</label>
                <div className="relative">
                  <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#999" }} />
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm focus:outline-none border"
                    style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }}
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#666" }}>Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#999" }} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm focus:outline-none border"
                  style={{ background: "white", border: "1px solid #E8E0D8", color: "#1A1A1A" }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= strength.level ? strength.color : "#F0E8E0" }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#666" }}>Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#999" }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm focus:outline-none border"
                  style={{
                    background: "white",
                    border: `1px solid ${
                      form.confirm && form.password !== form.confirm
                        ? "#E74C3C"
                        : form.confirm && form.password === form.confirm
                        ? "#27AE60"
                        : "#E8E0D8"
                    }`,
                    color: "#1A1A1A"
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                "Créer mon compte"
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: "#666" }}>
            Déjà un compte ?{" "}
            <Link to="/login" className="font-semibold transition-colors" style={{ color: "#C0392B" }}>Se connecter</Link>
          </p>
          <p className="text-center mt-3">
            <Link to="/" className="text-xs transition-colors" style={{ color: "#AAA" }}>← Retour à l'accueil</Link>
          </p>
        </div>
      </div>
    </div>
  )
}