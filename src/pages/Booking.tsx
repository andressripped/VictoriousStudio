import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, query, where, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { Calendar, User, Scissors, CheckCircle, ChevronLeft, ShieldAlert, Users, CalendarDays, Sparkles, UserCog, Ban } from 'lucide-react';
import { useStore } from '../store/useStore';
import ValidatedInput from '../components/ui/ValidatedInput';
import PrimaryButton from '../components/ui/PrimaryButton';
import { validateName, validatePhone } from '../utils/validators';
import { isBarberDayOff, isSlotWithinBarberSchedule, overlapsExistingSlot } from '../utils/scheduling';

// Genera slots de 30 en 30 min desde las 8 AM hasta las 8 PM
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = [];
  for (let h = 8; h <= 19; h++) {
    for (const m of ['00', '30']) {
      const value = `${h.toString().padStart(2, '0')}:${m}`;
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const label = `${h12}:${m} ${ampm}`;
      slots.push({ value, label });
    }
  }
  return slots;
};

const ALL_TIME_SLOTS = generateTimeSlots();

// Helper para obtener YYYY-MM-DD en hora local real
const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Booking() {
  const location = useLocation();
  const preSelectedService = (location.state as any)?.selectedService || null;

  // 1. Estados de Datos (Firestore)
  const [servicios, setServicios] = useState<any[]>([]);
  const [barberos, setBarberos] = useState<any[]>([]);

  // 2. Auth & UI State
  const { user, userRole, setLoginModalOpen, showToast } = useStore();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const isStaff = userRole === 'superadmin' || userRole === 'barber';

  // 3. Selección con Persistencia
  const [step, setStep] = useState(() => {
    const savedStep = sessionStorage.getItem('booking_step');
    if (preSelectedService) return 2;
    return savedStep ? parseInt(savedStep) : 1;
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(() => {
    return sessionStorage.getItem('booking_service_id') || preSelectedService?.id || null;
  });
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(() => {
    return sessionStorage.getItem('booking_barber_id') || null;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => sessionStorage.getItem('booking_date') || '');
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    sessionStorage.setItem('booking_step', step.toString());
    if (selectedServiceId) sessionStorage.setItem('booking_service_id', selectedServiceId);
    else sessionStorage.removeItem('booking_service_id');

    if (selectedBarberId) sessionStorage.setItem('booking_barber_id', selectedBarberId);
    else sessionStorage.removeItem('booking_barber_id');

    if (selectedDate) sessionStorage.setItem('booking_date', selectedDate);
    else sessionStorage.removeItem('booking_date');
  }, [step, selectedServiceId, selectedBarberId, selectedDate]);

  // 4. Datos Derivados
  const selectedService = servicios.find(s => s.id === selectedServiceId) || preSelectedService;
  const selectedBarber = barberos.find(b => b.id === selectedBarberId);

  // 5. Resto de estados auxiliares
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{ time: string, duration: number }[]>([]);
  const [allBookingsByDate, setAllBookingsByDate] = useState<Record<string, number>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Cliente form fields
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteApellido, setClienteApellido] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

  useEffect(() => {
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => {
      setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubBarberos = onSnapshot(collection(db, 'barberos'), (snap) => {
      setBarberos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((b: any) => b.activo !== false));
    });
    return () => { unsubServicios(); unsubBarberos(); };
  }, []);

  useEffect(() => {
    if (!selectedBarberId || barberos.length === 0 || selectedBarber) return;

    setSelectedBarberId(null);
    setSelectedDate('');
    setSelectedTime('');
    if (step > 2) setStep(2);
  }, [barberos, selectedBarber, selectedBarberId, step]);

  // ──── Fetch Client Profile ────
  useEffect(() => {
    const fetchProfile = async () => {
      if (step === 4 && user) {
        setCheckingProfile(true);

        // Staff users (admin/barber) NEVER pre-fill with their own data —
        // they are booking on behalf of a client, so leave fields empty
        if (isStaff) {
          setClientProfile(null);
          setClienteNombre('');
          setClienteApellido('');
          setClienteTelefono('');
          setCheckingProfile(false);
          return;
        }

        try {
          const docRef = doc(db, 'clientes', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setClientProfile(data);
            // Populate local state so validators pass
            setClienteNombre(data.nombre || '');
            setClienteApellido(data.apellido || '');
            setClienteTelefono(data.telefono || '');
          } else {
            setClientProfile(null);
            // Pre-fill name from Firebase Auth if available
            if (user.displayName) {
              const parts = user.displayName.trim().split(' ');
              setClienteNombre(parts[0] || '');
              setClienteApellido(parts.length > 1 ? parts.slice(1).join(' ') : '');
            }
            setClienteTelefono('');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setCheckingProfile(false);
        }
      }
    };
    fetchProfile();
  }, [step, user, isStaff]);

  // ──── Booked slots (clears on date/barber change) ────
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);

  useEffect(() => {
    setBookedSlots([]);
    setBlockedSlots([]);

    if (step === 3 && selectedDate && selectedBarber) {
      const q = query(
        collection(db, 'reservas'),
        where('barberoId', '==', selectedBarber.id),
        where('fecha', '==', selectedDate)
      );
      const unsub = onSnapshot(q, (snap) => {
        // Filtrar estados no deseados en memoria para evitar requerir índices compuestos complejos
        const slots = snap.docs
          .map(d => d.data())
          .filter(d => !['cancelada'].includes(d.estado))
          .map(d => ({ time: d.hora, duration: d.duracion }));
        
        setBookedSlots(slots);
      }, (err) => {
        console.error("Error al cargar reservas:", err);
        showToast("Error al cargar disponibilidad real.", "error");
      });

      // Bloqueos manuales
      const qBlocks = query(
        collection(db, 'bloqueos'),
        where('barberoId', '==', selectedBarber.id),
        where('fecha', '==', selectedDate)
      );
      const unsubBlocks = onSnapshot(qBlocks, (snap) => {
        setBlockedSlots(snap.docs.map(d => ({ time: d.data().hora, duration: d.data().duracion })));
      }, (err) => {
        console.error("Error al cargar bloqueos:", err);
      });

      return () => { unsub(); unsubBlocks(); };
    }
  }, [step, selectedDate, selectedBarber]);

  useEffect(() => {
    const q = query(collection(db, 'reservas'), where('estado', 'not-in', ['cancelada']));
    const unsub = onSnapshot(q, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const d = doc.data().fecha;
        counts[d] = (counts[d] || 0) + 1;
      });
      setAllBookingsByDate(counts);
    });
    return () => unsub();
  }, []);

  const checkIsDayOff = (date: Date) => isBarberDayOff(selectedBarber, date);

  const getDayStatus = (dateStr: string, isDayOff: boolean) => {
    if (isDayOff) return 'off';
    if (barberos.length === 0) return 'high';
    const totalCount = allBookingsByDate[dateStr] || 0;
    const maxCapacity = (barberos.length || 1) * 20;
    if (totalCount >= maxCapacity) return 'full';
    if (totalCount >= maxCapacity * 0.7) return 'low';
    return 'high';
  };

  const carouselDays = (() => {
    const days: any[] = [];
    const now = new Date();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = getLocalDateString(d);
      const isDayOff = checkIsDayOff(d);
      days.push({
        dateStr,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        status: getDayStatus(dateStr, isDayOff)
      });
    }
    return days;
  })();

  const getBarbersForService = () => {
    if (!selectedService) return barberos;
    const matches = barberos.filter(b => {
      if (!b.especialidades || b.especialidades.length === 0) return true;
      return b.especialidades.some((esp: string) =>
        selectedService.nombre.toLowerCase().includes(esp.toLowerCase()) ||
        esp.toLowerCase().includes(selectedService.nombre.toLowerCase())
      );
    });
    return matches.length > 0 ? matches : barberos;
  };

  const isSlotAvailable = (slotTime: string) => {
    if (!selectedBarber || !selectedDate) return { available: false, reason: 'loading' };

    // 1. Validar si el día es no laboral para el barbero
    const d = new Date(selectedDate + 'T00:00:00');
    if (checkIsDayOff(d)) return { available: false, reason: 'day-off' };

    const slotMinutes = parseInt(slotTime.split(':')[0]) * 60 + parseInt(slotTime.split(':')[1]);
    const todayStr = getLocalDateString(new Date());

    // Si es hoy, no permitir citas en el pasado o muy próximas
    if (selectedDate === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= currentMinutes + 15) return { available: false, reason: 'past' };
    }

    // 2. Verificar horario del barbero (mañana/tarde)
    const serviceDur = selectedService?.duracion || 30;
    if (!isSlotWithinBarberSchedule(selectedBarber, slotTime, serviceDur)) {
      return { available: false, reason: 'outside-shift' };
    }

    // 3. Verificar contra reservas existentes
    if (overlapsExistingSlot(slotTime, serviceDur, bookedSlots)) {
      return { available: false, reason: 'booked' };
    }

    // 4. Verificar contra bloqueos manuales
    if (overlapsExistingSlot(slotTime, serviceDur, blockedSlots)) {
      return { available: false, reason: 'blocked' };
    }

    return { available: true };
  };

  // ──── Require Login before Step 3 ────
  const goToStep = (nextStep: number) => {
    if (nextStep >= 3 && !user) {
      showToast('Inicia sesión para continuar con tu reserva.', 'info');
      setLoginModalOpen(true);
      return;
    }
    setStep(nextStep);
  };

  // ──── Confirm button disabled logic ────
  // Staff always sees empty form → validate fields
  // Clients with complete profile → always enabled (data comes from Firestore)
  // Clients without profile → validate fields
  const isProfileComplete = !isStaff && !!(
    clientProfile?.nombre &&
    clientProfile?.apellido &&
    clientProfile?.telefono
  );
  const isFormValid = !validateName(clienteNombre) && !validateName(clienteApellido) && !validatePhone(clienteTelefono);
  const isConfirmDisabled = isProfileComplete ? false : !isFormValid;

  const handleConfirmBooking = async () => {
    if (clientProfile?.isBlocked) {
      showToast('Tu cuenta está suspendida.', 'error');
      return;
    }
    if (!user) { setLoginModalOpen(true); return; }

    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      showToast('Completa servicio, barbero, fecha y hora antes de confirmar.', 'error');
      return;
    }

    // Staff uses form fields (booking for a client)
    // Regular clients: use profile data if complete, otherwise form fields
    const nombre = isStaff ? clienteNombre : (clientProfile?.nombre || clienteNombre);
    const apellido = isStaff ? clienteApellido : (clientProfile?.apellido || clienteApellido);
    const telefono = isStaff ? clienteTelefono : (clientProfile?.telefono || clienteTelefono);

    if (!nombre || !apellido || !telefono) {
      showToast('Por favor completa todos los campos del cliente.', 'error');
      return;
    }
    if (telefono.length !== 10) {
      showToast('El teléfono debe tener 10 dígitos.', 'error');
      return;
    }

    setLoading(true);
    try {
      const bookingDate = new Date(`${selectedDate}T00:00:00`);
      if (isBarberDayOff(selectedBarber, bookingDate)) {
        showToast('Este barbero no trabaja en la fecha seleccionada.', 'error');
        setStep(3);
        return;
      }

      if (!isSlotWithinBarberSchedule(selectedBarber, selectedTime, selectedService.duracion || 30)) {
        showToast('La hora seleccionada ya no está dentro del horario laboral del barbero.', 'error');
        setSelectedTime('');
        setStep(3);
        return;
      }

      const reservationQuery = query(
        collection(db, 'reservas'),
        where('barberoId', '==', selectedBarber.id),
        where('fecha', '==', selectedDate),
      );
      const blockQuery = query(
        collection(db, 'bloqueos'),
        where('barberoId', '==', selectedBarber.id),
        where('fecha', '==', selectedDate),
      );

      const [reservationSnapshot, blockSnapshot] = await Promise.all([
        getDocs(reservationQuery),
        getDocs(blockQuery),
      ]);

      const freshBookedSlots = reservationSnapshot.docs
        .map((snapshot) => snapshot.data())
        .filter((reservation) => !['cancelada'].includes(reservation.estado))
        .map((reservation) => ({ time: reservation.hora, duration: reservation.duracion }));

      const freshBlockedSlots = blockSnapshot.docs.map((snapshot) => ({
        time: snapshot.data().hora,
        duration: snapshot.data().duracion,
      }));

      const serviceDuration = selectedService.duracion || 30;
      if (overlapsExistingSlot(selectedTime, serviceDuration, freshBookedSlots)) {
        showToast('Ese horario acaba de ser reservado. Elige otro.', 'error');
        setSelectedTime('');
        setStep(3);
        return;
      }

      if (overlapsExistingSlot(selectedTime, serviceDuration, freshBlockedSlots)) {
        showToast('Ese horario fue bloqueado. Elige otro.', 'error');
        setSelectedTime('');
        setStep(3);
        return;
      }

      // Only create/update client doc for non-staff users
      if (!isStaff) {
        const clientDocRef = doc(db, 'clientes', user.uid);
        const clientSnap = await getDoc(clientDocRef);
        if (!clientSnap.exists()) {
          await setDoc(clientDocRef, {
            nombre, apellido, telefono,
            email: user.email, strikes: 0, isBlocked: false, createdAt: new Date().toISOString()
          });
        }
      }

      await addDoc(collection(db, 'reservas'), {
        clienteId: isStaff ? null : user.uid,
        clienteNombre: `${nombre} ${apellido}`.trim(),
        clienteTelefono: telefono,
        servicioId: selectedService.id,
        servicioNombre: selectedService.nombre,
        barberoId: selectedBarber.id,
        barberoNombre: selectedBarber.nombre,
        fecha: selectedDate,
        hora: selectedTime,
        duracion: serviceDuration,
        precio: selectedService.precio || 0,
        estado: 'pendiente',
        creadoPor: userRole || 'user',
        createdAt: new Date().toISOString()
      });
      sessionStorage.removeItem('booking_step');
      sessionStorage.removeItem('booking_service_id');
      sessionStorage.removeItem('booking_barber_id');
      sessionStorage.removeItem('booking_date');
      setIsSuccess(true);
      showToast('¡Cita agendada!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al procesar la reserva.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto py-24 px-4 text-center max-w-lg">
        <div className="bg-bg-card p-10 flex flex-col items-center border border-border-subtle rounded-xl shadow-2xl animate-fade-in">
          <CheckCircle className="text-accent-success w-20 h-20 mb-6" />
          <h2 className="text-3xl font-display mb-2">¡Reserva Confirmada!</h2>
          <p className="text-text-muted mb-8 text-lg">
            Te esperamos el <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong> para tu cita con {selectedBarber?.nombre}.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-12 py-4 bg-accent-primary text-bg-primary rounded font-bold hover:opacity-90 transition-opacity"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <div className="mb-12">
        <h2 className="font-display text-3xl md:text-4xl mb-2">Reserva tu espacio</h2>
        <p className="text-text-muted font-bold uppercase tracking-widest text-xs">Paso {step} de 4</p>
        <div className="w-full bg-bg-tertiary h-1.5 mt-4 rounded-full overflow-hidden">
          <div className="bg-accent-primary h-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>
      </div>

      <div className="min-h-[50vh]">
        {/* ── PASO 1: Servicio ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="text-xl sm:text-2xl font-display mb-6 sm:mb-8 flex items-center gap-3">
              <Sparkles className="text-accent-primary" /> 1. Selecciona tu Servicio
            </h3>
            <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
              {servicios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedServiceId(s.id);
                    setSelectedBarberId(null);
                    setSelectedDate('');
                    setSelectedTime('');
                    setStep(2);
                  }}
                  className={`group bg-bg-card rounded-xl border transition-all text-left shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col sm:flex-row h-auto sm:h-44 w-full max-w-lg ${selectedServiceId === s.id ? 'border-accent-primary ring-2 ring-accent-primary/20' : 'border-border-strong hover:border-accent-primary'
                    }`}
                  aria-label={`Seleccionar servicio ${s.nombre}, precio $${s.precio}`}
                >
                  {s.imageUrl ? (
                    <div className="w-full sm:w-32 h-32 sm:h-full overflow-hidden flex-shrink-0 grayscale group-hover:grayscale-0 transition-all duration-500">
                      <img src={s.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={s.nombre} />
                    </div>
                  ) : (
                    <div className="w-full sm:w-32 h-32 sm:h-full bg-accent-primary/5 flex items-center justify-center text-accent-primary flex-shrink-0">
                      <Scissors size={24} />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <h4 className="font-display text-xl font-bold mb-1 group-hover:text-accent-primary transition-colors">{s.nombre}</h4>
                    <p className="text-sm text-text-muted mb-4 line-clamp-2">{s.descripcion}</p>
                    <div className="flex justify-between items-center mt-auto border-t border-border-subtle pt-3">
                      <span className="text-accent-primary font-bold text-lg">${s.precio}</span>
                      <span className="text-[10px] text-text-subtle uppercase tracking-widest bg-bg-tertiary px-3 py-1 rounded-full">{s.duracion} min</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PASO 2: Barbero ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep(1)} className="p-2 bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors" aria-label="Volver">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-xl sm:text-2xl font-display flex items-center gap-3">
                <Users className="text-accent-primary" /> 2. Elige tu Barbero
              </h3>
            </div>

            {selectedService && (
              <div className="mb-8 p-4 bg-bg-tertiary/50 rounded-xl border border-border-subtle flex items-center gap-4">
                <Scissors size={18} className="text-accent-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">{selectedService.nombre}</p>
                  <p className="text-xs text-text-muted">{selectedService.duracion} min</p>
                </div>
                <span className="text-accent-primary font-bold">${selectedService.precio}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getBarbersForService().map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBarberId(b.id);
                    setSelectedDate('');
                    setSelectedTime('');
                    goToStep(3);
                  }}
                  className={`group bg-bg-card p-6 rounded-xl border transition-all text-center shadow-sm hover:shadow-xl flex flex-col items-center ${selectedBarberId === b.id ? 'border-accent-primary ring-2 ring-accent-primary/20' : 'border-border-strong hover:border-accent-primary'
                    }`}
                  aria-label={`Seleccionar barbero ${b.nombre}`}
                >
                  <div className="w-24 h-24 rounded-full border-4 border-bg-tertiary group-hover:border-accent-primary overflow-hidden mb-4 transition-all group-hover:scale-105">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} className="w-full h-full object-cover" alt={b.nombre} />
                    ) : (
                      <div className="w-full h-full bg-accent-primary/10 flex items-center justify-center text-accent-primary text-3xl font-display font-bold">
                        {b.nombre.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h4 className="font-display text-xl font-bold mb-1">{b.nombre}</h4>
                  <p className="text-xs text-text-muted mb-4 line-clamp-2">{b.biografia || 'Especialista en cortes de autor'}</p>
                  <div className="mt-auto px-4 py-1 bg-bg-tertiary rounded-full text-[10px] uppercase tracking-widest text-accent-primary font-bold hover:bg-accent-primary hover:text-bg-primary transition-colors">
                    Ver Agenda
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PASO 3: Fecha y Horario ── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep(2)} className="p-2 bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors" aria-label="Volver">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-xl sm:text-2xl font-display flex items-center gap-3">
                <CalendarDays className="text-accent-primary" /> 3. Fecha y Horario
              </h3>
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Próximos 14 días</p>
              <div className="flex gap-3 overflow-x-auto pb-4" role="listbox" aria-label="Selecciona una fecha">
                {carouselDays.map((d, i) => (
                  <button
                    key={i}
                    disabled={d.status === 'full' || d.status === 'off'}
                    onClick={() => {
                      setSelectedDate(d.dateStr);
                      setSelectedTime('');
                    }}
                    role="option"
                    aria-selected={selectedDate === d.dateStr}
                    className={`min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedDate === d.dateStr
                        ? 'border-accent-primary bg-accent-primary text-bg-primary shadow-lg scale-105'
                        : d.status === 'full' || d.status === 'off'
                          ? 'border-border-subtle bg-bg-tertiary text-text-muted opacity-30 cursor-not-allowed'
                          : 'border-border-strong bg-bg-card hover:border-accent-primary shadow-sm'
                      }`}
                  >
                    <span className="text-[10px] uppercase font-bold mb-1 opacity-80">{d.dayName}</span>
                    <span className="text-2xl font-display font-bold mb-2">{d.dayNum}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'high' ? 'bg-accent-success' : d.status === 'low' ? 'bg-accent-warning' : 'bg-transparent'}`}></div>
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="animate-fade-in space-y-8">
                {/* Leyenda */}
                <div className="flex flex-wrap gap-4 text-[10px] uppercase font-bold tracking-widest text-text-muted px-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-accent-primary"></div> Disponible</div>
                </div>

                {/* Bloque Mañana */}
                {(() => {
                  const slots = ALL_TIME_SLOTS.filter(s => parseInt(s.value.split(':')[0]) < 13)
                    .map(s => ({ ...s, status: isSlotAvailable(s.value) }));
                  const available = slots.filter(s => s.status.available);

                  if (slots.length === 0 || available.length === 0) {
                    return (
                      <div className="bg-bg-card p-6 rounded-2xl border border-dashed border-border-subtle shadow-sm animate-scale-in text-center">
                        <Ban size={40} className="mx-auto text-text-muted mb-4 opacity-20" />
                        <p className="text-text-muted font-bold">No hay agenda disponible en el turno de la mañana.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle shadow-sm animate-scale-in">
                      <p className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-text-muted mb-4 pb-2 border-b border-border-subtle">
                        <span className="flex items-center gap-2">
                          <Sparkles size={14} className="text-accent-primary" /> Turno Mañana
                        </span>
                        <span className="text-[10px] font-normal opacity-60">{available.length} disponibles</span>
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {available.map((slot) => (
                          <button
                            key={slot.value}
                            onClick={() => { setSelectedTime(slot.value); goToStep(4); }}
                            className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                              selectedTime === slot.value
                                ? 'bg-accent-primary border-accent-primary text-bg-primary shadow-lg scale-105'
                                : 'bg-bg-tertiary border-border-strong text-text-primary hover:border-accent-primary hover:bg-bg-secondary active:scale-95'
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Bloque Tarde */}
                {(() => {
                  const slots = ALL_TIME_SLOTS.filter(s => parseInt(s.value.split(':')[0]) >= 13)
                    .map(s => ({ ...s, status: isSlotAvailable(s.value) }));
                  const available = slots.filter(s => s.status.available);

                  if (slots.length === 0 || available.length === 0) {
                    return (
                      <div className="bg-bg-card p-6 rounded-2xl border border-dashed border-border-subtle shadow-sm animate-scale-in text-center">
                        <Ban size={40} className="mx-auto text-text-muted mb-4 opacity-20" />
                        <p className="text-text-muted font-bold">No hay agenda disponible en el turno de la tarde.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle shadow-sm animate-scale-in">
                      <p className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-text-muted mb-4 pb-2 border-b border-border-subtle">
                        <span className="flex items-center gap-2">
                          <Sparkles size={14} className="text-accent-primary" /> Turno Tarde
                        </span>
                        <span className="text-[10px] font-normal opacity-60">{available.length} disponibles</span>
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {available.map((slot) => (
                          <button
                            key={slot.value}
                            onClick={() => { setSelectedTime(slot.value); goToStep(4); }}
                            className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                              selectedTime === slot.value
                                ? 'bg-accent-primary border-accent-primary text-bg-primary shadow-lg scale-105'
                                : 'bg-bg-tertiary border-border-strong text-text-primary hover:border-accent-primary hover:bg-bg-secondary active:scale-95'
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Empty State si no hay absoluta disponibilidad */}
                {(() => {
                  const anyAvailable = ALL_TIME_SLOTS.some(s => isSlotAvailable(s.value).available);
                  if (!anyAvailable) {
                    return (
                      <div className="text-center py-12 px-6 bg-bg-card rounded-2xl border border-dashed border-border-subtle">
                        <Ban size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
                        <p className="text-text-muted font-bold">No hay agenda disponible para este día.</p>
                        <p className="text-xs text-text-muted/60 mt-1">Por favor, selecciona otra fecha o barbero.</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── PASO 4: Confirmar ── */}
        {step === 4 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep(3)} className="p-2 bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors" aria-label="Volver">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-2xl font-display flex items-center gap-3">
                <CheckCircle className="text-accent-primary" /> 4. Confirmar Reserva
              </h3>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-bg-tertiary p-6 rounded-xl border border-border-subtle relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Scissors size={24} /></div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Servicio</p>
                <p className="font-bold text-lg">{selectedService?.nombre}</p>
                <p className="text-accent-primary font-bold mt-2 text-xl">${selectedService?.precio}</p>
              </div>
              <div className="bg-bg-tertiary p-6 rounded-xl border border-border-subtle relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><User size={24} /></div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Profesional</p>
                <p className="font-bold text-lg">{selectedBarber?.nombre}</p>
              </div>
              <div className="bg-bg-tertiary p-6 rounded-xl border border-border-subtle relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar size={24} /></div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Cita</p>
                <p className="font-bold text-lg">{selectedDate}</p>
                <p className="text-accent-primary font-bold mt-2 text-xl">{selectedTime}</p>
              </div>
            </div>

            {!user ? (
              <div className="flex flex-col items-center py-10 text-center">
                <ShieldAlert size={48} className="text-accent-warning mb-4" />
                <p className="mb-8 max-w-sm text-text-secondary">Debes iniciar sesión para confirmar tu reserva.</p>
                <PrimaryButton onClick={() => setLoginModalOpen(true)} className="py-4 px-10">
                  Iniciar Sesión
                </PrimaryButton>
              </div>
            ) : checkingProfile ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-muted font-bold uppercase tracking-widest text-xs">Validando perfil...</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-xl mx-auto">

                {/* ── Staff: booking on behalf of a client ── */}
                {isStaff && (
                  <div className="flex items-center gap-3 p-4 bg-accent-primary/5 border border-accent-primary/20 rounded-xl mb-2">
                    <UserCog size={20} className="text-accent-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-accent-primary">Reserva en nombre de un cliente</p>
                      <p className="text-xs text-text-muted">Completa los datos de la persona que atenderás</p>
                    </div>
                  </div>
                )}

                {/* Show profile summary OR form depending on role and profile state */}
                {isProfileComplete ? (
                  <div className="bg-bg-tertiary/50 p-6 rounded-xl border border-border-subtle space-y-2">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-3">Tu Perfil</p>
                    <p className="font-bold text-lg">{clientProfile.nombre} {clientProfile.apellido}</p>
                    <p className="text-text-muted text-sm">📞 {clientProfile.telefono}</p>
                  </div>
                ) : (
                  <>
                    {!isStaff && (
                      <p className="text-sm text-text-muted">Completa tus datos para confirmar la reserva:</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ValidatedInput
                        type="text"
                        placeholder="Nombres del cliente"
                        value={clienteNombre}
                        onChange={setClienteNombre}
                        validate={validateName}
                      />
                      <ValidatedInput
                        type="text"
                        placeholder="Apellidos del cliente"
                        value={clienteApellido}
                        onChange={setClienteApellido}
                        validate={validateName}
                      />
                    </div>
                    <ValidatedInput
                      type="tel"
                      placeholder="Teléfono (10 dígitos)"
                      value={clienteTelefono}
                      onChange={(val) => setClienteTelefono(val.replace(/\D/g, ''))}
                      validate={validatePhone}
                      maxLength={10}
                    />
                  </>
                )}

                {clientProfile?.isBlocked ? (
                  <div className="p-4 bg-accent-error/20 border border-accent-error rounded-xl text-accent-error text-center font-bold" role="alert">
                    Acceso suspendido. Contacta a soporte.
                  </div>
                ) : (
                  <PrimaryButton
                    loading={loading}
                    disabled={isConfirmDisabled}
                    onClick={handleConfirmBooking}
                    className="w-full py-5 text-xl"
                  >
                    Confirmar Cita
                  </PrimaryButton>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
