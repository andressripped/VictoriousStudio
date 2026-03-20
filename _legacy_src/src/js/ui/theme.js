// src/js/ui/theme.js

export function initTheme() {
    // Check localStorage
    const savedTheme = localStorage.getItem('victorious_theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme;
    if (currentTheme === 'light') {
        newTheme = 'dark';
        document.documentElement.removeAttribute('data-theme'); // Remove attribute for dark theme
    } else {
        newTheme = 'light';
        document.documentElement.setAttribute('data-theme', 'light'); // Set attribute for light theme
    }
    // Actualizamos variable CSS
    document.documentElement.setAttribute('data-theme', newTheme);
    // Persistimos en localStorage
    localStorage.setItem('victorious_theme', newTheme);
}

// Global scope for onclick
window.toggleTheme = toggleTheme;
