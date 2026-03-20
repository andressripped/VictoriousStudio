// src/js/core/store.js

/**
 * Store y Persistencia (Reserva Blindada)
 * Maneja el estado en sessionStorage para evitar pérdida de progreso
 */

const STORAGE_KEY = 'victorious_booking_state';

// El Store genérico de la app (auth, ui state)
export const Store = {
    state: { user: null, role: null, loading: false },
    listeners: [],
    getState() { return this.state; },
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(l => l(this.state));
    },
    subscribe(listener) {
        this.listeners.push(listener);
        return () => this.listeners = this.listeners.filter(l => l !== listener);
    }
};

const defaultState = {
    pasoActual: 1,
    servicioSeleccionadoId: null,
    fechaSeleccionada: null,
    horaSeleccionada: null,
    formData: {}
};

export const bookingState = {
    get() {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return { ...defaultState };
            }
        }
        return { ...defaultState };
    },

    set(newState) {
        const currentState = this.get();
        const updatedState = { ...currentState, ...newState };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
        return updatedState;
    },

    clear() {
        sessionStorage.removeItem(STORAGE_KEY);
    }
};
