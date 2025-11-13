import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import ClientOrderPage from './pages/ClientOrderPage.tsx'
import ClientsPage from './pages/ClientsPage.tsx'
import ConsignesPage from './pages/ConsignesPage.tsx'
import ConfigPage from './pages/ConfigPage.tsx'
import OwnerPage from './pages/OwnerPage.tsx'
import { AppDataProvider } from './store.tsx'
import { AdminProvider, useAdmin } from './contexts/AdminContext.tsx'

const navLinks = [
  { to: '/', label: 'Commander' },
  { to: '/clients', label: 'Clients' },
  { to: '/consignes', label: 'Consignes' },
  { to: '/config', label: 'Carte & Tarifs' },
  { to: '/owner', label: 'Suivi des commandes' },
]

import logoImage from '../Logo_Faharetana.png'

const AdminAuthControl = () => {
  const { isAdmin, user, authError, isAuthLoading, login, logout } = useAdmin()
  const [showForm, setShowForm] = useState(false)
  const [formValues, setFormValues] = useState({ email: '', password: '' })

  useEffect(() => {
    if (isAdmin) {
      setShowForm(false)
      setFormValues({ email: '', password: '' })
    }
  }, [isAdmin])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.email || !formValues.password) {
      return
    }
    try {
      await login(formValues.email, formValues.password)
    } catch {
      // handled via authError
    }
  }

  if (isAdmin) {
    return (
      <div className="auth-panel is-connected">
        <span className="auth-user-email">{user?.email}</span>
        <button
          type="button"
          className="admin-toggle is-admin"
          onClick={() => {
            void logout()
          }}
          disabled={isAuthLoading}
        >
          {isAuthLoading ? 'Deconnexion...' : 'Se deconnecter'}
        </button>
      </div>
    )
  }

  return (
    <div className="auth-panel">
      <button
        type="button"
        className="admin-toggle non-admin"
        onClick={() => setShowForm((prev) => !prev)}
        aria-expanded={showForm}
      >
        {showForm ? 'Annuler' : 'Connexion admin'}
      </button>

      {showForm && (
        <form className="auth-form" onSubmit={handleLoginSubmit}>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            value={formValues.email}
            onChange={handleInputChange}
            disabled={isAuthLoading}
            required
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Mot de passe"
            value={formValues.password}
            onChange={handleInputChange}
            disabled={isAuthLoading}
            required
          />
          <button
            type="submit"
            className="admin-toggle is-admin"
            disabled={isAuthLoading}
          >
            {isAuthLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      )}

      {authError && <p className="auth-error">{authError}</p>}
    </div>
  )
}

const AppLayout = () => {

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-title">
          <img
            src={logoImage}
            alt="Logo Laiterie Faharetana"
            className="brand-logo"
          />
          <div>
            <p className="eyebrow">MADACHEESE Plateform</p>
            <h1>Laiterie Faharetana</h1>
          </div>
        </div>
        <div className="admin-controls">
          <nav className="main-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'nav-link is-active' : 'nav-link'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <AdminAuthControl />
        </div>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<ClientOrderPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/consignes" element={<ConsignesPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/owner" element={<OwnerPage />} />
          <Route path="*" element={<ClientOrderPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AdminProvider>
      <AppDataProvider>
        <AppLayout />
      </AppDataProvider>
    </AdminProvider>
  )
}

export default App
