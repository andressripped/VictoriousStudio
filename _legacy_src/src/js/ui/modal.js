// src/js/ui/modal.js

export function showToast(message, type = 'success') {
    if (!message) return;

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);

        // Basic styles for pure JS fallback (if css is missing)
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 10000;
        `;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: var(--bg-card, #1c1c1c);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        font-family: var(--font-body, 'Inter', sans-serif);
        animation: slideUpToast 0.3s forwards;
    `;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Alias to maintain app.js compatibility
export const showNotification = showToast;
window.showNotification = showToast;

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}
window.openModal = openModal;

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}
window.closeModal = closeModal;

// Configurar cierres por click en el overlay
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});
