// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (user?.role === "client") return <Navigate to="/" />
  return <>{children}</>
}