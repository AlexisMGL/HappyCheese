import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import ClientOrderPage from './pages/ClientOrderPage.tsx'
import ConsignesPage from './pages/ConsignesPage.tsx'
import ConfigPage from './pages/ConfigPage.tsx'
import OwnerPage from './pages/OwnerPage.tsx'
import { AppDataProvider } from './store.tsx'
import { AdminProvider, useAdmin } from './contexts/AdminContext.tsx'
import { getUserDisplayName } from './utils/user.ts'

const navLinks = [
  { to: '/', label: 'Commander' },
  { to: '/consignes', label: 'Consignes' },
  { to: '/config', label: 'Carte & Tarifs' },
  { to: '/owner', label: 'Suivi des commandes' },
]

import logoImage from '../Logo_Faharetana.png'

type AuthMode = 'login' | 'signup'

type AuthFormValues = {
  email: string
  displayName: string
  phone: string
  company: string
  deliveryLocation: string
  password: string
  confirmPassword: string
}

const createInitialAuthFormValues = (): AuthFormValues => ({
  email: '',
  displayName: '',
  phone: '',
  company: '',
  deliveryLocation: 'AerialMetric',
  password: '',
  confirmPassword: '',
})

const AdminAuthControl = () => {
  const { user, authError, isAuthLoading, login, signup, logout } = useAdmin()
  const isLoggedIn = Boolean(user)
  const displayName = getUserDisplayName(user) || 'Utilisateur connecte'
  const [showForm, setShowForm] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [formValues, setFormValues] = useState<AuthFormValues>(
    createInitialAuthFormValues,
  )
  const [localMessage, setLocalMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isLoggedIn) {
      setShowForm(false)
      setAuthMode('login')
      setFormValues(createInitialAuthFormValues())
      setLocalMessage(null)
    }
  }, [isLoggedIn])

  useEffect(() => {
    setLocalMessage(null)
  }, [authMode, authError])

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.currentTarget
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setFormValues((prev) => ({
      ...prev,
      password: '',
      confirmPassword: '',
    }))
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.email || !formValues.password) {
      return
    }
    if (
      authMode === 'signup' &&
      formValues.password !== formValues.confirmPassword
    ) {
      setLocalMessage('Les mots de passe ne correspondent pas.')
      return
    }
    try {
      if (authMode === 'login') {
        await login(formValues.email, formValues.password)
      } else {
        const trimmedDisplayName = formValues.displayName.trim()
        const trimmedPhone = formValues.phone.trim()
        const trimmedCompany = formValues.company.trim()
        const trimmedDeliveryLocation = formValues.deliveryLocation.trim()

        if (!trimmedDisplayName) {
          setLocalMessage("Le nom d'usage est obligatoire.")
          return
        }
        if (!trimmedPhone) {
          setLocalMessage('Le telephone est obligatoire.')
          return
        }
        if (!trimmedDeliveryLocation) {
          setLocalMessage('Le lieu de livraison est obligatoire.')
          return
        }
        await signup({
          email: formValues.email,
          password: formValues.password,
          displayName: trimmedDisplayName,
          phone: trimmedPhone,
          company: trimmedCompany || undefined,
          deliveryLocation: trimmedDeliveryLocation,
        })
        setLocalMessage('Compte cree. Vous pouvez vous connecter.')
        setFormValues((prev) => ({
          ...prev,
          password: '',
          confirmPassword: '',
        }))
      }
    } catch {
      // handled via authError
    }
  }

  if (isLoggedIn) {
    return (
      <div className="auth-panel is-connected">
        <span className="auth-user-email">{displayName}</span>
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
        {showForm ? 'Annuler' : 'Connexion'}
      </button>

      {showForm && (
        <>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={authMode === 'login' ? 'auth-tab is-active' : 'auth-tab'}
              aria-selected={authMode === 'login'}
              onClick={() => handleModeChange('login')}
              disabled={isAuthLoading && authMode === 'login'}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              className={authMode === 'signup' ? 'auth-tab is-active' : 'auth-tab'}
              aria-selected={authMode === 'signup'}
              onClick={() => handleModeChange('signup')}
              disabled={isAuthLoading && authMode === 'signup'}
            >
              Creer un compte
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
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
            {authMode === 'signup' && (
              <>
                <input
                  type="text"
                  name="displayName"
                  autoComplete="name"
                  placeholder="Nom d'usage"
                  value={formValues.displayName}
                  onChange={handleInputChange}
                  disabled={isAuthLoading}
                  required
                />
                <input
                  type="text"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Telephone"
                  value={formValues.phone}
                  onChange={handleInputChange}
                  disabled={isAuthLoading}
                  required
                />
                <input
                  type="text"
                  name="company"
                  autoComplete="organization"
                  placeholder="Societe (facultatif)"
                  value={formValues.company}
                  onChange={handleInputChange}
                  disabled={isAuthLoading}
                />
                <label htmlFor="deliveryLocationSelect">Site de livraison :</label>
                <select
                  id="deliveryLocationSelect"
                  name="deliveryLocation"
                  value={formValues.deliveryLocation}
                  onChange={handleInputChange}
                  disabled={isAuthLoading}
                  aria-label="Lieu de livraison"
                  title="Lieu de livraison"
                  required
                >
                  <option value="AerialMetric">AerialMetric</option>
                </select>
              </>
            )}
            <input
              type="password"
              name="password"
              autoComplete={
                authMode === 'signup' ? 'new-password' : 'current-password'
              }
              placeholder="Mot de passe"
              value={formValues.password}
              onChange={handleInputChange}
              disabled={isAuthLoading}
              required
            />
            {authMode === 'signup' && (
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                value={formValues.confirmPassword}
                onChange={handleInputChange}
                disabled={isAuthLoading}
                required
              />
            )}
            <button
              type="submit"
              className="admin-toggle is-admin"
              disabled={isAuthLoading}
            >
              {isAuthLoading
                ? authMode === 'login'
                  ? 'Connexion...'
                  : 'Creation...'
                : authMode === 'login'
                  ? 'Se connecter'
                  : 'Creer mon compte'}
            </button>
          </form>
        </>
      )}

      {(authError || localMessage) && (
        <p className={authError ? 'auth-error' : 'auth-helper'}>
          {authError ?? localMessage}
        </p>
      )}
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
