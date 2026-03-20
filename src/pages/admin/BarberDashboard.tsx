import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Menu, X, Calendar as CalendarIcon, Users } from 'lucide-react';
import AgendaPanel from './AgendaPanel';
import ClientsPanel from './ClientsPanel';

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [loadingBarber, setLoadingBarber] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'agenda' | 'clientes'>('agenda');

  // Intentar encontrar el ID del barbero en Firestore usando el email de Auth
  useEffect(() => {
    const findBarbero = async () => {
      if (!user?.email) return;
      try {
        const q = query(collection(db, 'barberos'), where('emailAuth', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setBarberId(snap.docs[0].id);
        }
      } catch (err) {
        console.error("Error identificando barbero:", err);
      } finally {
        setLoadingBarber(false);
      }
    };
    findBarbero();
  }, [user]);
  
  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden relative">
      {/* Overlay para móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Aside */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border-subtle flex flex-col transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-6 border-b border-border-strong flex items-center justify-between">
          <div className="font-display text-xl font-bold">
            Mi <span className="text-accent-primary">Panel</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-bg-tertiary rounded-full">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('agenda'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold transition-all ${
              activeTab === 'agenda' 
                ? 'bg-accent-primary/5 text-accent-primary shadow-sm border border-accent-primary/20 hover:bg-accent-primary/10' 
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <CalendarIcon size={18} />
            Mis Citas
          </button>
          <button 
            onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold transition-all ${
              activeTab === 'clientes' 
                ? 'bg-accent-primary/5 text-accent-primary shadow-sm border border-accent-primary/20 hover:bg-accent-primary/10' 
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <Users size={18} />
            Mis Clientes
          </button>
        </nav>
        <div className="p-6 border-t border-border-subtle">
          <button 
            onClick={() => navigate('/')}
            className="w-full py-2 border border-border-strong rounded hover:bg-bg-tertiary transition-colors text-sm"
          >
            ← Volver al Inicio
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl mb-1">Tu Agenda de Trabajo</h1>
            <p className="text-text-muted text-sm md:text-base">Gestiona tus citas y atiende a tus clientes.</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-3 bg-bg-secondary border border-border-strong rounded-lg shadow-sm text-accent-primary hover:bg-bg-tertiary transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {loadingBarber ? (
          <div className="p-12 text-center animate-pulse text-text-muted">Identificando tu perfil profesional...</div>
        ) : barberId ? (
          <>
            {activeTab === 'agenda' && <AgendaPanel filterBarberId={barberId} />}
            {activeTab === 'clientes' && <ClientsPanel />}
          </>
        ) : (
          <div className="border border-dashed border-red-500/30 bg-red-500/5 rounded-xl p-12 text-center text-text-muted max-w-2xl mx-auto shadow-inner">
             <h3 className="text-red-500 font-bold text-lg mb-2">Error de Perfil</h3>
             <p className="mb-4">No hemos podido vincular tu cuenta de usuario con un perfil de barbero registrado. Por favor, contacta con el administrador del sistema.</p>
             <span className="text-xs font-mono bg-bg-tertiary px-2 py-1 rounded">{user?.email}</span>
          </div>
        )}
      </main>
    </div>
  );
}
