/**
 * ==========================================
 * CALENDARIO OPTIMIZADO - VICTORIOUS STUDIO
 * ==========================================
 * Sistema de calendario en tiempo real con:
 * - Renderizado rápido (Virtual DOM)
 * - Sincronización Firestore en tiempo real
 * - UI/UX mejorado
 * - Bloqueo de días/horas por admin
 * - Disponibilidad en tiempo real para clientes
 */

 (function() {
    'use strict';

    // ========== CONFIGURACIÓN ==========
    const CONFIG = {
        HORARIOS: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
        DURACION_CITA: 45,
        DIAS_LABORABLES: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
        NOMBRE_MESES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        NOMBRE_DIAS: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    };

    // ========== ESTADO GLOBAL ==========
    let estado = {
        mesActual: new Date().getMonth(),
        anoActual: new Date().getFullYear(),
        fechaSeleccionada: null,
        horaSeleccionada: null,
        diasBloqueados: new Set(),
        horasBloqueadas: {}, // { '2024-02-20': ['09:00', '10:00'] }
        citasDelMes: new Map(), // { '2024-02-20': ['09:00', '10:00'] }
        listenerCitas: null,
        listenerBloqueos: null,
        isAdmin: false,
        onFechaSeleccionada: null,
        onHoraSeleccionada: null,
        onCargaCompleta: null
    };

    // ========== VIRTUAL DOM ==========
    const VDOM = {
        crearElemento(tag, attrs, children = []) {
            const el = document.createElement(tag);
            if (attrs) {
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key === 'className') el.className = value;
                    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
                    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
                    else el.setAttribute(key, value);
                });
            }
            children.forEach(child => {
                if (typeof child === 'string') el.appendChild(document.createTextNode(child));
                else if (child instanceof Element) el.appendChild(child);
            });
            return el;
        },
        renderizar(container, node) {
            // node es un elemento DOM ya creado
            const start = performance.now();
            if (!container) return;
            while (container.firstChild) container.removeChild(container.firstChild);
            container.appendChild(node);
            const tiempo = performance.now() - start;
            console.log(`📅 Calendario renderizado en ${tiempo.toFixed(2)}ms`);
        }
    };

    // Util: formatea Date -> YYYY-MM-DD
    function formatoFechaISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // ========== FIRESTORE - GESTIÓN EN TIEMPO REAL ==========
    const CalendarioFirestore = {
        db() {
            return (window.firebaseApp && window.firebaseApp.db) || (window.firebase && window.firebase.firestore && window.firebase);
        },

        async cargarBloqueos() {
            try {
                const db = this.db();
                if (!db) return;
                const snapshot = await db.collection('bloqueos').get();
                estado.diasBloqueados.clear();
                estado.horasBloqueadas = {};
                snapshot.forEach(doc => {
                    const b = doc.data();
                    const fecha = b.fecha;
                    if (!fecha) return;
                    if (b.hora) {
                        if (!estado.horasBloqueadas[fecha]) estado.horasBloqueadas[fecha] = [];
                        estado.horasBloqueadas[fecha].push(b.hora);
                    } else {
                        estado.diasBloqueados.add(fecha);
                    }
                });
            } catch (e) {
                console.error('Error cargarBloqueos', e);
            }
        },

        async cargarCitasMes() {
            try {
                const db = this.db();
                if (!db) return;
                const snapshot = await db.collection('citas').get();
                estado.citasDelMes.clear();
                snapshot.forEach(doc => {
                    const c = doc.data();
                    if (!c.fecha || !c.hora) return;
                    if (!estado.citasDelMes.has(c.fecha)) estado.citasDelMes.set(c.fecha, []);
                    estado.citasDelMes.get(c.fecha).push({ hora: c.hora, id: doc.id, estado: c.estado || 'pendiente' });
                });
            } catch (e) {
                console.error('Error cargarCitasMes', e);
            }
        },

        inicializarListeners(isAdmin = false) {
            estado.isAdmin = isAdmin;
            const db = this.db();
            if (!db) return;

            // Listener citas
            if (estado.listenerCitas) estado.listenerCitas();
            estado.listenerCitas = db.collection('citas').onSnapshot(snapshot => {
                estado.citasDelMes.clear();
                snapshot.forEach(doc => {
                    const c = doc.data();
                    if (!c.fecha || !c.hora) return;
                    if (!estado.citasDelMes.has(c.fecha)) estado.citasDelMes.set(c.fecha, []);
                    estado.citasDelMes.get(c.fecha).push({ hora: c.hora, id: doc.id, estado: c.estado || 'pendiente' });
                });
                CalendarioUI.render();
            }, err => console.error('Listener citas', err));

            // Listener bloqueos
            if (estado.listenerBloqueos) estado.listenerBloqueos();
            estado.listenerBloqueos = db.collection('bloqueos').onSnapshot(snapshot => {
                estado.diasBloqueados.clear();
                estado.horasBloqueadas = {};
                snapshot.forEach(doc => {
                    const b = doc.data();
                    const fecha = b.fecha;
                    if (!fecha) return;
                    if (b.hora) {
                        if (!estado.horasBloqueadas[fecha]) estado.horasBloqueadas[fecha] = [];
                        estado.horasBloqueadas[fecha].push(b.hora);
                    } else {
                        estado.diasBloqueados.add(fecha);
                    }
                });
                CalendarioUI.render();
            }, err => console.error('Listener bloqueos', err));
        },

        async crearReserva(reserva) {
            const db = this.db(); if (!db) throw new Error('No Firestore db');
            return db.collection('citas').add(reserva);
        },

        async bloquear(bloqueo) {
            const db = this.db(); if (!db) throw new Error('No Firestore db');
            return db.collection('bloqueos').add(bloqueo);
        },

        async eliminarBloqueoPorId(id) {
            const db = this.db(); if (!db) throw new Error('No Firestore db');
            return db.collection('bloqueos').doc(id).delete();
        },

        desconectar() {
            if (estado.listenerCitas) estado.listenerCitas();
            if (estado.listenerBloqueos) estado.listenerBloqueos();
            estado.listenerCitas = null; estado.listenerBloqueos = null;
        }
    };

    // ========== UI del Calendario ==========
    const CalendarioUI = {
        init(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) throw new Error('Contenedor del calendario no encontrado: ' + containerId);
            CalendarioFirestore.inicializarListeners(window.userRole === 'admin' || window.userRole === 'superadmin');
            this.render();
        },

        crearHeader() {
            const header = VDOM.crearElemento('div', { className: 'cal-header' }, []);
            const prev = VDOM.crearElemento('button', { className: 'cal-prev', onClick: () => { estado.mesActual--; if (estado.mesActual<0){estado.mesActual=11; estado.anoActual--;} this.render(); } }, ['◀']);
            const next = VDOM.crearElemento('button', { className: 'cal-next', onClick: () => { estado.mesActual++; if (estado.mesActual>11){estado.mesActual=0; estado.anoActual++;} this.render(); } }, ['▶']);
            const title = VDOM.crearElemento('div', { className: 'cal-title' }, [`${CONFIG.NOMBRE_MESES[estado.mesActual]} ${estado.anoActual}`]);
            header.appendChild(prev); header.appendChild(title); header.appendChild(next);
            return header;
        },

        crearGridDias() {
            const grid = VDOM.crearElemento('div', { className: 'cal-grid' }, []);
            // cabecera dias
            const cabeceras = VDOM.crearElemento('div', { className: 'cal-weekdays' }, []);
            CONFIG.NOMBRE_DIAS.forEach(d => cabeceras.appendChild(VDOM.crearElemento('div', { className: 'cal-weekday' }, [d.substr(0,3)])));
            grid.appendChild(cabeceras);

            // calcular primer dia mes
            const first = new Date(estado.anoActual, estado.mesActual, 1);
            const startDay = first.getDay();
            const daysInMonth = new Date(estado.anoActual, estado.mesActual+1, 0).getDate();

            // celdas
            const cells = VDOM.crearElemento('div', { className: 'cal-cells' }, []);
            // espacios previos
            for (let i=0;i<startDay;i++) cells.appendChild(VDOM.crearElemento('div', { className: 'cal-cell empty' }, ['']));
            for (let d=1; d<=daysInMonth; d++) {
                const fecha = new Date(estado.anoActual, estado.mesActual, d);
                const fechaStr = formatoFechaISO(fecha);
                const cell = VDOM.crearElemento('div', { className: 'cal-cell' }, []);
                const diaNum = VDOM.crearElemento('div', { className: 'cal-daynum' }, [String(d)]);
                cell.appendChild(diaNum);

                // marcar bloqueado/dia pasado
                const hoy = formatoFechaISO(new Date());
                if (fechaStr < hoy) cell.classList.add('disabled');
                if (estado.diasBloqueados.has(fechaStr)) cell.classList.add('bloqueado');

                // mostrar pequeño indicador de citas
                const citas = estado.citasDelMes.get(fechaStr) || [];
                if (citas.length > 0) {
                    const badge = VDOM.crearElemento('div', { className: 'cal-badge' }, [String(citas.length)]);
                    cell.appendChild(badge);
                }

                cell.addEventListener('click', () => {
                    if (cell.classList.contains('disabled') || cell.classList.contains('bloqueado')) return;
                    estado.fechaSeleccionada = fechaStr;
                    this.mostrarHoras(fechaStr);
                    if (typeof estado.onFechaSeleccionada === 'function') estado.onFechaSeleccionada(fechaStr);
                });

                cells.appendChild(cell);
            }
            grid.appendChild(cells);
            return grid;
        },

        mostrarHoras(fechaStr) {
            const horasContainer = VDOM.crearElemento('div', { className: 'cal-hours' }, []);
            const titulo = VDOM.crearElemento('h4', {}, ['Horarios disponibles: ' + fechaStr]);
            horasContainer.appendChild(titulo);

            const ocupado = (estado.citasDelMes.get(fechaStr) || []).map(c => c.hora);
            const bloqueadoHoras = estado.horasBloqueadas[fechaStr] || [];

            CONFIG.HORARIOS.forEach(h => {
                const disponible = !ocupado.includes(h) && !bloqueadoHoras.includes(h);
                const btn = VDOM.crearElemento('button', { className: 'slot ' + (disponible ? 'available' : 'unavailable') }, [h]);
                if (disponible) btn.addEventListener('click', async () => {
                    estado.horaSeleccionada = h;
                    // Crear reserva simple
                    try {
                        await CalendarioFirestore.crearReserva({ fecha: fechaStr, hora: h, estado: 'pendiente', createdAt: new Date().toISOString() });
                        if (typeof estado.onHoraSeleccionada === 'function') estado.onHoraSeleccionada({ fecha: fechaStr, hora: h });
                        alert('Reserva solicitada: ' + fechaStr + ' ' + h);
                    } catch (e) {
                        console.error('Error crearReserva', e);
                        if (typeof showNotification === 'function') showNotification('Error creando reserva', 'error');
                    }
                });
                horasContainer.appendChild(btn);
            });

            // mostrar en modal o panel lateral
            const panel = document.getElementById('calendar-hours-panel');
            if (panel) {
                panel.innerHTML = '';
                panel.appendChild(horasContainer);
            } else {
                // simple fallback: append below calendar
                const main = document.getElementById('calendar');
                const existing = document.getElementById('calendar-hours-panel');
                if (!existing) {
                    const container = VDOM.crearElemento('div', { id: 'calendar-hours-panel', className: 'calendar-hours-panel' }, []);
                    container.appendChild(horasContainer);
                    main.appendChild(container);
                }
            }
        },

        render() {
            const container = this.container || document.getElementById('calendar');
            if (!container) return;
            const wrapper = VDOM.crearElemento('div', { className: 'calendar-wrapper' }, []);
            wrapper.appendChild(this.crearHeader());
            wrapper.appendChild(this.crearGridDias());
            VDOM.renderizar(container, wrapper);
        }
    };

    // Exponer API mínima
    window.Calendario = {
        init: (containerId, opts = {}) => {
            if (opts.isAdmin) estado.isAdmin = true;
            CalendarioUI.init(containerId);
        },
        destruir: () => CalendarioFirestore.desconectar(),
        estado
    };

})();
