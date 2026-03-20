// src/js/api/db-calendar.js
import { DB, guardarDB } from './db.js';
import { showNotification } from '../ui/modal.js';

export function crearBloqueo(bloqueoData) {
    const { fecha, tipo, motivo, horaInicio, horaFin } = bloqueoData;
    const bloqueo = { fecha, tipo, motivo };

    if (tipo === 'parcial') {
        bloqueo.horaInicio = horaInicio;
        bloqueo.horaFin = horaFin;
    }

    DB.horarios.diasBloqueados.push(bloqueo);
    guardarDB();
    showNotification('Horario bloqueado exitosamente', 'success');
}

export function eliminarBloqueo(index) {
    DB.horarios.diasBloqueados.splice(index, 1);
    guardarDB();
    showNotification('Bloqueo eliminado', 'warning');
}

export function actualizarDiaLaboral(dia, laboral) {
    if (laboral) {
        if (!DB.horarios.diasLaborales.includes(dia)) {
            DB.horarios.diasLaborales.push(dia);
        }
    } else {
        DB.horarios.diasLaborales = DB.horarios.diasLaborales.filter(d => d !== dia);
    }
    guardarDB();
    showNotification('Horario actualizado', 'success');
}

export function actualizarHorarioDia(dia, horaInicio, horaFin) {
    const horarioEspecialIndex = DB.horarios.horariosEspeciales.findIndex(h => h.dia === dia);

    if (horarioEspecialIndex >= 0) {
        DB.horarios.horariosEspeciales[horarioEspecialIndex].horaInicio = horaInicio;
        DB.horarios.horariosEspeciales[horarioEspecialIndex].horaFin = horaFin;
    } else {
        DB.horarios.horariosEspeciales.push({
            dia: dia,
            horaInicio: horaInicio,
            horaFin: horaFin
        });
    }

    guardarDB();
    showNotification('Horario del día actualizado', 'success');
}
