// src/js/api/db-services.js
import { DB, guardarDB } from './db.js';
import { showNotification } from '../ui/modal.js';

export function obtenerServiciosActivos() {
    return DB.servicios.filter(s => s.activo);
}

export function crearNuevoServicio(servicioData) {
    const { nombre, descripcion, precio, duracion, categoria } = servicioData;
    const nuevoServicio = {
        id: DB.servicios.length + 1,
        nombre,
        descripcion: descripcion || '',
        precio: parseInt(precio),
        duracion: parseInt(duracion),
        categoria,
        activo: true
    };

    DB.servicios.push(nuevoServicio);
    guardarDB();
    showNotification('Servicio creado exitosamente', 'success');
}

export function actualizarServicio(id, servicioData) {
    const servicio = DB.servicios.find(s => s.id === id);
    if (!servicio) return false;

    servicio.nombre = servicioData.nombre;
    servicio.descripcion = servicioData.descripcion;
    servicio.precio = parseInt(servicioData.precio);
    servicio.duracion = parseInt(servicioData.duracion);
    servicio.categoria = servicioData.categoria;
    servicio.activo = servicioData.activo;

    guardarDB();
    showNotification('Servicio actualizado exitosamente', 'success');
    return true;
}

export function eliminarServicio(id) {
    DB.servicios = DB.servicios.filter(s => s.id !== id);
    guardarDB();
    showNotification('Servicio eliminado', 'warning');
}
