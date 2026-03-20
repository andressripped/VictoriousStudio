// src/js/ui/booking.js
import { DB } from '../api/db.js';
import { iniciarReserva, showStep, confirmarReservaLogica } from '../api/db-booking.js';
import { showNotification } from './modal.js';
import { bookingState } from '../core/store.js';

// Esto enlaza la lógica pura (db-booking) con el renderizado del DOM en index.html

export function bindBookingEvents() {
    // Aquí podemos enlazar botones si es necesario, 
    // pero como el HTML original usaba onclick="..." globales, por ahora los re-exponemos.
    window.iniciarReserva = iniciarReserva;
    window.seleccionarServicio = seleccionarServicioUI;
    window.showStep = showStep;
    window.nextStep = nextStepUI;
    window.prevStep = showStep;
    window.seleccionarFecha = seleccionarFechaUI;
    window.seleccionarHora = seleccionarHoraUI;
    window.confirmarReserva = confirmarReservaUI;
    window.nuevaReserva = nuevaReservaUI;
}

export function cargarServiciosPublicosDOM() {
    const servicesGrid = document.getElementById('servicesGrid');
    const step1Services = document.getElementById('step1Services');

    if (!servicesGrid || !step1Services) return;

    servicesGrid.innerHTML = '';
    step1Services.innerHTML = '';

    if (!DB.servicios) return;
    
    DB.servicios.filter(s => s?.activo).forEach(servicio => {
        // Para la sección de servicios
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card card'; // Adaptado al nuevo Main CSS
        serviceCard.style = "padding: var(--space-xl); margin-bottom: var(--space-md); text-align: center;";
        serviceCard.innerHTML = `
            <div class="service-header">
                <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--accent-primary);">${servicio.nombre}</h3>
                <div style="font-weight: bold; font-size: 1.25rem; margin: var(--space-md) 0;">$${servicio.precio.toLocaleString()}</div>
            </div>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: var(--space-lg);">${servicio.descripcion}</p>
            <ul style="list-style:none; padding:0; margin-bottom: var(--space-lg); color: var(--text-secondary); font-size: 0.85rem;">
                <li style="margin-bottom: var(--space-sm);"><span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle; color:var(--accent-primary);">schedule</span> Duración: ${servicio.duracion} min</li>
                <li><span class="material-symbols-outlined" style="font-size:1rem; vertical-align:middle; color:var(--accent-primary);">workspace_premium</span> Productos premium</li>
            </ul>
            <button class="btn btn-primary btn-block" onclick="seleccionarServicio(${servicio.id})">
                Reservar este servicio
            </button>
        `;
        servicesGrid.appendChild(serviceCard);

        // Para el paso 1 de reserva
        const stepServiceCard = document.createElement('div');
        stepServiceCard.className = 'service-card card';
        stepServiceCard.style = "padding: var(--space-md); margin-bottom: var(--space-sm); cursor: pointer;";
        stepServiceCard.onclick = () => seleccionarServicioUI(servicio.id);
        stepServiceCard.innerHTML = `
            <div class="service-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size: 1.1rem; margin:0;">${servicio.nombre}</h3>
                <div style="font-weight: bold; color: var(--accent-primary);">$${servicio.precio.toLocaleString()}</div>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: var(--space-sm) 0;">${servicio.descripcion}</p>
        `;
        step1Services.appendChild(stepServiceCard);
    });
}

function seleccionarServicioUI(servicioId) {
    window.servicioSeleccionado = DB.servicios.find(s => s.id === servicioId);
    bookingState.set({ servicioSeleccionadoId: servicioId });
    showNotification(`Servicio seleccionado: ${window.servicioSeleccionado.nombre}`, 'success');

    // Marcar como seleccionado visualmente
    document.querySelectorAll('#step1Services .service-card').forEach(card => {
        card.style.borderColor = 'var(--border-white)';
        card.style.backgroundColor = 'var(--bg-card)';
    });

    // Como rehicimos la tarjeta, buscamos por onclick o contenido, asumamos onclick
    const selectedCard = document.querySelector(`#step1Services .service-card`); // TODO match id
    // ... simplificado visualmente para refactor
}

function cargarDatePickerUI() {
    const datePicker = document.getElementById('datePicker');
    if (!datePicker) return;
    datePicker.innerHTML = '';

    const hoy = new Date();
    for (let i = 0; i < 30; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + i);

        const diaSemana = fecha.getDay();
        const esDiaLaboral = DB.horarios.diasLaborales.includes(diaSemana);
        const fechaStr = fecha.toISOString().split('T')[0];
        const bloqueado = DB.horarios.diasBloqueados.some(d => d.fecha === fechaStr);

        const diaElement = document.createElement('div');
        diaElement.className = `date-slot card ${!esDiaLaboral || bloqueado ? 'bloqueado' : ''}`;
        diaElement.style = `padding: var(--space-md); text-align: center; cursor: pointer; opacity: ${!esDiaLaboral || bloqueado ? '0.3' : '1'}; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); min-width: 80px;`;
        
        diaElement.innerHTML = `
            <div style="font-size: 0.75rem; color: var(--accent-primary); text-transform: uppercase;">${fecha.toLocaleDateString('es', { weekday: 'short' })}</div>
            <div style="font-size: 1.5rem; font-family: var(--font-display); margin: var(--space-xs) 0;">${fecha.getDate()}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${fecha.toLocaleDateString('es', { month: 'short' })}</div>
        `;

        if (esDiaLaboral && !bloqueado) {
            diaElement.onclick = () => window.seleccionarFecha(fechaStr, diaElement);
        }

        datePicker.appendChild(diaElement);
    }
}

function cargarHorasDisponiblesUI() {
    const timeSlots = document.getElementById('timeSlots');
    if (!timeSlots || !window.fechaSeleccionada) return;
    timeSlots.innerHTML = '';

    const inicio = new Date(`${window.fechaSeleccionada}T${DB.horarios.horaInicio}:00`);
    const fin = new Date(`${window.fechaSeleccionada}T${DB.horarios.horaFin}:00`);
    let horaActual = new Date(inicio);

    while (horaActual < fin) {
        const horaStr = horaActual.toTimeString().substring(0, 5);
        const ocupado = DB.reservas.some(r => r.fecha === window.fechaSeleccionada && r.hora === horaStr && r.estado !== 'cancelada');

        const slot = document.createElement('div');
        slot.className = `time-slot btn ${ocupado ? 'btn-ghost' : 'btn-secondary'}`;
        slot.style = `margin: var(--space-xs); opacity: ${ocupado ? '0.3' : '1'}; pointer-events: ${ocupado ? 'none' : 'auto'};`;
        slot.innerHTML = `${horaStr}`;

        if (!ocupado) {
            slot.onclick = () => window.seleccionarHora(horaStr, slot);
        }

        timeSlots.appendChild(slot);
        horaActual.setMinutes(horaActual.getMinutes() + (window.servicioSeleccionado?.duracion || 30) + DB.horarios.tiempoEntreCitas);
    }
}

function seleccionarFechaUI(fecha, element) {
    window.fechaSeleccionada = fecha;
    bookingState.set({ fechaSeleccionada: fecha });
    document.querySelectorAll('.date-slot').forEach(slot => {
        slot.style.borderColor = 'var(--border-subtle)';
        slot.style.background = 'transparent';
    });
    if (element) {
        element.style.borderColor = 'var(--accent-primary)';
        element.style.background = 'rgba(197, 160, 89, 0.1)';
    }
    showNotification(`Fecha seleccionada: ${fecha}`, 'success');
}

function seleccionarHoraUI(hora, element) {
    window.horaSeleccionada = hora;
    bookingState.set({ horaSeleccionada: hora });
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('btn-primary');
        slot.classList.add('btn-secondary');
    });
    if (element) {
        element.classList.remove('btn-secondary');
        element.classList.add('btn-primary');
    }
    showNotification(`Hora seleccionada: ${hora}`, 'success');
}

function nextStepUI(next) {
    if (next === 2 && !window.servicioSeleccionado) {
        showNotification('Por favor selecciona un servicio', 'warning');
        return;
    }
    if (next === 3 && !window.fechaSeleccionada) {
        showNotification('Por favor selecciona una fecha', 'warning');
        return;
    }
    if (next === 4 && !window.horaSeleccionada) {
        showNotification('Por favor selecciona una hora', 'warning');
        return;
    }

    if (next === 2) cargarDatePickerUI();
    if (next === 3) cargarHorasDisponiblesUI();

    showStep(next);
}

async function confirmarReservaUI() {
    const formData = {
        nombre: document.getElementById('clienteNombre')?.value,
        telefono: document.getElementById('clienteTelefono')?.value,
        email: document.getElementById('clienteEmail')?.value,
        notas: document.getElementById('clienteNotas')?.value,
        servicio: window.servicioSeleccionado,
        fecha: window.fechaSeleccionada,
        hora: window.horaSeleccionada
    };

    const exito = await confirmarReservaLogica(formData);
    
    if (exito) {
        // Renderizar confirmación
        const reservaDetalles = document.getElementById('reservaDetalles');
        if(reservaDetalles){
            reservaDetalles.innerHTML = `
                <div style="background: var(--bg-tertiary); padding: var(--space-xl); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); text-align: left;">
                    <h4 style="color: var(--accent-primary); margin-bottom: var(--space-md); font-family: var(--font-display);">Detalles de tu Cita</h4>
                    <p style="margin-bottom: var(--space-sm);"><strong style="color: var(--text-muted);">Servicio:</strong> ${formData.servicio.nombre}</p>
                    <p style="margin-bottom: var(--space-sm);"><strong style="color: var(--text-muted);">Costo:</strong> $${formData.servicio.precio.toLocaleString()}</p>
                    <p style="margin-bottom: var(--space-sm);"><strong style="color: var(--text-muted);">Fecha:</strong> ${formData.fecha}</p>
                    <p style="margin-bottom: 0;"><strong style="color: var(--text-muted);">Hora:</strong> ${formData.hora}</p>
                </div>
            `;
        }
        showStep(5);
        if(window.actualizarCalendarioEnTiempoReal) window.actualizarCalendarioEnTiempoReal();
        
        // Limpiar
        ['clienteNombre','clienteTelefono','clienteEmail','clienteNotas'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = '';
        });
        showNotification('¡Reserva creada exitosamente! Te contactaremos para confirmar.', 'success');
    }
}

function nuevaReservaUI() {
    ['clienteNombre','clienteTelefono','clienteEmail','clienteNotas'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
    showStep(1);
    const section = document.getElementById('reserva');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}
