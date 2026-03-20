// src/js/app.js
// Archivo de orquestación principal (ligero, importando módulos)

import { inicializarDB } from './api/db.js';
import { bindBookingEvents, cargarServiciosPublicosDOM } from './ui/booking.js';
import { bindCalendarEvents, actualizarCalendarioEnTiempoReal } from './ui/calendarUI.js';
import { checkAuth, logout, handleLogin, currentUser } from './api/auth.js';
import { showNotification } from './ui/modal.js';
import { initTheme } from './ui/theme.js';
import { initBookingStepper } from './ui/booking-stepper.js';

// ===== ENRUTAMIENTO BÁSICO =====
export function navigateTo(viewId) {
    // Ocultar todas las vistas
    const views = document.querySelectorAll('.view-section');
    views.forEach(view => {
        if (view) view.style.display = 'none';
    });

    // Mostrar vista objetivo
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
    }

    // Actualizar URL hash sin disparar evento
    history.pushState(null, null, `#${viewId === 'public-site' ? '' : viewId.replace('-panel', '')}`);

    // Scroll al principio
    window.scrollTo(0, 0);

    // Inicializaciones específicas por vista
    if (viewId === 'admin-login') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.onsubmit = handleLogin;
        }
    } else if (viewId === 'superadmin-panel' || viewId === 'admin-panel') {
        if (!checkAuth()) {
            navigateTo('admin-login');
            return;
        }
        
        // Simular paneles (luego pueden dividirse en módulos ui/adminUI.js)
        if(viewId === 'superadmin-panel') {
             const welcomeMessage = document.getElementById('welcomeMessage');
             if(welcomeMessage) welcomeMessage.textContent = `Buenos días, ${currentUser?.name.split(' ')[0]}`;
        } else {
             const barberWelcome = document.getElementById('barberWelcome');
             if(barberWelcome) barberWelcome.textContent = `Buenos días, ${currentUser?.name.split(' ')[0]}`;
        }
    } else if (viewId === 'public-site') {
        cargarServiciosPublicosDOM();
        actualizarCalendarioEnTiempoReal();
    } else if (viewId === 'reserva-panel') {
        initBookingStepper();
    }
}

window.navigateTo = navigateTo;
window.logout = logout;

// ===== INICIALIZACIÓN =====
function initApp() {
    console.log("Inicializando Victorious Studio...");
    
    // Inicializar Motor de Temas
    initTheme();

    // Binding de eventos globales (como lo requerían los estilos inline o onclick originales)
    bindBookingEvents();
    bindCalendarEvents();
    
    // Inicializar BD
    inicializarDB(() => {
        // Callback al cargar BD
        const hash = window.location.hash.replace('#', '');
        
        // Enrutamiento inicial
        if (hash === 'admin' || hash === 'adm' || hash === 'login') {
            if (checkAuth()) {
                navigateTo(currentUser.role === 'superadmin' ? 'superadmin-panel' : 'admin-panel');
            } else {
                navigateTo('admin-login');
            }
        } else if (hash === 'reserva') {
            navigateTo('reserva-panel');
        } else {
            navigateTo('public-site');
        }
    });

    // Hash listener
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.replace('#', '');
        if (!currentUser) {
            if (hash === 'admin' || hash === 'adm') {
                navigateTo('admin-login');
            } else if (hash === 'reserva') {
                navigateTo('reserva-panel');
            } else if (hash === '') {
                navigateTo('public-site');
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);