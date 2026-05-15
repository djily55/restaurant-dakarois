// src/layouts/DashboardLayout.tsx
import { useState, useEffect } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { Menu, X, ChefHat, LayoutDashboard, ShoppingBag, UtensilsCrossed, User, LogOut, CalendarCheck, Users } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Vue générale", end: true },
  { to: "/dashboard/orders", icon: ShoppingBag, label: "Commandes" },
  { to: "/dashboard/reservations", icon: CalendarCheck, label: "Réservations" },
  { to: "/dashboard/menu", icon: UtensilsCrossed, label: "Menu" },
  { to: "/dashboard/clients", icon: Users, label: "Clients" },
  { to: "/dashboard/profile", icon: User, label: "Profil" },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Fermer la sidebar automatiquement sur desktop (>= 1024px) si elle était ouverte
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isSidebarOpen])

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev)
  const closeSidebar = () => setIsSidebarOpen(false)

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Bouton hamburger (mobile uniquement) */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow"
          aria-label="Menu"
        >
          <Menu size={20} className="text-gray-700" />
        </button>
      </div>

      {/* Sidebar (transform sur mobile, statique sur desktop) */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl z-40
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:shadow-none
        `}
      >
        {/* En-tête avec bouton fermeture (mobile) */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#C0392B] rounded-xl flex items-center justify-center">
              <ChefHat size={18} className="text-white" />
            </div>
            <div>
              <div className="text-gray-800 font-bold text-sm">Le Dakarois</div>
              <div className="text-[#E67E22] text-[10px] uppercase tracking-widest">Dashboard</div>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar} // ferme la sidebar sur mobile après clic
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/20"
                    : "text-gray-600 hover:text-[#C0392B] hover:bg-[#C0392B]/5"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer avec utilisateur + déconnexion */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#C0392B] flex items-center justify-center text-white text-xs font-bold">
              {user?.nom?.charAt(0) ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-800 text-sm font-medium truncate">{user?.nom}</div>
              <div className="text-gray-500 text-xs truncate">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Overlay (mobile seulement) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Contenu principal */}
      <main className="lg:ml-64 transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}