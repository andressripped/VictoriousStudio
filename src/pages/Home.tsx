import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import ServiceCardSkeleton from '../components/skeletons/ServiceCardSkeleton';

// Componente de Fondo Minimalista (Propuesta 3 - Refinado)
const LiquidMinimalBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden blur-[120px] opacity-[0.03]">
        <div className="mesh-ball absolute top-[-20%] left-[-10%] w-[1200px] h-[1200px] bg-accent-primary rounded-full animate-[float_30s_ease-in-out_infinite]"></div>
        <div className="mesh-ball absolute bottom-[-10%] right-[-20%] w-[1400px] h-[1400px] bg-accent-secondary rounded-full animate-[float_40s_ease-in-out_infinite_reverse]"></div>
    </div>
);

export default function Home() {
  const [servicios, setServicios] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snap) => {
      setServicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubServicios();
    };
  }, []);

  const handleServiceClick = (servicio: any) => {
    navigate('/reserva', { state: { selectedService: servicio } });
  };

  return (
    <div className="flex flex-col relative bg-bg-primary">
      <LiquidMinimalBackground />
      
      <div className="relative z-10 flex flex-col overflow-hidden">
        {/* Hero Refinado */}
        <section className="relative container mx-auto text-center pt-32 pb-32 px-4 animate-fade-in">
          {/* Sutil Resplandor de Fondo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>

          <span className="text-[0.625rem] uppercase tracking-[0.5em] text-accent-primary font-bold block mb-10 translate-y-4 animate-fade-in-up [animation-delay:200ms]">
            San Gil • Established 2016
          </span>

          <h1 className="text-6xl md:text-7xl font-display mb-10 leading-[1.1] animate-fade-in-up [animation-delay:400ms]">
            El arte del corte<br />
            <span className="italic font-normal text-accent-primary font-display">redefinido</span>
          </h1>

          <p className="text-text-muted max-w-[500px] mx-auto mb-14 text-lg md:text-xl leading-relaxed animate-fade-in-up [animation-delay:600ms]">
            Un ritual de autor esculpido con precisión para el hombre que entiende que su estilo es su carta de presentación.
          </p>

          <div className="flex justify-center animate-fade-in-up [animation-delay:800ms]">
            <Link
              to="/reserva"
              className="group relative overflow-hidden bg-accent-primary text-bg-primary font-bold py-5 px-12 rounded-xl uppercase tracking-[0.2em] text-xs transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(197,160,89,0.3)] active:scale-95"
            >
              <span className="relative z-10">Reservar Cita VIP</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Link>
          </div>
        </section>

        {/* Servicios con Jerarquía Mejorada */}
        <section id="servicios" className="relative container mx-auto px-6 py-32 bg-bg-secondary/50">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold text-accent-primary uppercase tracking-[0.4em] mb-4">La Experiencia</h2>
            <h3 className="text-4xl font-display">Nuestros Servicios de Autor</h3>
          </div>

          <div className="flex flex-wrap justify-center gap-10">
            {servicios.length === 0 ? (
              <ServiceCardSkeleton count={3} />
            ) : servicios.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => handleServiceClick(s)}
                className="w-full sm:w-[380px] bg-bg-card border border-border-subtle rounded-3xl overflow-hidden group hover:border-accent-primary/50 transition-all duration-500 flex flex-col shadow-sm hover:shadow-2xl hover:-translate-y-2 animate-fade-in-up cursor-pointer"
                style={{ animationDelay: `${idx * 150}ms` }}
                role="button"
                tabIndex={0}
                aria-label={`Reservar ${s.nombre} — $${s.precio}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleServiceClick(s); }}
              >
                {s.imageUrl && (
                  <div className="h-56 overflow-hidden relative">
                    {/* Overlay de diseño */}
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-60 z-10"></div>
                    <img
                      src={s.imageUrl}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      alt={s.nombre}
                    />
                    <div className="absolute bottom-4 left-6 z-20">
                      <span className="text-[10px] font-bold text-accent-primary bg-bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-full uppercase tracking-widest border border-accent-primary/20">
                        {s.duracion} MIN
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-8 pb-10 flex flex-col items-start flex-1 text-left relative">
                  <h4 className="text-2xl font-display font-bold mb-3 group-hover:text-accent-primary transition-colors">{s.nombre}</h4>
                  <p className="text-text-muted mb-8 text-sm leading-relaxed line-clamp-3 italic opacity-80">{s.descripcion}</p>

                  <div className="mt-auto w-full flex items-center justify-between pt-6 border-t border-border-subtle/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-subtle uppercase tracking-widest font-bold">Inversión</span>
                      <p className="text-2xl font-bold text-accent-primary font-display">${s.precio}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center text-text-subtle group-hover:border-accent-primary group-hover:text-accent-primary group-hover:bg-accent-primary/10 transition-all">
                      <span className="text-xl">→</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mapa con Presentación Sobria */}
        <section className="container mx-auto px-6 py-32">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
              <div className="lg:col-span-1">
                <h2 className="text-sm font-bold text-accent-primary uppercase tracking-[0.4em] mb-6">Ubicación</h2>
                <h3 className="text-4xl font-display mb-8">El Ritual de la<br />Victoria</h3>
                <p className="text-text-muted leading-relaxed mb-8">Visítanos en el corazón de San Gil. Un espacio diseñado para tu comodidad y confianza.</p>
                <div className="space-y-4">
                  <p className="text-sm font-bold flex items-center gap-3">
                    <span className="w-8 h-[1px] bg-accent-primary"></span>
                    SAN GIL, COLOMBIA
                  </p>
                  <p className="text-xs text-text-subtle tracking-widest">LUN - SÁB: 9:00 AM - 8:00 PM</p>
                </div>
              </div>
              <div className="lg:col-span-2 rounded-[2rem] overflow-hidden border border-border-subtle shadow-2xl relative group">
                <div className="absolute inset-0 border-[12px] border-bg-primary/20 pointer-events-none z-10 transition-all group-hover:border-bg-primary/10"></div>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.7381534005186!2d-73.1323727!3d6.5547934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e69c70016487bbd%3A0xa305314b0303b6e2!2sVictorious%20studio!5e0!3m2!1ses-419!2sco!4v1742358810237!5m2!1ses-419!2sco"
                  width="100%"
                  height="500"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Victorious Studio"
                ></iframe>
              </div>
            </div>
          </div>

          <div className="mt-32 text-center border-t border-border-subtle pt-20">
            <div className="text-2xl font-display font-bold tracking-tight text-text-primary mb-8 animate-fade-in">
              Victorious<span className="text-accent-primary italic font-normal">Studio</span>
            </div>
            <p className="text-text-subtle text-[10px] uppercase tracking-[0.6em] mb-4">El Ritual del Triunfador</p>
            <p className="text-text-subtle opacity-50 text-[10px]">© 2026 Victorious Studio • All Rights Reserved</p>
          </div>
        </section>
      </div>
    </div>
  );
}
