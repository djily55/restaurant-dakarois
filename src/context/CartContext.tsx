// src/context/CartContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./AuthContext"

export interface CartItem {
  id: string
  nom: string
  prix: number
  quantite: number
  image: string
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, "quantite">) => void
  updateQty: (id: string, delta: number) => void
  removeItem: (id: string) => void
  clearCart: () => void
  cartCount: number
  cartTotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// ── Helpers localStorage sécurisés ───────────────────────────────────────────
const getStorage = (key: string): CartItem[] => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const setStorage = (key: string, value: CartItem[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const removeStorage = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth() // ← on récupère loading
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartReady, setCartReady] = useState(false)

  // ── Charger le panier SEULEMENT quand l'auth est prête ───────────────────
  useEffect(() => {
    if (loading) return // ← attendre que Firebase ait fini de charger l'user

    if (user?.id) {
      const userKey = `cart_${user.id}`
      const savedUserCart = getStorage(userKey)
      const guestCart = getStorage("cart_guest")

      if (guestCart.length > 0) {
        // Fusionner panier invité avec panier utilisateur
        const merged = [...savedUserCart]
        guestCart.forEach((guestItem) => {
          const existing = merged.find((i) => i.id === guestItem.id)
          if (existing) {
            existing.quantite += guestItem.quantite
          } else {
            merged.push(guestItem)
          }
        })
        setCart(merged)
        setStorage(userKey, merged)
        removeStorage("cart_guest")
      } else {
        // Charger panier utilisateur existant
        setCart(savedUserCart)
      }
    } else {
      // Non connecté → panier invité
      setCart(getStorage("cart_guest"))
    }

    setCartReady(true)
  }, [user?.id, loading]) // ← dépend de loading aussi

  // ── Sauvegarder à chaque modification (seulement si panier prêt) ─────────
  useEffect(() => {
    if (!cartReady) return // ← ne pas écraser avant le chargement initial
    const key = user?.id ? `cart_${user.id}` : "cart_guest"
    setStorage(key, cart)
  }, [cart, user?.id, cartReady])

  // ── Actions ───────────────────────────────────────────────────────────────
  const addToCart = (item: Omit<CartItem, "quantite">) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantite: i.quantite + 1 } : i
        )
      }
      return [...prev, { ...item, quantite: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantite: Math.max(0, i.quantite + delta) } : i))
        .filter((i) => i.quantite > 0)
    )
  }

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id))
  }

  const clearCart = () => {
    setCart([])
    const key = user?.id ? `cart_${user.id}` : "cart_guest"
    removeStorage(key)
  }

  const cartCount = cart.reduce((s, i) => s + i.quantite, 0)
  const cartTotal = cart.reduce((s, i) => s + i.prix * i.quantite, 0)

  return (
    <CartContext.Provider
      value={{ cart, addToCart, updateQty, removeItem, clearCart, cartCount, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}