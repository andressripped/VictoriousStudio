import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, createSecondaryApp } from '../../config/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { compressAndConvertToBase64 } from '../../utils/imageUtils';
import { useStore } from '../../store/useStore';
import { Trash2, Edit2, Plus, Image as ImageIcon, Calendar, Users, Scissors, UserCheck, Menu, X } from 'lucide-react';
import AgendaPanel from './AgendaPanel';
import ClientsPanel from './ClientsPanel';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { userRole } = useStore();
  const [activeTab, setActiveTab] = useState<'servicios' | 'barberos' | 'agenda' | 'clientes'>('agenda');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Prevent access if not superadmin (redundant safety)
  if (userRole !== 'superadmin') {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-2xl font-bold text-accent-error">Acceso Denegado</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-accent-primary underline">Volver al inicio</button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-bg-primary overflow-hidden relative">
      {/* Overlay para móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border-subtle flex flex-col transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-6 border-b border-border-strong flex items-center justify-between lg:hidden">
          <div className="font-display text-xl font-bold">
            Panel <span className="text-accent-primary">Admin</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-bg-tertiary rounded-full">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('agenda'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${activeTab === 'agenda' ? 'bg-accent-primary/10 text-accent-primary font-bold shadow-sm border border-accent-primary/20' : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary border border-transparent'}`}
          >
            <Calendar size={18} />
            <span>Agenda</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('servicios'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${activeTab === 'servicios' ? 'bg-accent-primary/10 text-accent-primary font-bold shadow-sm border border-accent-primary/20' : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary border border-transparent'}`}
          >
            <Scissors size={18} />
            <span>Servicios</span>
          </button>

          <button 
            onClick={() => { setActiveTab('barberos'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${activeTab === 'barberos' ? 'bg-accent-primary/10 text-accent-primary font-bold shadow-sm border border-accent-primary/20' : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary border border-transparent'}`}
          >
            <Users size={18} />
            <span>Barberos</span>
          </button>

          <button 
            onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${activeTab === 'clientes' ? 'bg-accent-primary/10 text-accent-primary font-bold shadow-sm border border-accent-primary/20' : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary border border-transparent'}`}
          >
            <UserCheck size={18} />
            <span>Clientes</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between lg:hidden">
          <h1 className="font-display text-2xl font-bold">Panel de Control</h1>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-bg-secondary border border-border-strong rounded-lg shadow-sm text-accent-primary hover:bg-bg-tertiary transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {activeTab === 'agenda' && <AgendaPanel />}
        {activeTab === 'servicios' && <ServicesPanel />}
        {activeTab === 'barberos' && <BarbersPanel />}
        {activeTab === 'clientes' && <ClientsPanel />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------
// PANEL DE SERVICIOS
// ---------------------------------------------------------
function ServicesPanel() {
  const { showToast } = useStore();
  const [servicios, setServicios] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('30');
  const [imageBase64, setImageBase64] = useState('');

  // Escuchar a Firestore en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'servicios'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setServicios(data);
    });
    return () => unsub();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressAndConvertToBase64(e.target.files[0]);
        setImageBase64(base64);
      } catch (err) {
        showToast("Error al comprimir la imagen.", 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const serviceData = {
        nombre,
        descripcion,
        precio: Number(precio),
        duracion: Number(duracion),
        imageUrl: imageBase64 // $0 Cost storage!
      };

      if (editId) {
        await updateDoc(doc(db, 'servicios', editId), serviceData);
        showToast('Servicio actualizado.', 'success');
      } else {
        await addDoc(collection(db, 'servicios'), serviceData);
        showToast('Servicio creado exitosamente.', 'success');
      }
      
      resetForm();
    } catch (err: any) {
      console.error(err);
      showToast("Error al guardar servicio.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (servicio: any) => {
    setEditId(servicio.id);
    setNombre(servicio.nombre);
    setDescripcion(servicio.descripcion || '');
    setPrecio(servicio.precio.toString());
    setDuracion(servicio.duracion.toString());
    setImageBase64(servicio.imageUrl || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm('¿Seguro que deseas eliminar este servicio?')) {
      await deleteDoc(doc(db, 'servicios', id));
      showToast('Servicio eliminado.', 'success');
    }
  };

  const resetForm = () => {
    setEditId(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setDuracion('30');
    setImageBase64('');
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-display mb-1">Servicios</h2>
          <p className="text-text-muted text-sm">Añade o edita servicios. Las fotos se guardan a Costo 0.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-accent-primary text-bg-primary px-4 py-2 rounded font-medium">
            <Plus size={18} /> Nuevo Servicio
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-bg-card p-6 border border-border-subtle rounded-lg mb-8 shadow-xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1 text-text-muted">Nombre del Servicio *</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-text-muted">Precio ($ COP) *</label>
              <input required type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm mb-1 text-text-muted">Descripción</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary h-20" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-text-muted">Duración Estimada (Minutos) *</label>
              <select value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary">
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 text-text-muted">Foto Exclusiva (Opcional, se comprime en el navegador)</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-1 text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-bg-tertiary file:text-accent-primary hover:file:bg-bg-secondary" />
            </div>
          </div>
          
          {imageBase64 && (
             <div className="mb-4">
               <p className="text-xs text-accent-success mb-1">✓ Imagen reducida e insertada como Base64</p>
               <img src={imageBase64} alt="Preview" className="h-24 w-24 object-cover rounded border border-border-strong" />
             </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-border-strong rounded hover:bg-bg-tertiary">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-accent-primary text-bg-primary rounded font-bold disabled:opacity-50">
              {loading ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 mt-6">
        {servicios.length === 0 && <p className="text-text-muted">No hay servicios registrados.</p>}
        {servicios.map(s => (
          <div key={s.id} className="flex items-center gap-4 bg-bg-card p-4 rounded-lg border border-border-subtle shadow">
            <div className="w-16 h-16 bg-bg-tertiary rounded flex-shrink-0 flex items-center justify-center overflow-hidden border border-border-strong">
              {s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-20" />}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg">{s.nombre}</h4>
              <p className="text-sm text-text-muted truncate">{s.descripcion}</p>
              <div className="text-xs text-accent-primary mt-1">${s.precio} COP • {s.duracion} min</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(s)} className="p-2 bg-bg-tertiary hover:bg-bg-primary text-text-primary rounded" title="Editar"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(s.id)} className="p-2 bg-bg-tertiary hover:bg-accent-error hover:text-white text-text-primary rounded" title="Eliminar"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// PANEL DE BARBEROS (PRO LEVEL)
// ---------------------------------------------------------
const ALL_SPECIALTIES = [
  "Corte Clásico de Hombre",
  "Degradado (Fade)",
  "Diseño y Arreglo de Barba",
  "Colorimetría (Mechas, Platinados)",
  "Visagismo Capilar",
  "Perfilado de Cejas",
  "Cuidado Facial (Mascarillas)",
  "Corte de Pelo de Mujer",
  "Corte Infantil (Niños)",
  "Rituales de Relajación",
  "Alisado / Keratina",
  "Diseños / Hair Tattoos"
];

function BarbersPanel() {
  const { showToast } = useStore();
  const [barberos, setBarberos] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Basic Info
  const [nombre, setNombre] = useState('');
  const [emailAuth, setEmailAuth] = useState('');
  const [activo, setActivo] = useState(true);
  
  // Pro Info
  const [biografia, setBiografia] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [searchEspecialidad, setSearchEspecialidad] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'barberos'), (snapshot) => {
      setBarberos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setNombre('');
    setEmailAuth('');
    setActivo(true);
    setBiografia('');
    setImageBase64('');
    setEspecialidades([]);
    setSearchEspecialidad('');
    setShowForm(false);
  };

  const handleEdit = (b: any) => {
    setEditId(b.id);
    setNombre(b.nombre);
    setEmailAuth(b.emailAuth);
    setActivo(b.activo !== false);
    setBiografia(b.biografia || '');
    setImageBase64(b.imageUrl || '');
    setEspecialidades(b.especialidades || []);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressAndConvertToBase64(e.target.files[0]);
        setImageBase64(base64);
      } catch (err) {
        alert("Error al comprimir la imagen.");
      }
    }
  };

  const toggleEspecialidad = (esp: string) => {
    setEspecialidades(prev => 
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const barberData = {
      nombre,
      emailAuth,
      activo,
      biografia,
      imageUrl: imageBase64,
      especialidades
    };

    try {
      if (editId) {
        await updateDoc(doc(db, 'barberos', editId), barberData);
        showToast('Perfil de barbero actualizado.', 'success');
      } else {
        const password = prompt("Ingresa una contraseña temporal para este barbero (mín. 6 caracteres):");
        if (!password || password.length < 6) {
          alert("Contraseña inválida o cancelada.");
          setLoading(false);
          return;
        }

        const secondaryApp = createSecondaryApp();
        const secondaryAuth = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailAuth, password);
        const newUid = userCredential.user.uid;

        await signOut(secondaryAuth);
        await setDoc(doc(db, 'roles', newUid), { role: 'barber' });
        await addDoc(collection(db, 'barberos'), barberData);

        showToast(`Barbero ${nombre} creado exitosamente.`, 'success');
      }
      resetForm();
    } catch(err: any) {
      console.error(err);
      showToast("Error: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (b: any) => {
    const nuevoEstado = !b.activo;
    if (confirm(nuevoEstado ? '¿Habilitar barbero?' : '¿Deshabilitar barbero?')) {
      await updateDoc(doc(db, 'barberos', b.id), { activo: nuevoEstado });
      showToast(nuevoEstado ? 'Barbero habilitado' : 'Barbero deshabilitado', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('¿Seguro que deseas eliminar este barbero permanentemente?')) {
      await deleteDoc(doc(db, 'barberos', id));
      showToast('Barbero eliminado del sistema.', 'success');
    }
  };

  const handleResetPassword = async (email: string) => {
    if(confirm(`¿Enviar enlace de recuperación a ${email}?`)) {
      try {
        await sendPasswordResetEmail(getAuth(), email);
        showToast('Correo de recuperación enviado.', 'success');
      } catch (err) {
        showToast('Error al enviar. Verifique email.', 'error');
      }
    }
  };

  const filteredSpecialties = ALL_SPECIALTIES.filter(s => s.toLowerCase().includes(searchEspecialidad.toLowerCase()));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-display mb-1">Barberos y Agenda</h2>
          <p className="text-text-muted text-sm">Perfiles profesionales, fotos y especialidades para que el cliente elija.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-accent-primary text-bg-primary px-4 py-2 rounded font-medium shadow-md hover:opacity-90 transition-all">
            <Plus size={18} /> Añadir Barbero
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-bg-card p-6 border border-border-subtle rounded-lg mb-8 shadow-xl">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             {/* General Info */}
             <div className="flex flex-col gap-4">
               <h3 className="font-bold border-b border-border-subtle pb-2">Información de Perfil</h3>
               <div>
                  <label className="block text-sm mb-1 text-text-muted">Nombre del Profesional *</label>
                  <input required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary" />
               </div>
               <div>
                  <label className="block text-sm mb-1 text-text-muted">Email de Acceso (Dashboard) *</label>
                  <input required type="email" value={emailAuth} onChange={e => setEmailAuth(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary" disabled={!!editId} />
               </div>
               <div>
                 <label className="block text-sm mb-1 text-text-muted">Foto de Perfil (Opcional, Costo $0)</label>
                 <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-1 text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-bg-tertiary file:text-accent-primary hover:file:bg-bg-secondary" />
                 {imageBase64 && (
                   <img src={imageBase64} alt="Avatar" className="w-16 h-16 mt-2 rounded-full object-cover border-2 border-accent-primary" />
                 )}
               </div>
               <div>
                 <label className="block text-sm mb-1 text-text-muted">Breve Biografía</label>
                 <textarea value={biografia} onChange={e => setBiografia(e.target.value)} className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary h-20 text-sm" placeholder="Ej: Especialista certificado con 5 años de experiencia..." />
               </div>
               {editId && (
                 <div className="flex items-center gap-2 mt-2">
                   <input type="checkbox" id="activoCheck" checked={activo} onChange={e => setActivo(e.target.checked)} className="w-4 h-4 text-accent-primary" />
                   <label htmlFor="activoCheck" className="text-sm font-bold">Perfil Disponible al Público</label>
                 </div>
               )}
             </div>

             {/* Especialidades Selector */}
             <div className="flex flex-col">
               <h3 className="font-bold border-b border-border-subtle pb-2 mb-3">Especialidades ({especialidades.length} seleccionadas)</h3>
               <input 
                 type="text" 
                 placeholder="Buscar especialidad..." 
                 value={searchEspecialidad}
                 onChange={(e) => setSearchEspecialidad(e.target.value)}
                 className="w-full p-2 bg-bg-tertiary rounded border border-border-strong text-text-primary mb-3 text-sm h-10"
               />
               <div className="flex-1 overflow-y-auto pr-2 bg-bg-tertiary rounded border border-border-strong p-3 h-56">
                 {filteredSpecialties.length === 0 && <p className="text-xs text-text-muted text-center pt-4">No hay resultados.</p>}
                 <div className="flex flex-col gap-2">
                   {filteredSpecialties.map(esp => (
                     <label key={esp} className="flex items-center gap-2 cursor-pointer hover:bg-bg-secondary p-1 rounded transition-colors text-sm">
                       <input 
                         type="checkbox" 
                         checked={especialidades.includes(esp)}
                         onChange={() => toggleEspecialidad(esp)}
                         className="w-4 h-4 text-accent-primary"
                       />
                       {esp}
                     </label>
                   ))}
                 </div>
               </div>
             </div>
           </div>
           
           <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-border-strong rounded hover:bg-bg-tertiary">Cancelar</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-accent-primary text-bg-primary rounded font-bold disabled:opacity-50">
                {loading ? 'Procesando...' : editId ? 'Guardar Cambios' : 'Crear Perfil Pro'}
              </button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {barberos.map(b => (
          <div key={b.id} className="bg-bg-card p-4 md:p-6 rounded-xl border border-border-strong relative overflow-hidden flex flex-col sm:flex-row gap-6 hover:shadow-lg transition-shadow">
            
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => handleEdit(b)} className="p-2 bg-bg-tertiary hover:bg-bg-secondary rounded-full" title="Editar"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(b.id)} className="p-2 bg-bg-tertiary hover:bg-accent-error hover:text-white rounded-full text-accent-error"><Trash2 size={16} /></button>
            </div>

            {/* Fila Izquierda: Imagen y Bio */}
            <div className="flex flex-col items-center min-w-[120px] pt-4 sm:pt-0">
              {b.imageUrl ? (
                <img src={b.imageUrl} className={`w-24 h-24 min-w-[96px] flex-shrink-0 rounded-full object-cover border-4 mb-3 shadow-inner ${b.activo === false ? 'border-bg-tertiary grayscale' : 'border-accent-primary/20'}`} />
              ) : (
                <div className="w-24 h-24 min-w-[96px] flex-shrink-0 rounded-full border-4 border-bg-tertiary flex items-center justify-center font-display text-4xl text-text-muted mb-3 bg-bg-secondary">
                  {b.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${b.activo === false ? 'bg-bg-tertiary text-text-muted' : 'bg-accent-success/20 text-accent-success'}`}>
                {b.activo === false ? 'Inactivo' : 'Disponible'}
              </span>
            </div>

            {/* Fila Derecha: Info y Especialidades */}
            <div className="flex flex-col flex-1">
              <h4 className="font-bold text-2xl pr-12 leading-tight">{b.nombre}</h4>
              <p className="text-xs text-text-muted mb-2 font-mono">{b.emailAuth}</p>
              
              {b.biografia && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2 italic border-l-2 border-border-strong pl-2">"{b.biografia}"</p>
              )}

              <div className="mb-4">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Especialista en:</span>
                <div className="flex flex-wrap gap-1">
                  {b.especialidades?.length > 0 ? (
                    b.especialidades.map((e: string, i: number) => (
                      <span key={i} className="text-xs bg-bg-tertiary text-text-primary px-2 py-1 rounded-sm border border-border-subtle">{e}</span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted italic">Sin especialidades registradas</span>
                  )}
                </div>
              </div>

              {/* Botoneras Inferiores */}
              <div className="mt-auto flex gap-2 border-t border-border-subtle pt-3">
                <button onClick={() => handleResetPassword(b.emailAuth)} className="flex-1 py-1.5 text-xs text-text-muted hover:text-accent-primary hover:bg-bg-tertiary rounded transition-colors text-center border border-transparent hover:border-border-subtle">
                  🔑 Reset Auth
                </button>
                <button onClick={() => handleToggleActivo(b)} className={`flex-1 py-1.5 text-xs rounded transition-colors ${b.activo === false ? 'bg-accent-success text-bg-primary' : 'bg-bg-tertiary text-text-primary border border-border-strong hover:bg-bg-secondary'}`}>
                  {b.activo === false ? 'Habilitar Perfil' : 'Suspender'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {barberos.length === 0 && (
          <div className="col-span-2 text-center py-12 border border-dashed border-border-subtle rounded-lg text-text-muted">
            No tienes miembros en tu equipo aún.
          </div>
        )}
      </div>
    </div>
  );
}


