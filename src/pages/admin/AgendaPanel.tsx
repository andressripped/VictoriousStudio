import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, MessageCircle, X } from 'lucide-react';

// Math Constants for the Calendar Grid
const START_HOUR = 8; // 8 AM
const END_HOUR = 20; // 8 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const PIXELS_PER_MINUTE = 2; // 1 Hora = 120px de altura
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AgendaPanel({ filterBarberId }: { filterBarberId?: string }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [barberos, setBarberos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const { showToast } = useStore();
  const [selectedReserva, setSelectedReserva] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Escuchar barberos activos
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'barberos'), (snap) => {
      let docs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Si hay un filtro, solo mostramos ese barbero
      if (filterBarberId) {
        docs = docs.filter(b => b.id === filterBarberId);
      }

      setBarberos(docs.filter(b => b.activo !== false));
    });
    return () => unsub();
  }, [filterBarberId]);

  // Sincronizar reservas del día seleccionado en tiempo real
  useEffect(() => {
    const dateStr = getLocalDateString(selectedDate);
    const q = query(
      collection(db, 'reservas'),
      where('fecha', '==', dateStr)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setReservas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Error sincronizando agenda:", err);
    });

    return () => unsub();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleAction = async (action: 'completada' | 'no-show' | 'cancelada') => {
    if (!selectedReserva) return;
    setActionLoading(true);

    try {
      const resId = selectedReserva.id;
      const clientUid = selectedReserva.clienteUid;

      // Actualizar estado de la reserva
      await updateDoc(doc(db, 'reservas', resId), { estado: action });

      // Lógica de Strikes (No-Show)
      if (action === 'no-show' && clientUid) {
        const clientRef = doc(db, 'clientes', clientUid);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const cData = clientSnap.data();
          const currentStrikes = cData.strikes || 0;
          const newStrikes = currentStrikes + 1;
          const isBlocked = newStrikes >= 3;

          await updateDoc(clientRef, {
            strikes: newStrikes,
            isBlocked: isBlocked
          });
          
          if (isBlocked) {
            showToast(`El cliente ${selectedReserva.clienteNombre} ha alcanzado 3 faltas y ha sido baneado automáticamente.`, 'error');
          }
        }
      }

      showToast(`Cita marcada como ${action} exitosamente.`, 'success');
      // Cerrar modal localmente (el onSnapshot actualizará la UI)
      setSelectedReserva(null);
    } catch (err) {
      console.error("Error al procesar acción", err);
      showToast("Error al intentar procesar la acción.", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper para calcular la posición Top (Y) del bloque
  const calculateTop = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const absoluteMinutes = (hours * 60 + minutes) - (START_HOUR * 60);
    return absoluteMinutes * PIXELS_PER_MINUTE;
  };

  // Generar las etiquetas de las horas a la izquierda
  const renderTimeLabels = () => {
    const labels = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) {
      labels.push(
        <div 
          key={i} 
          className="relative text-xs text-text-muted font-medium w-16 text-right pr-4 border-r border-border-strong bg-bg-card z-10"
          style={{ height: `${HOUR_HEIGHT}px` }}
        >
          <span className="relative -top-2">{i}:00</span>
        </div>
      );
    }
    return labels;
  };

  // Generar las líneas divisorias horizontales
  const renderGridLines = () => {
    const lines = [];
    for (let i = 0; i < TOTAL_HOURS; i++) {
      lines.push(
        <div key={`line-${i}`} className="absolute w-full border-t border-border-subtle" style={{ top: `${i * HOUR_HEIGHT}px` }}></div>
      );
      // Línea punteada de 30 mins
      lines.push(
        <div key={`line-half-${i}`} className="absolute w-full border-t border-border-subtle border-dashed opacity-50" style={{ top: `${i * HOUR_HEIGHT + (HOUR_HEIGHT / 2)}px` }}></div>
      );
    }
    return lines;
  };

  const selectedDateStr = getLocalDateString(selectedDate);

  return (
    <div className="bg-bg-card rounded-xl border border-border-strong shadow-lg overflow-hidden flex flex-col h-[700px] lg:h-[800px] transition-all">
      
      {/* Header Controls */}
      <div className="p-4 border-b border-border-strong flex items-center justify-between bg-bg-tertiary">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bg-card border border-border-strong rounded-lg p-1">
            <button onClick={handlePrevDay} className="p-1 hover:bg-bg-secondary rounded"><ChevronLeft size={20} /></button>
            <span className="font-bold flex items-center gap-2 px-2 text-sm">
              <CalendarIcon size={16} className="text-accent-primary" /> {selectedDateStr}
            </span>
            <button onClick={handleNextDay} className="p-1 hover:bg-bg-secondary rounded"><ChevronRight size={20} /></button>
          </div>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="text-xs font-bold text-accent-primary uppercase tracking-wider hover:underline"
          >
            Hoy
          </button>
        </div>
        
        {/* loading indicator removed */}
      </div>

      {/* Agenda Body */}
      <div className="flex-1 overflow-auto flex relative bg-bg-card min-w-max">
        
        {/* Y-Axis: Time Column */}
        <div className="sticky left-0 bg-bg-card z-20 pt-16">
          {renderTimeLabels()}
        </div>

        {/* X-Axis: Barbers Columns Container */}
        <div className="flex-1 flex flex-col min-w-fit relative">
          
          {/* Barbers Header (Sticky to top) */}
          <div className="sticky top-0 flex z-30 bg-bg-card border-b border-border-strong h-16 shadow-sm">
            {barberos.length === 0 && <div className="p-4 text-text-muted text-sm italic">Cargando barberos...</div>}
            {barberos.map(b => (
              <div key={b.id} className="w-[300px] min-w-[300px] border-r border-border-subtle flex items-center justify-center gap-3 bg-bg-tertiary/50">
                <div className="w-10 h-10 rounded-full bg-bg-card border-2 border-accent-primary overflow-hidden flex items-center justify-center font-bold">
                  {b.imageUrl ? <img src={b.imageUrl} className="w-full h-full object-cover" /> : b.nombre.charAt(0)}
                </div>
                <span className="font-bold text-sm truncate">{b.nombre}</span>
              </div>
            ))}
          </div>

          {/* Grid Engine */}
          <div className="flex relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
            {/* Rendereamos las líneas divisorias al fondo */}
            {renderGridLines()}

            {/* Barber Columns Content */}
            {barberos.map((b, bIdx) => {
              // Filtrar reservas que pertenezcan a este barbero
              const myBookings = reservas.filter(r => r.barberoId === b.id);

              return (
                <div key={b.id} className={`w-[300px] min-w-[300px] border-r border-border-subtle relative ${bIdx % 2 !== 0 ? 'bg-bg-tertiary/10' : ''}`}>
                  {myBookings.map(res => {
                    const topPos = calculateTop(res.hora);
                    const dur = Number(res.duracion) || 30;
                    const blockHeight = dur * PIXELS_PER_MINUTE;
                    
                    // Definir colores según estado
                      let bgClass = "bg-accent-primary/10";
                      let borderClass = "border-accent-primary";
                      let extraClass = "";

                      if (res.estado === 'completada') {
                        bgClass = "bg-green-500/20";
                        borderClass = "border-green-500";
                        extraClass = "opacity-80";
                      } else if (res.estado === 'cancelada') {
                        bgClass = "bg-gray-500/20";
                        borderClass = "border-gray-600";
                        extraClass = "opacity-50 grayscale line-through";
                      } else if (res.estado === 'no-show') {
                        bgClass = "bg-red-500/20";
                        borderClass = "border-red-500";
                        extraClass = "opacity-80";
                      }

                      return (
                        <div 
                          key={res.id} 
                          onClick={() => setSelectedReserva(res)}
                          className={`absolute w-[calc(100%-10px)] left-[5px] rounded-md border ${bgClass} ${borderClass} ${extraClass} shadow-sm overflow-hidden p-2 transition-transform hover:scale-[1.02] cursor-pointer group`}
                          style={{ top: `${topPos}px`, height: `${blockHeight}px` }}
                        >
                           <div className={`w-1 absolute left-0 top-0 bottom-0 ${res.estado === 'completada' ? 'bg-green-500' : res.estado === 'cancelada' ? 'bg-gray-500' : res.estado === 'no-show' ? 'bg-red-500' : 'bg-accent-primary'}`}></div>
                           <p className="text-xs font-bold text-text-primary leading-tight truncate">{res.clienteNombre}</p>
                           {blockHeight >= 40 && (
                             <>
                               <p className="text-[10px] text-text-muted truncate">{res.servicioNombre}</p>
                               <p className="text-[10px] text-accent-primary font-bold">{res.hora} • {dur} min</p>
                             </>
                           )}
                           
                           {/* Hover Details */}
                           <div className="hidden group-hover:block absolute z-50 top-0 left-full ml-2 w-48 bg-bg-card border border-border-strong rounded-lg shadow-2xl p-3">
                             <p className="font-bold border-b border-border-subtle pb-1 mb-2">{res.clienteNombre}</p>
                             <p className="text-xs text-text-muted mb-1">Servicio: <strong className="text-text-primary">{res.servicioNombre}</strong></p>
                             <p className="text-xs text-text-muted mb-1">Hora: <strong className="text-text-primary">{res.hora} ({dur}m)</strong></p>
                             <p className="text-xs text-text-muted mb-1">WhatsApp: <strong className="text-text-primary">{res.clienteTelefono}</strong></p>
                             <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-tertiary text-text-primary border border-border-strong">
                               {res.estado.toUpperCase()}
                             </span>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>
        
        {/* MODAL DE ACCIONES DE CITA */}
        {selectedReserva && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-bg-tertiary border border-border-strong w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              
              <div className="p-6 border-b border-border-subtle relative flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-1">Detalle de la Cita</h3>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    selectedReserva.estado === 'completada' ? 'bg-green-500/20 text-green-500' :
                    selectedReserva.estado === 'cancelada' ? 'bg-gray-500/20 text-gray-400' :
                    selectedReserva.estado === 'no-show' ? 'bg-red-500/20 text-red-500' :
                    'bg-accent-warning/20 text-accent-warning'
                  }`}>
                    {selectedReserva.estado}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedReserva(null)} 
                  className="p-2 bg-bg-card hover:bg-bg-secondary rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-bg-card p-4 rounded-xl border border-border-subtle">
                  <p className="text-sm text-text-muted mb-1">Cliente</p>
                  <p className="font-bold text-lg">{selectedReserva.clienteNombre}</p>
                  <a 
                    href={`https://wa.me/57${selectedReserva.clienteTelefono.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 text-sm font-bold text-green-500 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle size={16} /> Contactar por WhatsApp
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-card p-4 rounded-xl border border-border-subtle">
                    <p className="text-sm text-text-muted mb-1">Servicio</p>
                    <p className="font-bold">{selectedReserva.servicioNombre}</p>
                  </div>
                  <div className="bg-bg-card p-4 rounded-xl border border-border-subtle">
                    <p className="text-sm text-text-muted mb-1">Barbero</p>
                    <p className="font-bold">{selectedReserva.barberoNombre}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-card p-4 rounded-xl border border-border-subtle">
                    <p className="text-sm text-text-muted mb-1">Fecha</p>
                    <p className="font-bold">{selectedReserva.fecha}</p>
                  </div>
                  <div className="bg-bg-card p-4 rounded-xl border border-border-subtle">
                    <p className="text-sm text-text-muted mb-1">Hora</p>
                    <p className="font-bold">{selectedReserva.hora}</p>
                  </div>
                </div>
              </div>

              {selectedReserva.estado === 'pendiente' && (
                <div className="p-6 border-t border-border-subtle bg-bg-card grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    disabled={actionLoading}
                    onClick={() => handleAction('completada')}
                    className="flex flex-col items-center justify-center p-3 py-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-500 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Completar</span>
                  </button>

                  <button 
                    disabled={actionLoading}
                    onClick={() => handleAction('no-show')}
                    className="flex flex-col items-center justify-center p-3 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 transition-colors disabled:opacity-50"
                  >
                    <AlertCircle size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider text-center">Inasistencia (Strike)</span>
                  </button>

                  <button 
                    disabled={actionLoading}
                    onClick={() => handleAction('cancelada')}
                    className="flex flex-col items-center justify-center p-3 py-4 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 text-text-muted transition-colors disabled:opacity-50"
                  >
                    <XCircle size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Cancelar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}
