// Componente de login con UX avanzado
export function mostrarLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
}

export function cerrarLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

export function loginWithGoogle() {
    // Lógica de login con Google
    firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .then((result) => {
            cerrarLoginModal();
            // No redirección automática
        })
        .catch((error) => {
            alert('Error al iniciar sesión: ' + error.message);
        });
}
