import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Droplet,
  LayoutDashboard,
  Leaf,
  List,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Target,
} from 'lucide-react';
import { CommandToast } from './components/CommandToast.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { StatusPills } from './components/StatusPills.tsx';
import { ZoneMenu } from './components/ZoneMenu.tsx';
import { useStore } from './lib/store.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { LogView } from './views/LogView.tsx';
import { SetpointView } from './views/SetpointView.tsx';

const NAV_ITEMS = [
  { to: '/', label: 'Ringkasan', icon: LayoutDashboard, end: true },
  { to: '/setpoint', label: 'Fase & Setpoint', icon: Target, end: false },
  { to: '/log', label: 'Log Sensor', icon: List, end: false },
];

export function App() {
  const {
    session,
    isAdmin,
    zoneId,
    zoneName,
    theme,
    toggleTheme,
    refresh,
    refreshSpin,
    logout,
    setLoginOpen,
    setZoneMenuOpen,
  } = useStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  const initial = (session?.email || 'T').charAt(0).toUpperCase();

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Ringkasan',
      '/setpoint': 'Fase & Setpoint',
      '/log': 'Log Sensor',
    };
    const title = titles[location.pathname];
    document.title = title ? `${title} · Tirtaweda` : 'Tirtaweda · Smart Greenhouse';
  }, [location.pathname]);

  useEffect(() => {
    const onDocClick = () => setUserMenuOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setLoginOpen(false);
      setZoneMenuOpen(false);
      setUserMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [setLoginOpen, setZoneMenuOpen]);

  function openUser() {
    if (!session) {
      setLoginOpen(true);
      return;
    }
    setUserMenuOpen((prev) => !prev);
  }

  function openZoneMenu() {
    setUserMenuOpen(false);
    setZoneMenuOpen(true);
  }

  return (
    <div className="min-h-screen lg:flex">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>

      {/* Desktop Sidebar Rail */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white dark:text-sidebar">
            <Droplet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Link to="/" className="block text-[15px] font-extrabold tracking-tight text-ink">
              TIRTAWEDA
            </Link>
            <p className="truncate text-[10.5px] font-semibold text-muted">Smart Greenhouse</p>
          </div>
        </div>

        <div className="px-4 pt-4">
          <p className="section-kicker mb-2 px-1">Zona Aktif</p>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-primary-line hover:bg-primary-soft/50"
            aria-label="Pilih unit greenhouse"
            onClick={openZoneMenu}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-primary ring-1 ring-line">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-ink">{zoneName}</span>
              <span className="num block truncate text-[10px] text-muted">{zoneId}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
          </button>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 px-3 py-5">
          <p className="section-kicker mb-2 px-2">Menu</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-2">
            <button
              className="btn flex-1 px-2.5 py-2 text-[11.5px]"
              type="button"
              disabled={refreshSpin}
              aria-busy={refreshSpin}
              onClick={() => void refresh()}
            >
              {refreshSpin ? (
                <span className="spinner h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
              )}
              Muat ulang
            </button>
            <button
              className="btn-icon"
              type="button"
              title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left transition-colors hover:border-line-strong"
              aria-expanded={userMenuOpen}
              onClick={openUser}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-extrabold text-primary-dark ring-1 ring-primary-line">
                {session ? initial : 'T'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-ink">
                  {session ? session.email : 'Mode Tamu'}
                </span>
                <span className="block text-[10px] text-muted">
                  {session ? (isAdmin ? 'Admin · Kontrol aktif' : 'Hanya lihat') : 'Klik untuk login admin'}
                </span>
              </span>
            </button>

            {userMenuOpen && session && (
              <div className="card absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden p-1 shadow-float">
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-semibold text-danger hover:bg-danger-soft"
                  type="button"
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" /> Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md lg:hidden">
          <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-white dark:text-sidebar">
                <Droplet className="h-4 w-4" />
              </span>
              <span className="text-[14px] font-extrabold tracking-tight text-ink">TIRTAWEDA</span>
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                className="inline-flex max-w-[140px] items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-[11.5px] font-bold text-ink sm:max-w-[200px]"
                aria-label="Pilih unit greenhouse"
                onClick={openZoneMenu}
              >
                <span className="truncate">{zoneName}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
              </button>
              <button
                className="btn-icon"
                type="button"
                title="Muat ulang semua data"
                aria-label="Muat ulang semua data"
                disabled={refreshSpin}
                aria-busy={refreshSpin}
                onClick={() => void refresh()}
              >
                {refreshSpin ? (
                  <span className="spinner" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
              <button
                className="btn-icon"
                type="button"
                title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
                aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-[12px] font-extrabold text-primary-dark ring-1 ring-primary-line"
                  type="button"
                  aria-label={session ? 'Menu akun' : 'Login admin'}
                  aria-expanded={userMenuOpen}
                  onClick={openUser}
                >
                  {session ? initial : 'T'}
                </button>
                {userMenuOpen && session && (
                  <div className="card absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden p-1 shadow-float">
                    <div className="border-b border-line px-3 py-2.5">
                      <p className="truncate text-[11.5px] font-bold text-ink">{session.email}</p>
                      <p className="text-[10px] text-muted">{isAdmin ? 'Admin' : 'Tamu'}</p>
                    </div>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-semibold text-danger hover:bg-danger-soft"
                      type="button"
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="hidden items-center justify-between border-b border-line bg-surface/60 px-8 py-3 backdrop-blur-sm lg:flex">
          <StatusPills />
          <p className="text-[11px] font-medium text-muted">
            Telemetry Firebase RTDB · Pembaruan otomatis
          </p>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10"
        >
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/setpoint" element={<SetpointView />} />
            <Route path="/log" element={<LogView />} />
            <Route path="*" element={<DashboardView />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <LoginModal />
      <ZoneMenu />
      <CommandToast />
    </div>
  );
}
