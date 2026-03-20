import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { Calendar, User, Scissors, CheckCircle, ChevronLeft, ShieldAlert, Users, CalendarDays, Sparkles, UserCog } from 'lucide-react';
import { useStore } from '../store/useStore';
import ValidatedInput from '../components/ui/ValidatedInput';
import PrimaryButton from '../components/ui/PrimaryButton';
import { validateName, validatePhone } from '../utils/validators';

// Genera slots de 30 en 30 min desde las 9 AM hasta las 8 PM
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let i = 9; i <= 19; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
    slots.push(`${i.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

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

  const [step, setStep] = useState(preSelectedService ? 2 : 1);
  const [servicios, setServicios] = useState<any[]>([]);
  const [barberos, setBarberos] = useState<any[]>([]);

  // Auth & Client Profile State
  const { user, userRole, setLoginModalOpen, showToast } = useStore();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Is this user a staff member (admin or barber)?
  const isStaff = userRole === 'superadmin' || userRole === 'barber';

  // Selección
  const [selectedService, setSelectedService] = useState<any | null>(preSelectedService);
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // UI & Data
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{time: string, duration: number}[]>([]);
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
  useEffect(() => {
    setBookedSlots([]);

    if (step === 3 && selectedDate && selectedBarber) {
      const q = query(
        collection(db, 'reservas'),
        where('barberoId', '==', selectedBarber.id),
        where('fecha', '==', selectedDate),
        where('estado', 'not-in', ['cancelada'])
      );
      const unsub = onSnapshot(q, (snap) => {
        const slots = snap.docs.map(d => ({ time: d.data().hora, duration: d.data().duracion }));
        setBookedSlots(slots);
      });
      return () => unsub();
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
      const isDayOff = d.getDay() === 0;
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
    const slotMinutes = parseInt(slotTime.split(':')[0]) * 60 + parseInt(slotTime.split(':')[1]);
    const todayStr = getLocalDateString(new Date());
    if (selectedDate === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= currentMinutes + 15) return false;
    }
    const serviceDur = selectedService?.duracion || 30;
    const slotEndMinutes = slotMinutes + serviceDur;
    for (const b of bookedSlots) {
      const bStartMinutes = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      const bEndMinutes = bStartMinutes + (b.duration || 30);
      if (slotMinutes < bEndMinutes && slotEndMinutes > bStartMinutes) return false;
    }
    return true;
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
        clienteId: isStaff ? 'manual' : user.uid,
        clienteNombre: `${nombre} ${apellido}`,
        clienteTelefono: telefono,
        servicioId: selectedService.id,
        servicioNombre: selectedService.nombre,
        barberoId: selectedBarber.id,
        barberoNombre: selectedBarber.nombre,
        fecha: selectedDate,
        hora: selectedTime,
        duracion: selectedService.duracion,
        precio: selectedService.precio,
        estado: 'pendiente',
        creadoPor: userRole || 'user',
        createdAt: new Date().toISOString()
      });
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

  const allTimeSlots = generateTimeSlots();

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
                  onClick={() => { setSelectedService(s); setStep(2); }}
                  className="group bg-bg-card rounded-xl border border-border-strong hover:border-accent-primary transition-all text-left shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col sm:flex-row h-auto sm:h-44 w-full max-w-lg"
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
                  onClick={() => { setSelectedBarber(b); goToStep(3); }}
                  className="group bg-bg-card p-6 rounded-xl border border-border-strong hover:border-accent-primary transition-all text-center shadow-sm hover:shadow-xl flex flex-col items-center"
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
                    onClick={() => { setSelectedDate(d.dateStr); setSelectedTime(''); }}
                    role="option"
                    aria-selected={selectedDate === d.dateStr}
                    className={`min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      selectedDate === d.dateStr
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
              <div className="animate-fade-in">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Horarios disponibles</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {allTimeSlots.map((time) => {
                    const available = isSlotAvailable(time);
                    return (
                      <button
                        key={time}
                        disabled={!available}
                        onClick={() => { setSelectedTime(time); goToStep(4); }}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                          selectedTime === time
                            ? 'bg-accent-primary border-accent-primary text-bg-primary shadow-lg scale-110'
                            : available
                              ? 'bg-bg-tertiary border-border-strong text-text-primary hover:border-accent-primary'
                              : 'bg-bg-card border-border-subtle text-text-muted opacity-10 cursor-not-allowed'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
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
