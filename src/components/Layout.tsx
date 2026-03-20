import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Sun, Moon, UserCircle, LogOut, LayoutDashboard, Calendar as CalendarIcon, UserCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import LoginModal from './LoginModal';

const Header = () => {
  const { theme, toggleTheme, user, userRole, setLoginModalOpen } = useStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Ref para detectar clics fuera del menú
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    // Pequeño delay para evitar que el click que abre el menú lo cierre inmediatamente
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-bg-secondary/80 backdrop-blur-md border-b border-border-subtle shadow-sm" role="banner">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="text-xl md:text-2xl font-display font-bold tracking-tight text-text-primary group" aria-label="Victorious Studio — Ir al inicio">
          Victorious<span className="text-accent-primary italic font-normal group-hover:text-accent-primary-hover transition-colors">Studio</span>
        </Link>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme} 
            className="p-2 text-accent-primary hover:bg-bg-tertiary rounded-full transition-colors border border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:scale-95"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {!user ? (
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-bg-primary font-bold px-4 md:px-5 py-2 rounded-lg transition-all uppercase tracking-widest text-xs shadow-lg shadow-accent-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              aria-label="Abrir formulario de inicio de sesión"
            >
              <UserCircle size={18} />
              <span className="hidden sm:inline">Acceso VIP</span>
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menú de usuario"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                className="w-10 h-10 rounded-full bg-accent-primary text-bg-primary font-bold flex items-center justify-center hover:opacity-90 transition-opacity border-2 border-bg-primary ring-2 ring-accent-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                {user.email?.charAt(0).toUpperCase() || 'V'}
              </button>
              
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200"
                  role="menu"
                  aria-label="Opciones de cuenta"
                >
                  <div className="px-4 py-2 border-b border-border-subtle mb-1">
                    <p className="text-sm font-bold truncate text-text-primary">{user.email}</p>
                    <p className="text-xs text-accent-primary capitalize font-bold tracking-wide mt-0.5">{userRole || 'Cliente'}</p>
                  </div>
                  
                  {userRole === 'superadmin' && (
                    <>
                      <button 
                        onClick={() => { navigate('/admin'); setMenuOpen(false); }} 
                        className="w-full text-left px-4 py-3 text-sm hover:bg-bg-tertiary flex items-center gap-3 transition-colors"
                        role="menuitem"
                      >
                        <LayoutDashboard size={16} className="text-accent-primary" />
                        <span>Panel SuperAdmin</span>
                      </button>
                      <button 
                        onClick={() => { navigate('/barber'); setMenuOpen(false); }} 
                        className="w-full text-left px-4 py-2 text-sm hover:bg-bg-tertiary flex items-center gap-3 transition-colors"
                        role="menuitem"
                      >
                        <UserCheck size={16} className="text-accent-primary" />
                        <span>Gestión Barberos</span>
                      </button>
                    </>
                  )}
                  
                  {userRole === 'barber' && (
                    <button 
                      onClick={() => { navigate('/barber'); setMenuOpen(false); }} 
                      className="w-full text-left px-4 py-3 text-sm hover:bg-bg-tertiary flex items-center gap-3 transition-colors"
                      role="menuitem"
                    >
                      <CalendarIcon size={16} className="text-accent-primary" />
                      <span>Mi Agenda</span>
                    </button>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-accent-error hover:bg-bg-tertiary flex items-center gap-3 mt-1 border-t border-border-subtle transition-colors"
                    role="menuitem"
                  >
                    <LogOut size={16} /> 
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary font-body">
      <Header />
      <main className="flex-1" role="main">
        <Outlet />
      </main>
      <LoginModal />
    </div>
  );
}
