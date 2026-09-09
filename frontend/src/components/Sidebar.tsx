import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, WalletIcon, FlaskConical } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/wallet', label: 'Wallet', icon: WalletIcon },
  { to: '/test-lab', label: 'Test Lab', icon: FlaskConical },
]

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-surface-border md:bg-white md:shrink-0">
        <div className="px-6 py-6">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-semibold tracking-tight text-ink-900">
              Ledger
            </span>
            <span className="text-xs text-ink-300 font-mono">v1</span>
          </div>
          <p className="mt-0.5 text-xs text-ink-500">Wallet event processor</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ledger-tint text-ledger'
                    : 'text-ink-500 hover:bg-surface-sunken hover:text-ink-900'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs text-ink-300 border-t border-surface-border">
          H2 in-memory · demo data
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-surface-border bg-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-base font-semibold tracking-tight text-ink-900">
            Ledger
          </span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 flex border-t border-surface-border bg-white">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                isActive ? 'text-ledger' : 'text-ink-500'
              }`
            }
          >
            <Icon size={19} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
