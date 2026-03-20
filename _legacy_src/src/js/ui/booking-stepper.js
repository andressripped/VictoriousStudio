// src/js/ui/booking-stepper.js
import { bookingState } from '../core/store.js';
import { DB } from '../api/db.js';
import { showNotification } from './modal.js';
// Reuse the UI generators from booking.js where possible, but manage state here
import { cargarServiciosPublicosDOM } from './booking.js';

export function initBookingStepper() {
    // Expose globals for HTML onclicks
    window.nextStep = advanceStep;
    window.prevStep = retreatStep;
    window.seleccionarServicio = selectService;
    window.seleccionarFecha = selectDate;
    window.seleccionarHora = selectTime;
    window.cancelBookingNav = cancelBookingNav;
    
    // Recovery logic
    const state = bookingState.get();
    
    // Repopulate service selection if it exists
    if (state.servicioSeleccionadoId) {
        window.servicioSeleccionado = DB.servicios?.find(s => s.id === state.servicioSeleccionadoId) || null;
    }
    if (state.fechaSeleccionada) {
        window.fechaSeleccionada = state.fechaSeleccionada;
    }
    if (state.horaSeleccionada) {
        window.horaSeleccionada = state.horaSeleccionada;
    }
    
    // Si recuperamos un paso dinámico, debemos re-generar el contenido
    if (state.pasoActual >= 2 && typeof window.cargarDatePickerUI === 'function') window.cargarDatePickerUI();
    if (state.pasoActual >= 3 && typeof window.cargarHorasDisponiblesUI === 'function') window.cargarHorasDisponiblesUI();
    
    // Para marcar visualmente las selecciones recuperadas
    setTimeout(() => {
         if(state.fechaSeleccionada && state.pasoActual >= 2) {
             const slots = document.querySelectorAll('.date-slot');
             slots.forEach(slot => {
                 if(slot.innerText.includes(state.fechaSeleccionada.split('-')[2])) {
                     selectDate(state.fechaSeleccionada, slot);
                 }
             });
         }
         if(state.horaSeleccionada && state.pasoActual >= 3) {
             const slots = document.querySelectorAll('.time-slot');
             slots.forEach(slot => {
                 if(slot.innerText.includes(state.horaSeleccionada)) {
                     selectTime(state.horaSeleccionada, slot);
                 }
             });
         }
    }, 100);

    renderStep(state.pasoActual);
}

function updateProgress(stepNumber) {
    const progressBar = document.getElementById('booking-progress-bar');
    if (progressBar) {
        let percentage = (stepNumber / 4) * 100;
        if (stepNumber === 5) percentage = 100;
        progressBar.style.width = `${percentage}%`;
    }
}

function renderStep(stepNumber) {
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            step.classList.remove('active');
            // Hack for the CSS transition issue if any
            if (i !== stepNumber) {
                setTimeout(() => step.style.display = 'none', 400); // Wait for opacity fade
            }
        }
    }
    
    const step = document.getElementById(`step${stepNumber}`);
    if (step) {
        step.style.display = 'block';
        // Force reflow
        void step.offsetWidth;
        step.classList.add('active');
    }
    
    updateProgress(stepNumber);
    bookingState.set({ pasoActual: stepNumber });
}

export function advanceStep(next) {
    const state = bookingState.get();
    
    if (next === 2 && !state.servicioSeleccionadoId) {
        showNotification('Por favor selecciona un servicio', 'warning');
        return;
    }
    if (next === 3 && !state.fechaSeleccionada) {
        showNotification('Por favor selecciona una fecha', 'warning');
        return;
    }
    if (next === 4 && !state.horaSeleccionada) {
        showNotification('Por favor selecciona una hora', 'warning');
        return;
    }

    // Call UI generator for dynamic steps (you can assume they are global window functions or export them from booking.js)
    if (next === 2 && typeof window.cargarDatePickerUI === 'function') window.cargarDatePickerUI();
    if (next === 3 && typeof window.cargarHorasDisponiblesUI === 'function') window.cargarHorasDisponiblesUI();

    renderStep(next);
}

export function retreatStep(prev) {
    renderStep(prev);
}

export function selectService(servicioId) {
    bookingState.set({ servicioSeleccionadoId: servicioId });
    window.servicioSeleccionado = DB.servicios.find(s => s.id === servicioId);
    showNotification(`Servicio seleccionado: ${window.servicioSeleccionado?.nombre}`, 'success');

    // Visual update
    document.querySelectorAll('#step1Services .service-card').forEach(card => {
        card.style.borderColor = 'var(--border-subtle)';
        card.style.backgroundColor = 'var(--bg-card)';
    });
    // This requires clicking the exact card, handled in booking.js usually.
}

export function selectDate(fecha, element) {
    bookingState.set({ fechaSeleccionada: fecha });
    window.fechaSeleccionada = fecha;
    
    document.querySelectorAll('.date-slot').forEach(slot => {
        slot.style.borderColor = 'var(--border-subtle)';
        slot.style.background = 'transparent';
    });
    if (element) {
        element.style.borderColor = 'var(--accent-primary)';
        element.style.background = 'rgba(197, 160, 89, 0.1)';
    }
}

export function selectTime(hora, element) {
    bookingState.set({ horaSeleccionada: hora });
    window.horaSeleccionada = hora;
    
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('btn-primary');
        slot.classList.add('btn-secondary');
    });
    if (element) {
        element.classList.remove('btn-secondary');
        element.classList.add('btn-primary');
    }
}

export function cancelBookingNav() {
    if (confirm('¿Estás seguro de volver al inicio? Tu progreso de reserva se perderá.')) {
        bookingState.clear();
        // Reset steps
        renderStep(1);
        window.navigateTo('public-site');
        window.location.hash = ''; // Clear hash
    }
}

// Interceptar onSubmit de la reserva - este puede sobreescribir confirmarReservaUI
export async function handleConfirmBooking() {
    // Se delega a la logica principal, y luego se limpia
    if (typeof window.confirmarReserva === 'function') {
        window.confirmarReserva().then((success) => {
            if(success) {
                bookingState.clear(); // Limpiamos el state una vez confirmada exitosamente
                renderStep(5);
            }
        });
    }
}
window.handleConfirmBooking = handleConfirmBooking;
