import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import ClientOrderPage from './pages/ClientOrderPage.tsx'
import ConsignesPage from './pages/ConsignesPage.tsx'
import ConfigPage from './pages/ConfigPage.tsx'
import OwnerPage from './pages/OwnerPage.tsx'
import AnalyticsPage from './pages/AnalyticsPage.tsx'
import { AppDataProvider } from './store.tsx'
import { AdminProvider, useAdmin } from './contexts/AdminContext.tsx'
import { getUserDisplayName } from './utils/user.ts'

const navLinks = [
  { to: '/', label: 'Commander' },
  { to: '/consignes', label: 'Consignes' },
  { to: '/config', label: 'Carte & Tarifs' },
  { to: '/owner', label: 'Tracking' },
]

import logoImage from '../Logo_Faharetana.png'

type AuthMode = 'login' | 'signup'

type ProfileFormState = {
  displayName: string
  phone: string
  company: string
  deliveryLocation: string
}

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type PanelFeedback =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

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
  const {
    user,
    authError,
    isAuthLoading,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
  } = useAdmin()
  const isLoggedIn = Boolean(user)
  const displayName = getUserDisplayName(user) || 'Utilisateur connecte'
  const profileDefaults = useMemo<ProfileFormState>(() => {
    const display =
      (user?.user_metadata?.display_name as string | undefined)?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim() ||
      user?.email ||
      ''
    const phone =
      (user?.user_metadata?.phone as string | undefined)?.trim() ||
      (user?.phone ?? '')
    const company =
      (user?.user_metadata?.company as string | undefined)?.trim() || ''
    const deliveryLocation =
      (user?.user_metadata?.delivery_location as string | undefined)?.trim() ||
      'AerialMetric'
    return {
      displayName: display,
      phone,
      company,
      deliveryLocation,
    }
  }, [user])
  const createEmptyPasswordState = (): PasswordFormState => ({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showForm, setShowForm] = useState(false)
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [formValues, setFormValues] = useState<AuthFormValues>(
    createInitialAuthFormValues,
  )
  const [profileForm, setProfileForm] = useState<ProfileFormState>(
    profileDefaults,
  )
  const [passwordForm, setPasswordForm] =
    useState<PasswordFormState>(createEmptyPasswordState)
  const [localMessage, setLocalMessage] = useState<string | null>(null)
  const [profileFeedback, setProfileFeedback] = useState<PanelFeedback>(null)
  const [passwordFeedback, setPasswordFeedback] =
    useState<PanelFeedback>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      setShowForm(false)
      setAuthMode('login')
      setFormValues(createInitialAuthFormValues())
      setLocalMessage(null)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setShowProfilePanel(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    setProfileForm(profileDefaults)
  }, [profileDefaults])

  useEffect(() => {
    setLocalMessage(null)
  }, [authMode, authError])

  useEffect(() => {
    if (!showProfilePanel) {
      setProfileFeedback(null)
      setPasswordFeedback(null)
      setPasswordForm(createEmptyPasswordState())
    }
  }, [showProfilePanel])

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

  const handleProfileToggle = () => {
    const next = !showProfilePanel
    setShowProfilePanel(next)
    if (next) {
      setProfileForm(profileDefaults)
    }
  }

  const handleProfileInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.currentTarget
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.currentTarget
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileFeedback(null)
    const trimmedDisplayName = profileForm.displayName.trim()
    const trimmedPhone = profileForm.phone.trim()
    const trimmedCompany = profileForm.company.trim()
    const trimmedDeliveryLocation = profileForm.deliveryLocation.trim()

    if (!trimmedDisplayName) {
      setProfileFeedback({
        type: 'error',
        message: "Le nom d'usage est obligatoire.",
      })
      return
    }
    if (!trimmedPhone) {
      setProfileFeedback({
        type: 'error',
        message: 'Le contact est obligatoire.',
      })
      return
    }
    if (!trimmedDeliveryLocation) {
      setProfileFeedback({
        type: 'error',
        message: 'Le lieu de livraison est obligatoire.',
      })
      return
    }

    try {
      setProfileSaving(true)
      await updateProfile({
        displayName: trimmedDisplayName,
        phone: trimmedPhone,
        company: trimmedCompany,
        deliveryLocation: trimmedDeliveryLocation,
      })
      setProfileFeedback({
        type: 'success',
        message: 'Profil mis a jour.',
      })
      setProfileForm({
        displayName: trimmedDisplayName,
        phone: trimmedPhone,
        company: trimmedCompany,
        deliveryLocation: trimmedDeliveryLocation,
      })
    } catch (error) {
      setProfileFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de mettre a jour le profil.',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordFeedback(null)

    if (!passwordForm.currentPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Veuillez saisir votre mot de passe actuel.',
      })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: 'Le nouveau mot de passe doit comporter au moins 6 caracteres.',
      })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Les nouveaux mots de passe ne correspondent pas.',
      })
      return
    }

    try {
      setPasswordSaving(true)
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordFeedback({
        type: 'success',
        message: 'Mot de passe mis a jour.',
      })
      setPasswordForm(createEmptyPasswordState())
    } catch (error) {
      setPasswordFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de mettre a jour le mot de passe.',
      })
    } finally {
      setPasswordSaving(false)
    }
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
        <button
          type="button"
          className="auth-user-email profile-trigger"
          onClick={handleProfileToggle}
        >
          {displayName}
        </button>
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
        {showProfilePanel && (
          <div className="profile-panel card">
            <div className="profile-panel-header">
              <div>
                <p className="eyebrow">Mon compte</p>
                <h3>{displayName}</h3>
                {user?.email && <p className="muted">{user.email}</p>}
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowProfilePanel(false)}
              >
                Fermer
              </button>
            </div>

            <div className="profile-panel-section">
              <h4>Informations</h4>
              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <label className="form-field">
                  <span>Nom d'usage</span>
                  <input
                    type="text"
                    name="displayName"
                    value={profileForm.displayName}
                    onChange={handleProfileInputChange}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    disabled
                  />
                </label>
                <label className="form-field">
                  <span>Contact</span>
                  <input
                    type="text"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileInputChange}
                    placeholder="034 xx xxx xx"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Societe</span>
                  <input
                    type="text"
                    name="company"
                    value={profileForm.company}
                    onChange={handleProfileInputChange}
                    placeholder="Facultatif"
                  />
                </label>
                <label className="form-field">
                  <span>Site de livraison</span>
                  <select
                    name="deliveryLocation"
                    value={profileForm.deliveryLocation}
                    onChange={handleProfileInputChange}
                    required
                  >
                    <option value="AerialMetric">AerialMetric</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
              {profileFeedback && (
                <p className={`feedback ${profileFeedback.type}`}>
                  {profileFeedback.message}
                </p>
              )}
            </div>

            <div className="profile-panel-section">
              <h4>Mot de passe</h4>
              <form className="profile-form" onSubmit={handlePasswordSubmit}>
                <label className="form-field">
                  <span>Mot de passe actuel</span>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Nouveau mot de passe</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Confirmer le nouveau mot de passe</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordInputChange}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? 'Mise a jour...' : 'Mettre a jour'}
                </button>
              </form>
              {passwordFeedback && (
                <p className={`feedback ${passwordFeedback.type}`}>
                  {passwordFeedback.message}
                </p>
              )}
            </div>
          </div>
        )}
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
  const { isAdmin } = useAdmin()
  const visibleNavLinks = useMemo(
    () => {
      const baseLinks = [...navLinks]
      if (isAdmin) {
        baseLinks.push({ to: '/analytics', label: 'Analytics' })
      }
      return baseLinks
    },
    [isAdmin],
  )
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
            {visibleNavLinks.map((link) => (
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
          <Route
            path="/analytics"
            element={
              <AdminRoute>
                <AnalyticsPage />
              </AdminRoute>
            }
          />
          <Route path="/owner" element={<OwnerPage />} />
          <Route path="*" element={<ClientOrderPage />} />
        </Routes>
      </main>
    </div>
  )
}

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { isAdmin, isAuthLoading } = useAdmin()
  if (isAuthLoading) {
    return <div className="empty-state">Chargement administrateur...</div>
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
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

