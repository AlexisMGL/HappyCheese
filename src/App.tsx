import { NavLink, Route, Routes } from 'react-router-dom'
import ClientOrderPage from './pages/ClientOrderPage.tsx'
import ConfigPage from './pages/ConfigPage.tsx'
import OwnerPage from './pages/OwnerPage.tsx'
import { AppDataProvider } from './store.tsx'

const navLinks = [
  { to: '/', label: 'Commander' },
  { to: '/config', label: 'Carte & Tarifs' },
  { to: '/owner', label: 'Suivi des commandes' },
]

function App() {
  return (
    <AppDataProvider>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Happy Cheese</p>
            <h1>Laiterie Faharetana</h1>
          </div>
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
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<ClientOrderPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/owner" element={<OwnerPage />} />
            <Route path="*" element={<ClientOrderPage />} />
          </Routes>
        </main>
      </div>
    </AppDataProvider>
  )
}

export default App
