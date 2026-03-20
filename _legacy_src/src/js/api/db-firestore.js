// src/js/api/db-firestore.js
// Funciones de sincronización reales con Firebase Firestore

import { db } from '../core/firebase.js';
import { DB, guardarDB, loadDB } from './db.js';

export function escucharCambiosFirestore(onUpdate) {
    let calledUpdate = false;
    const fireUpdate = () => {
        if (!calledUpdate && onUpdate) {
            calledUpdate = true;
            onUpdate();
        }
    };

    // 1. Escuchar Clientes
    db.collection('clientes').onSnapshot((snapshot) => {
        const clientesFB = [];
        snapshot.forEach(doc => {
            clientesFB.push({ id: doc.id, ...doc.data() });
        });
        DB.clientes = clientesFB;
        fireUpdate();
    }, (error) => {
        console.warn("Firestore clientes inaccesible. Usando local:", error.message);
        loadDB();
        fireUpdate();
    });

    // 2. Escuchar Reservas
    db.collection('reservas').onSnapshot((snapshot) => {
        const reservasFB = [];
        snapshot.forEach(doc => {
            reservasFB.push({ id: doc.id, ...doc.data() });
        });
        DB.reservas = reservasFB;
        // Solo llamar a update si la UI ya requiere rerender
        if (calledUpdate && window.actualizarCalendarioEnTiempoReal) {
             window.actualizarCalendarioEnTiempoReal();
        } else {
             fireUpdate();
        }
    }, (error) => {
        console.warn("Firestore reservas inaccesible. Usando local:", error.message);
        loadDB();
        fireUpdate();
    });

    // 3. Escuchar Servicios
    db.collection('servicios').onSnapshot((snapshot) => {
        const serviciosFB = [];
        snapshot.forEach(doc => {
            serviciosFB.push({ id: doc.id, ...doc.data() });
        });
        if(serviciosFB.length > 0) {
            DB.servicios = serviciosFB;
        }
        fireUpdate();
    }, (error) => {
        console.warn("Firestore servicios inaccesible. Usando local:", error.message);
        loadDB();
        fireUpdate();
    });
}
