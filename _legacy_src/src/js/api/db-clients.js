// src/js/api/db-clients.js
import { DB, guardarDB } from './db.js';
import { showNotification } from '../ui/modal.js';

export function crearNuevoCliente(clienteData) {
    const { nombre, telefono, email, notas } = clienteData;
    const nuevoCliente = {
        id: DB.clientes.length + 1,
        nombre: nombre,
        telefono: telefono,
        email: email || '',
        visitas: 0,
        ultimaVisita: null,
        preferencias: '',
        notas: notas || '',
        createdAt: new Date().toISOString()
    };
    DB.clientes.push(nuevoCliente);
    guardarDB();
    showNotification('Cliente creado exitosamente', 'success');
    return nuevoCliente;
}

export function eliminarCliente(id) {
    DB.clientes = DB.clientes.filter(c => c.id !== id);
    DB.reservas = DB.reservas.filter(r => r.clienteId !== id);
    guardarDB();
    showNotification('Cliente eliminado', 'warning');
}

export function obtenerClientes() {
    return DB.clientes;
}
