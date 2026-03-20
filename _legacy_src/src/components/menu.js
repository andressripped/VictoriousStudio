// Componente de menú profesional con UX avanzado
export function renderMenu(user, role) {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;
    if (user) {
        if (role === 'CLIENTE') {
            authSection.innerHTML = `
                <div class="profile-container">
                    <img src="${user.photoURL}" id="profile-avatar" class="profile-avatar" alt="Avatar">
                    <div class="profile-menu" id="profile-menu">
                        <a href="/perfil">Mi perfil</a>
                        <a href="/configuraciones">Configuraciones</a>
                        <a href="#" onclick="logout()">Cerrar sesión</a>
                    </div>
                </div>
            `;
        } else if (role === 'SUPERADMIN') {
            authSection.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="window.location.href='/src/superadmin/config.html'">
                    Panel Superadmin
                </button>
            `;
        } else if (role === 'ADMIN') {
            authSection.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="window.location.href='/src/admin/panel.html'">
                    Panel Admin
                </button>
            `;
        }
    } else {
        authSection.innerHTML = `
            <button class="btn btn-primary btn-sm" id="login-btn" style="font-size:1rem;display:flex;align-items:center;gap:0.5rem;" onclick="window.mostrarLoginModal && window.mostrarLoginModal()">
                <span class="material-symbols-outlined">login</span>
                <span>Entrar</span>
            </button>
        `;
        // Asegura que la función esté disponible globalmente
        window.mostrarLoginModal = window.mostrarLoginModal || (() => {
            const modal = document.getElementById('login-modal');
            if (modal) modal.classList.remove('hidden');
        });
    }
}

export function initProfileMenu() {
    const avatar = document.getElementById('profile-avatar');
    const menu = document.getElementById('profile-menu');
    if (!avatar || !menu) return;
    avatar.onclick = () => {
        menu.classList.toggle('open');
    };
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== avatar) {
            menu.classList.remove('open');
        }
    });
}
