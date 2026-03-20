// src/js/core/firebase.js

// 1. CONFIGURACIÓN FIREBASE (Mantén tus llaves aquí)
const firebaseConfig = {
    apiKey: "AIzaSyDOVClPC3wxG15BAw0hgPnf3ZSZ_dCpxjA",
    authDomain: "victorious-9efcc.firebaseapp.com",
    projectId: "victorious-9efcc",
    storageBucket: "victorious-9efcc.firebasestorage.app",
    messagingSenderId: "1092917356284",
    appId: "1:1092917356284:web:098ee3017b9e6f6b8d9979"
};

// 2. INICIALIZAR SERVICIOS
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 3. EXPORTAR INSTANCIAS
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export const ROLES = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    CLIENTE: 'cliente'
};
