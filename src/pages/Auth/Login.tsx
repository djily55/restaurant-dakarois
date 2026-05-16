// src/pages/Auth/Login.tsx
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ChefHat, Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const STAFF_ROLES = ["admin", "serveur", "cuisinier", "livreur"]

export default function Login() {
  const navigate = useNavigate()
  const { login, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      console.log("🔍 Rôle détecté :", user.role)
      console.log("🔍 User complet :", user)

      if (STAFF_ROLES.includes(user.role)) {
        navigate("/dashboard")
      } else {
        navigate("/")
      }
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.")
      return
    }
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Email ou mot de passe incorrect.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Panneau gauche – décor */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('public/images/63a47191df44b-restaurant senegal.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D0D0D]/80 via-[#C0392B]/20 to-[#0D0D0D]/90" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C0392B] rounded-xl flex items-center justify-center">
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-xl text-white">Le Dakarois</span>
            <span className="block text-[10px] text-[#E67E22] uppercase tracking-widest">Restaurant</span>
          </div>
        </div>
        <div className="relative z-10">
          <div className="w-12 h-1 bg-[#C0392B] rounded mb-6" />
          <blockquote
            className="text-white text-3xl font-bold leading-tight mb-4"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            "La cuisine est l'art de<br />
            <span className="text-[#E67E22]">transformer l'amour</span><br />
            en saveur."
          </blockquote>
          <p className="text-white/50 text-sm">— Chef Djily Ndiaye, Fondateur</p>
          <div className="flex gap-8 mt-10">
            {[
              { val: "2500+", label: "Clients" },
              { val: "4.9★", label: "Note" },
              { val: "8 ans", label: "Expérience" },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="text-white font-bold text-xl">{val}</div>
                <div className="text-white/40 text-xs uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit – formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#C0392B] rounded-xl flex items-center justify-center">
              <ChefHat size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-black">Le Dakarois</span>
          </div>

          <div className="mb-8">
            <h1
              className="text-3xl font-bold text-black mb-2"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Connexion
            </h1>
            <p className="text-black/50 text-sm">Accédez à votre espace personnel</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-black/70 text-sm font-medium mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-white border border-black/20 rounded-xl pl-11 pr-4 py-3.5 text-black placeholder:text-black/30 text-sm focus:outline-none focus:border-[#C0392B] transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-black/70 text-sm font-medium">
                  Mot de passe
                </label>
                <Link
                  to="/reset-password"
                  className="text-[#C0392B] text-xs hover:text-[#E67E22] transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-black/20 rounded-xl pl-11 pr-12 py-3.5 text-black placeholder:text-black/30 text-sm focus:outline-none focus:border-[#C0392B] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C0392B] hover:bg-[#A93226] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-black/60 text-sm">
              Pas encore de compte ?{" "}
              <Link
                to="/register"
                className="text-[#C0392B] hover:text-[#E67E22] font-semibold transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>

          <p className="text-center mt-6">
            <Link
              to="/"
              className="text-black/40 hover:text-black/60 text-xs transition-colors"
            >
              ← Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}