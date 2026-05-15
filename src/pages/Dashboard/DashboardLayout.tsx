import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { ChefHat, LayoutDashboard, ShoppingBag, UtensilsCrossed, User, LogOut, CalendarCheck, Users } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Vue générale", end: true },
  { to: "/dashboard/orders", icon: ShoppingBag, label: "Commandes" },
  { to: "/dashboard/reservations", icon: CalendarCheck, label: "Réservations" },
  { to: "/dashboard/menu", icon: UtensilsCrossed, label: "Menu" },
  { to: "/dashboard/clients", icon: Users, label: "Clients" },   // ← AJOUTÉ
  { to: "/dashboard/profile", icon: User, label: "Profil" },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#C0392B] rounded-xl flex items-center justify-center">
              <ChefHat size={18} className="text-white" />
            </div>
            <div>
              <div className="text-gray-800 font-bold text-sm">Le Dakarois</div>
              <div className="text-[#E67E22] text-[10px] uppercase tracking-widest">Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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

      <main className="ml-64 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}