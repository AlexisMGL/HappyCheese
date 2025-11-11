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

const AppLayout = () => {
  const { isAdmin, setAdmin } = useAdmin()

  const handleAdminToggle = () => {
    if (isAdmin) {
      setAdmin(false)
      return
    }
    const password = window.prompt('Mot de passe administrateur ?')
    if (password === null) {
      return
    }
    if (password === 'TialoveCheese') {
      setAdmin(true)
    } else {
      window.alert('Mot de passe incorrect.')
    }
  }

  const adminClasses = `admin-toggle ${
    isAdmin ? 'is-admin' : 'non-admin'
  }`

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
          <button
            type="button"
            className={adminClasses}
            onClick={handleAdminToggle}
            aria-pressed={isAdmin}
          >
            {isAdmin ? 'admin' : 'non admin'}
          </button>
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
