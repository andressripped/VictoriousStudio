// src/js/ui/calendarUI.js
import { DB } from '../api/db.js';
import { showNotification } from './modal.js';
import { iniciarReserva } from '../api/db-booking.js';

let calendar = null;

export function actualizarCalendarioEnTiempoReal() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !window.FullCalendar) return;

    if (calendar) calendar.destroy();

    const eventos = (DB.reservas || []).filter(r => r.estado === 'confirmada').map(r => ({
        title: `✓ ${r.clienteNombre ? r.clienteNombre.split(' ')[0] : 'Reservado'}`,
        start: `${r.fecha}T${r.hora}:00`,
        color: 'var(--accent-success)',
        textColor: 'white'
    }));

    DB.horarios.diasBloqueados.forEach(b => {
        eventos.push({
            title: b.hora ? `Bloqueado (${b.hora})` : 'Bloqueado',
            start: b.hora ? `${b.fecha}T${b.hora}:00` : b.fecha,
            color: 'var(--accent-error)',
            textColor: 'white',
            display: b.hora ? 'auto' : 'background'
        });
    });

    calendar = new window.FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        height: 'auto',
        events: eventos,
        dateClick: function (info) {
            const fecha = info.dateStr;
            const hoy = new Date().toISOString().split('T')[0];
            if (fecha < hoy) {
                showNotification('No puedes reservar en fechas pasadas', 'warning');
                return;
            }
            const bloqueado = DB.horarios.diasBloqueados.some(d => d.fecha === fecha && !d.hora);
            if (bloqueado) {
                showNotification('Día bloqueado por administración', 'error');
                return;
            }
            iniciarReserva();
            setTimeout(() => {
                window.seleccionarFecha(fecha);
                window.showStep(2);
            }, 100);
        },
        dayCellDidMount: function (info) {
            const fecha = info.date.toISOString().split('T')[0];
            const hoy = new Date().toISOString().split('T')[0];
            
            // Estilos Premium Dark Theme para calendarios
            info.el.style.borderColor = 'var(--border-white)';
            
            if (fecha < hoy) {
                info.el.style.opacity = '0.3';
                info.el.style.pointerEvents = 'none';
            }
            const bloqueado = DB.horarios.diasBloqueados.some(d => d.fecha === fecha && !d.hora);
            if (bloqueado) {
                info.el.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; // error color
                info.el.style.pointerEvents = 'none';
            }
        }
    });

    calendar.render();
    actualizarProximaDisponibilidad();
}

function actualizarProximaDisponibilidad() {
    const hoy = new Date();
    let proximaFecha = null;

    for (let i = 0; i < 30; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + i);
        const diaSemana = fecha.getDay();
        const fechaStr = fecha.toISOString().split('T')[0];

        const esDiaLaboral = DB.horarios.diasLaborales.includes(diaSemana);
        const bloqueado = DB.horarios.diasBloqueados.some(d => d.fecha === fechaStr);

        if (esDiaLaboral && !bloqueado) {
            proximaFecha = fecha;
            break;
        }
    }

    const element = document.getElementById('nextAvailableDate');
    if (proximaFecha && element) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        element.textContent = proximaFecha.toLocaleDateString('es', options);
    }
}

// Export for global usage bridging
export function bindCalendarEvents() {
    window.actualizarCalendarioEnTiempoReal = actualizarCalendarioEnTiempoReal;
}
