// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { CartProvider } from "./context/CartContext"  // ← ajout

// Pages publiques
import LandingPage from "./pages/Landing/LandingPage"
import MenuPage from "./pages/Menu/MenuPage"
import ReservationPage from "./pages/Reservation/ReservationPage"
import CommandePage from "./pages/Commande/CommandePage"
import MesCommandesPage from "./pages/Commande/MesCommandesPage"

// Auth
import Login from "./pages/Auth/Login"
import Register from "./pages/Auth/Register"
import ResetPassword from "./pages/Auth/ResetPassword"

// Dashboard admin
import DashboardLayout from "./pages/Dashboard/DashboardLayout"
import Overview from "./pages/Dashboard/Overview"
import Orders from "./pages/Dashboard/Orders"
import Menu from "./pages/Dashboard/Menu"
import Reservations from "./pages/Dashboard/Reservations"
import Clients from "./pages/Dashboard/Clients"
import Profile from "./pages/Dashboard/Profile"

// Route protégée
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

// Route admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (user?.role === "client") return <Navigate to="/" />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/reservation" element={<ReservationPage />} />
      <Route path="/commande" element={<CommandePage />} />
      <Route path="/mes-commandes" element={
        <ProtectedRoute>
          <MesCommandesPage />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={
        <AdminRoute>
          <DashboardLayout />
        </AdminRoute>
      }>
        <Route index element={<Overview />} />
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<Menu />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="clients" element={<Clients />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>   {/* ← Ajout du provider de panier */}
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App