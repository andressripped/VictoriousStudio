// src/js/api/auth.js
import { auth, db, googleProvider, ROLES } from '../core/firebase.js';
import { Store } from '../core/store.js';
import { DB, verifyPassword } from './db.js';

// Variable global de sesión
export let currentUser = null;

export function checkAuth() {
    return currentUser !== null || Store.getState().user !== null;
}

export async function handleLogin(e) {
    if (e) e.preventDefault();
    const userInput = document.getElementById('username')?.value;
    const passInput = document.getElementById('password')?.value;
    
    // Check superadmin
    if (userInput && DB.superadmin && userInput === DB.superadmin.username && verifyPassword(passInput, DB.superadmin.password)) {
        currentUser = DB.superadmin;
        const err = document.getElementById('loginError');
        if (err) err.style.display = 'none';
        if (window.closeModal) window.closeModal('modal-login');
        window.navigateTo('superadmin-panel');
        return;
    }
    
    // Check admins
    if (userInput && DB.admins && DB.admins.length > 0) {
        const admin = DB.admins.find(a => a.username === userInput && verifyPassword(passInput, a.password));
        if (admin) {
            currentUser = admin;
            const err = document.getElementById('loginError');
            if (err) err.style.display = 'none';
            if (window.closeModal) window.closeModal('modal-login');
            window.navigateTo('admin-panel');
            return;
        }
    }
    
    // Fallback error
    const err = document.getElementById('loginError');
    if (err) err.style.display = 'block';
}

/**
 * Determina el rol del usuario consultando Firestore
 */
export async function determinarRol(user) {
    try {
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (adminDoc.exists) {
            const role = adminDoc.data().role || 'admin';
            return role === 'superadmin' ? ROLES.SUPERADMIN : ROLES.ADMIN;
        }
        return ROLES.CLIENTE;
    } catch (error) {
        console.error("Error al determinar rol:", error);
        return ROLES.CLIENTE;
    }
}

/**
 * Inicia sesión con Google Popup
 */
export async function loginWithGoogle() {
    try {
        Store.setState({ loading: true });
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Registrar o actualizar cliente en Firestore
        try {
            const userRef = db.collection('clientes').doc(user.uid);
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
                    primeraReserva: true
                });
            } else {
                await userRef.update({
                    nombre: user.displayName,
                    foto: user.photoURL,
                    email: user.email,
                    ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (dbError) {
            console.warn("No se pudo actualizar DB del cliente:", dbError);
        }

        const role = await determinarRol(user);
        Store.setState({ user, role, loading: false });
        currentUser = { ...user, role: role, name: user.displayName };
        
        return { user, role };
    } catch (error) {
        Store.setState({ loading: false });
        throw error;
    }
}

/**
 * Cierra sesión
 */
export async function logout() {
    if (auth.currentUser) {
        await auth.signOut();
    }
    Store.setState({ user: null, role: null });
    currentUser = null;
    window.navigateTo('public-site');
}

/**
 * Escucha cambios en la sesión
 */
export function initAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const role = await determinarRol(user);
            Store.setState({ user, role });
            currentUser = { ...user, role: role, name: user.displayName };
        } else {
            Store.setState({ user: null, role: null });
            currentUser = null;
        }
    });
}
