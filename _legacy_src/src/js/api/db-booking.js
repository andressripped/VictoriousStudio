// src/js/api/db-booking.js
import { DB, guardarDB } from './db.js';
import { showNotification } from '../ui/modal.js';

// Reemplazar showNotification local o importarlo
// En DB estaban las lógicas de reservas, vamos a abstraer 

export function iniciarReserva() {
    // ScrollTo y reset
    window.servicioSeleccionado = null;
    window.fechaSeleccionada = null;
    window.horaSeleccionada = null;
    // Mostrar paso 1
    showStep(1);
    const section = document.getElementById('reserva');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

export function showStep(stepNumber) {
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) step.classList.remove('active');
    }
    const step = document.getElementById(`step${stepNumber}`);
    if (step) step.classList.add('active');

    // Aquí irían cargarDatePicker y cargarHorasDisponibles (que delegaremos a UI/BookingUI)
}

// Lógica de confirmación de reserva
export async function confirmarReservaLogica(formData) {
    const { nombre, telefono, email, notas, servicio, fecha, hora } = formData;

    if (!nombre || !telefono) {
        showNotification('Por favor completa todos los campos obligatorios', 'warning');
        return false;
    }

    if (!servicio || !fecha || !hora) {
        showNotification('Error en los datos de la reserva', 'error');
        return false;
    }

    const nuevaReserva = {
        clienteId: null,
        clienteNombre: nombre,
        clienteTelefono: telefono,
        clienteEmail: email || '',
        servicioId: servicio.id,
        servicioNombre: servicio.nombre,
        servicioPrecio: servicio.precio,
        fecha: fecha,
        hora: hora,
        duracion: servicio.duracion,
        estado: 'pendiente',
        notas: notas || '',
        createdAt: new Date().toISOString(),
        barberoId: 'victor'
    };

    try {
        // Obtenemos el cliente o lo creamos
        const appDb = await import('./db.js');
        let cliente = appDb.DB.clientes.find(c => c.telefono === telefono);
        let clienteIdRef = null;
        
        const { db } = await import('../core/firebase.js');

        if (!cliente) {
            // Firestore Add Client
            const newClientRef = await db.collection('clientes').add({
                nombre: nombre,
                telefono: telefono,
                email: email || '',
                visitas: 1,
                ultimaVisita: fecha,
                preferencias: notas,
                notas: 'Cliente nuevo desde web',
                createdAt: new Date().toISOString()
            });
            clienteIdRef = newClientRef.id;
        } else {
            // Firestore Update Client
            clienteIdRef = cliente.id;
            await db.collection('clientes').doc(clienteIdRef).update({
                visitas: (cliente.visitas || 0) + 1,
                ultimaVisita: fecha,
                preferencias: notas || cliente.preferencias
            });
        }
        
        nuevaReserva.clienteId = clienteIdRef;

        // Firestore Add Reserva
        await db.collection('reservas').add(nuevaReserva);
        
        return true;
    } catch(e) {
         console.warn("Fallo guardado en Firestore, usando fallback local", e);
         // Fallback a localStorage si falla la red o DB
         const idx = DB.reservas.length + 1;
         nuevaReserva.id = idx;
         DB.reservas.push(nuevaReserva);
         guardarDB();
         return true;
    }
}

export function cambiarEstadoReserva(id, nuevoEstado) {
    const reserva = DB.reservas.find(r => r.id === id);
    if (reserva) {
        reserva.estado = nuevoEstado;
        if (nuevoEstado === 'confirmada' && reserva.clienteId) {
            const cliente = DB.clientes.find(c => c.id === reserva.clienteId);
            if (cliente) {
                cliente.ultimaVisita = reserva.fecha;
            }
        }
        guardarDB();
        showNotification(`Reserva ${nuevoEstado} correctamente`, 'success');
        return true;
    }
    return false;
}

export function eliminarReserva(id) {
    DB.reservas = DB.reservas.filter(r => r.id !== id);
    guardarDB();
    showNotification('Reserva eliminada', 'warning');
}

export function obternerReservas() {
    return DB.reservas;
}
