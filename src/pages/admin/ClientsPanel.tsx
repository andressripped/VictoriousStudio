import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { MessageCircle, ShieldX, Check } from 'lucide-react';

export default function ClientsPanel() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingReservas, setLoadingReservas] = useState(true);

  useEffect(() => {
    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClientes(data);
      setLoadingClientes(false);
    });

    const unsubReservas = onSnapshot(collection(db, 'reservas'), (snapshot) => {
      const rData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReservas(rData);
      setLoadingReservas(false);
    });

    return () => {
      unsubClientes();
      unsubReservas();
    };
  }, []);

  const handleResetStrikes = async (id: string) => {
    if (confirm('¿Quieres resetear los strikes y desbloquear a este cliente?')) {
      await updateDoc(doc(db, 'clientes', id), {
        strikes: 0,
        isBlocked: false
      });
    }
  };

  const handleBloquearUsuario = async (id: string, isCurrentlyBlocked: boolean) => {
    const action = isCurrentlyBlocked ? 'desbloquear' : 'bloquear de forma permanente';
    if (confirm(`¿Estás seguro de que quieres ${action} a este cliente?`)) {
      await updateDoc(doc(db, 'clientes', id), {
        isBlocked: !isCurrentlyBlocked
      });
    }
  };

  const getClientStats = (clienteId: string) => {
    const clientReservas = reservas.filter(r => r.clienteId === clienteId);
    const completadas = clientReservas.filter(r => r.estado === 'completada');
    
    const totalCitas = clientReservas.length;
    const citasCumplidas = completadas.length;
    const dineroGastado = completadas.reduce((sum, r) => sum + (Number(r.precio) || 0), 0);

    return { totalCitas, citasCumplidas, dineroGastado };
  };

  // Ensure both collections are loaded before showing the UI
  if (loadingClientes || loadingReservas) return <div className="p-10 text-center animate-pulse">Cargando datos del CRM...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold">Base de Datos de Clientes</h2>
          <p className="text-text-muted">Gestiona el historial, actividad y seguridad de tus clientes registrados.</p>
        </div>
      </div>

      <div className="bg-bg-card rounded-xl border border-border-strong overflow-hidden shadow-lg overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-bg-tertiary border-b border-border-strong">
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted">Cliente / Contacto</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center">Actividad</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center">Ingresos</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center">Strikes</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center">Estado</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => {
              const stats = getClientStats(c.id);
              return (
                <tr key={c.id} className="border-b border-border-subtle hover:bg-bg-tertiary/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center font-bold border-2 flex-shrink-0 ${c.isBlocked ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-accent-primary bg-bg-secondary'}`}>
                        {c.nombre?.charAt(0) || '?'}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-bold">{c.nombre} {c.apellido || ''}</p>
                        <p className="text-xs text-text-muted mb-0.5">{c.email}</p>
                        <a 
                          href={`https://wa.me/57${c.telefono?.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-accent-success font-bold flex items-center gap-1 hover:underline w-fit"
                        >
                          <MessageCircle size={12} /> {c.telefono}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold">{stats.totalCitas} <span className="text-xs text-text-muted font-normal">hechas</span></span>
                      <span className="text-xs text-accent-success font-bold">{stats.citasCumplidas} <span className="font-normal text-text-muted">cumplidas</span></span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-accent-primary">${stats.dineroGastado.toLocaleString('es-CO')}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${c.strikes >= 3 ? 'bg-red-500 text-white' : c.strikes > 0 ? 'bg-accent-warning/20 text-accent-warning' : 'text-text-muted'}`}>
                      {c.strikes || 0} / 3
                    </span>
                  </td>
                  <td className="p-4 text-center">
                     {c.isBlocked ? (
                       <span className="flex items-center justify-center gap-1 text-red-500 text-xs font-bold uppercase tracking-tighter">
                         <ShieldX size={14} /> Bloqueado
                       </span>
                     ) : (
                       <span className="flex items-center justify-center gap-1 text-accent-success text-xs font-bold uppercase tracking-tighter">
                         <Check size={14} /> Activo
                       </span>
                     )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {(c.strikes > 0 || c.isBlocked) && (
                        <button 
                          onClick={() => handleResetStrikes(c.id)}
                          className="text-xs px-3 py-1.5 border border-border-strong rounded hover:bg-bg-secondary text-text-muted hover:text-accent-primary transition-all"
                        >
                          Perdonar Strikes
                        </button>
                      )}
                      <button 
                        onClick={() => handleBloquearUsuario(c.id, c.isBlocked)}
                        className={`text-xs px-3 py-1.5 border border-border-strong rounded transition-all ${
                          c.isBlocked 
                            ? 'hover:bg-accent-success hover:border-accent-success hover:text-bg-primary text-accent-success' 
                            : 'hover:bg-red-500 hover:border-red-500 hover:text-white text-red-500'
                        }`}
                      >
                        {c.isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-muted italic">No hay clientes registrados en la base de datos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
