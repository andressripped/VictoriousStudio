// 1. CONFIGURACIÓN FIREBASE (Mantén tus llaves aquí)
const firebaseConfig = {
  apiKey: "AIzaSyDOVClPC3wxG15BAw0hgPnf3ZSZ_dCpxjA",
  authDomain: "victorious-9efcc.firebaseapp.com",
  projectId: "victorious-9efcc",
  storageBucket: "victorious-9efcc.firebasestorage.app",
  messagingSenderId: "1092917356284",
  appId: "1:1092917356284:web:098ee3017b9e6f6b8d9979"
};

// 2. INICIALIZAR SERVICIOS - SOLO ESTO, SIN CONST
firebase.initializeApp(firebaseConfig);

// NO DECLARES CONST AQUÍ - LAS VAMOS A EXPORTAR EN window.firebaseApp

// 3. ROLES Y CONFIGURACIÓN
const googleProvider = new firebase.auth.GoogleAuthProvider();

const ROLES = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    CLIENTE: 'cliente'
};

const SERVICIO_VICTORIOUS = {
    id: 'corte-victorious',
    nombre: 'Corte Victorious',
    precio: 25000,
    duracion: 45
};

// Helper de formato
const formatCOP = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
};

// --- FUNCIONES DE AUTENTICACIÓN Y ROLES ---
async function determinarRol(user) {
    try {
        console.log("🔍 Buscando rol para usuario:", user.uid, user.email);
        
        const adminDoc = await firebase.firestore().collection('admins').doc(user.uid).get();
        
        if (adminDoc.exists) {
            const datos = adminDoc.data();
            const rolDelDocumento = datos.role || 'admin';
            
            if (rolDelDocumento === 'superadmin') {
                console.log("👑 Usuario es SUPERADMIN:", user.email);
                return ROLES.SUPERADMIN;
            } else if (rolDelDocumento === 'admin') {
                console.log("✅ Usuario es ADMIN:", user.email);
                return ROLES.ADMIN;
            }
        }
        
        console.log("👤 Usuario es CLIENTE:", user.email);
        return ROLES.CLIENTE;
        
    } catch (error) {
        console.error("❌ Error determinando rol:", error);
        return ROLES.CLIENTE;
    }
}

window.loginWithGoogle = async () => {
    try {
        console.log("🔵 loginWithGoogle() iniciado...");
        
        googleProvider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await firebase.auth().signInWithPopup(googleProvider);
        const user = result.user;
        
        console.log("👤 Usuario logueado:", user.email, "UID:", user.uid);
        
        // Guardar en Firestore
        try {
            const userRef = firebase.firestore().collection('clientes').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                await userRef.set({
                    nombre: user.displayName,
                    email: user.email,
                    foto: user.photoURL,
                    rol: ROLES.CLIENTE,
                    estado: 'activo',
                    fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                    cortesCompletados: 0,
                    telefono: '',
                    primeraReserva: true,
                    descuentoPrimera: true
                });
                console.log("✅ Nuevo cliente registrado");
            } else {
                await userRef.update({
                    nombre: user.displayName,
                    foto: user.photoURL,
                    email: user.email,
                    ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.warn("⚠️ Error guardando cliente:", error);
        }
        
        const rol = await determinarRol(user);
        console.log("✅ Rol determinado:", rol);
        // No se hace ninguna redirección aquí; el usuario permanece
        // en la página actual y puede navegar usando los menús que
        // se muestran tras iniciar sesión.

    } catch (error) {
        console.error("❌ Error:", error);

        if (error.code === 'auth/popup-closed-by-user') {
            return;
        } else if (error.code === 'auth/unauthorized-domain') {
            console.error('Dominio no autorizado. Agrega este dominio en la consola de Firebase.', error);
            if (typeof showNotification === 'function') showNotification('Dominio no autorizado. Agrega este dominio en Firebase Console', 'error');
        } else {
            if (typeof showNotification === 'function') showNotification('Error al iniciar sesión: ' + (error.message || error), 'error');
            else console.error('Error al iniciar sesión: ', error);
        }
    }
};

window.logout = () => {
    firebase.auth().signOut().then(() => {
        window.location.href = '../../index.html';
    });
};

// Exportar para uso global - AHORA SÍ DECLARAMOS LAS CONST AQUÍ
// Inicializa el menú de perfil (avatar + dropdown) en el header
window.initProfileMenu = function() {
    const avatar = document.getElementById('profile-avatar');
    const menu = document.getElementById('profile-menu');
    if (!avatar || !menu) return;
    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
    });
    document.addEventListener('click', () => {
        menu.classList.remove('open');
    });
};

window.firebaseApp = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage(),
    googleProvider, 
    ROLES,
    SERVICIO_VICTORIOUS, 
    formatCOP, 
    determinarRol,
    loginWithGoogle, 
    logout,
    initProfileMenu
};

console.log("✅ firebaseApp cargado correctamente", window.firebaseApp);