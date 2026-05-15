// src/pages/Auth/ResetPassword.tsx
import { useState } from "react"
import { Link } from "react-router-dom"
import { ChefHat, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

type Step = "email" | "success"

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
    setError("")
    if (!email) {
      setError("Veuillez entrer votre adresse email.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Adresse email invalide.")
      return
    }

    setLoading(true)
    try {
      await resetPassword(email)
      setStep("success")
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === "auth/user-not-found") {
        setError("Aucun compte associé à cet email.")
      } else if (code === "auth/invalid-email") {
        setError("Adresse email invalide.")
      } else {
        setError("Erreur lors de l'envoi. Réessayez plus tard.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Panneau gauche – décor (version claire sans image cassée) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-amber-50 to-white">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C0392B] rounded-xl flex items-center justify-center">
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-xl text-gray-800">Le Dakarois</span>
            <span className="block text-[10px] text-[#E67E22] uppercase tracking-widest">Restaurant</span>
          </div>
        </div>
        <div className="relative z-10">
          <div className="w-12 h-1 bg-[#C0392B] rounded mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: "'Georgia', serif" }}>
            Mot de passe oublié ?<br />
            <span className="text-[#E67E22]">Pas de panique.</span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe en quelques secondes.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { num: "1", label: "Entrez votre email" },
              { num: "2", label: "Vérifiez votre boîte mail" },
              { num: "3", label: "Créez un nouveau mot de passe" },
            ].map(({ num, label }) => (
              <div key={num} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#C0392B]/10 border border-[#C0392B]/20 flex items-center justify-center text-[#E67E22] text-sm font-bold flex-shrink-0">
                  {num}
                </div>
                <span className="text-gray-600 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit – mode clair */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#C0392B] rounded-xl flex items-center justify-center">
              <ChefHat size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-gray-800">Le Dakarois</span>
          </div>

          {step === "email" ? (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm mb-8 transition-colors">
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>

              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#C0392B]/10 border border-[#C0392B]/20 flex items-center justify-center mb-5">
                  <Mail size={24} className="text-[#C0392B]" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                  Réinitialiser<br />le mot de passe
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Entrez l'email associé à votre compte. Nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-2">Adresse email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError("") }}
                      placeholder="votre@email.com"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-gray-700 placeholder:text-gray-300 text-sm focus:outline-none focus:border-[#C0392B]/60 focus:ring-1 focus:ring-[#C0392B]/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C0392B] hover:bg-[#A93226] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 text-sm mt-6">
                Vous vous souvenez ?{" "}
                <Link to="/login" className="text-[#C0392B] hover:text-[#E67E22] font-semibold transition-colors">
                  Se connecter
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3" style={{ fontFamily: "'Georgia', serif" }}>
                Email envoyé !
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-2">
                Un lien de réinitialisation a été envoyé à
              </p>
              <p className="text-[#E67E22] font-semibold mb-8">{email}</p>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-left mb-8">
                <p className="text-gray-500 text-xs leading-relaxed">
                  Si vous ne trouvez pas l'email, vérifiez votre dossier <span className="text-gray-700">spam</span> ou{" "}
                  <button
                    onClick={() => setStep("email")}
                    className="text-[#C0392B] hover:text-[#E67E22] transition-colors font-medium"
                  >
                    réessayez avec un autre email
                  </button>.
                </p>
              </div>

              <Link
                to="/login"
                className="w-full block bg-[#C0392B] hover:bg-[#A93226] text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02] text-center"
              >
                Retour à la connexion
              </Link>

              <Link to="/" className="block text-center text-gray-400 hover:text-gray-500 text-xs mt-4 transition-colors">
                ← Retour à l'accueil
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}