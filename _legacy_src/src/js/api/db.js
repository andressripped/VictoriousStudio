// src/js/api/db.js
// Mock DB inicial antes de migrar a Firebase para el Panel de Control y Reservas

const STORAGE_KEY = 'victorious_studio_db';

// Función para encriptar contraseñas (simulada)
export function encryptPassword(password) {
    return btoa(password + '_victorious_2024');
}

// Función para verificar contraseña
export function verifyPassword(inputPassword, storedPassword) {
    return encryptPassword(inputPassword) === storedPassword;
}

// ===== BASE DE DATOS INICIAL =====
export let DB = {
    // SUPERADMIN (predefinido)
    superadmin: {
        username: 'andres',
        password: encryptPassword('danika'),
        name: 'Andres Superadmin',
        role: 'superadmin',
        email: 'andres@victorious.com',
        createdAt: new Date().toISOString()
    },

    // Administradores creados por el superadmin
    admins: [],

    // Clientes
    clientes: [
        {
            id: 1,
            nombre: 'Juan Pérez',
            telefono: '+57 300 123 4567',
            email: 'juan@example.com',
            visitas: 3,
            ultimaVisita: '2024-03-15',
            preferencias: 'Prefiere lado derecho, corte fade',
            notas: 'Cliente frecuente'
        },
        {
            id: 2,
            nombre: 'Carlos Rodríguez',
            telefono: '+57 310 987 6543',
            email: 'carlos@example.com',
            visitas: 1,
            ultimaVisita: '2024-03-18',
            preferencias: 'Barba completa',
            notas: 'Primera vez'
        }
    ],

    // Servicios
    servicios: [
        {
            id: 1,
            nombre: 'Corte Signature',
            descripcion: 'Corte de cabello premium con diseño personalizado',
            precio: 35000,
            duracion: 45,
            categoria: 'corte',
            activo: true
        },
        {
            id: 2,
            nombre: 'Afeitado Maestro',
            descripcion: 'Afeitado clásico con toalla caliente y productos premium',
            precio: 40000,
            duracion: 60,
            categoria: 'afeitado',
            activo: true
        },
        {
            id: 3,
            nombre: 'Experiencia Total',
            descripcion: 'Corte + Afeitado + Tratamiento facial completo',
            precio: 65000,
            duracion: 90,
            categoria: 'combo',
            activo: true
        },
        {
            id: 4,
            nombre: 'Diseño de Barba',
            descripcion: 'Diseño y mantenimiento de barba',
            precio: 25000,
            duracion: 30,
            categoria: 'barba',
            activo: true
        }
    ],

    // Reservas
    reservas: [],

    // Horarios configurados
    horarios: {
        diasLaborales: [1, 2, 3, 4, 5, 6], // Lunes a Sábado (0 = Domingo)
        horaInicio: '09:00',
        horaFin: '19:00',
        duracionCita: 60,
        tiempoEntreCitas: 15,
        diasBloqueados: [],
        horariosEspeciales: []
    },

    // Configuración del sistema
    configuracion: {
        nombreBarberia: 'Victorious Studio',
        emailNotificaciones: 'notificaciones@victorious.com',
        recordatorioHoras: 24,
        cancelacionHoras: 2,
        mensajeConfirmacion: 'Gracias por tu reserva en {barberia}. Te esperamos el {fecha} a las {hora}.'
    },

    // Estadísticas
    estadisticas: {
        ingresosMensuales: 0,
        reservasEsteMes: 0,
        clientesNuevosEsteMes: 0,
        servicioMasPopular: ''
    }
};

// Cargar DB desde localStorage al iniciar
export function loadDB() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const defaultServicios = DB.servicios;
    
    if (stored) {
        try {
            DB = { ...DB, ...JSON.parse(stored) };
            if (!DB.servicios || DB.servicios.length === 0) DB.servicios = defaultServicios;
        } catch(e) {
            console.error("Error cargando DB:", e);
        }
    } else {
        guardarDB();
    }
    return DB;
}

// Guardar DB en localStorage
export function guardarDB() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}

// Initializar Firebase Auth local
export function inicializaSesion(onSessionEnd) {
    if (window.auth && window.auth.onAuthStateChanged) {
        window.auth.onAuthStateChanged((user) => {
           if (user) {
               console.log("Sesion Firebase activa");
           } else {
               if(onSessionEnd) onSessionEnd();
           }
        });
    }
}

// Inicializar DB, simula el listener de Firebase por ahora o delega en Firebase si se implementa
export async function inicializarDB(onUpdate) {
    // Injectamos el listener real de Firestore
    import('./db-firestore.js').then(modulo => {
        try {
            modulo.escucharCambiosFirestore(onUpdate);
        } catch(e) {
            console.warn("Fallo Firebase Firestore, usando Mock DB", e);
            loadDB();
            if (onUpdate) onUpdate();
        }
    }).catch(e => {
        console.warn("No se pudo cargar db-firestore.js", e);
        loadDB();
        if (onUpdate) onUpdate();
    });
}
