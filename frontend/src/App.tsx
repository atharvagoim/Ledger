import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { WalletPage } from './pages/WalletPage'
import { TestLab } from './pages/TestLab'
import { AppProvider } from './context/AppContext'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8">
            <div className="mx-auto max-w-5xl">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/test-lab" element={<TestLab />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
