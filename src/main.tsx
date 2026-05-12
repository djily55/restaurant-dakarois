// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ⚠️ TEMPORAIRE : décommentez les 2 lignes ci-dessous pour peupler la base (admin + menu)
// import { seedFirestore } from './utils/seedFirestore'
// seedFirestore()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)