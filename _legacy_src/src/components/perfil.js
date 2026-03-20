// Componente de perfil funcional
export async function cargarPerfil(uid) {
    const doc = await firebase.firestore().collection('clientes').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data();
}

export function renderPerfil(data) {
    const perfilSection = document.getElementById('perfil-section');
    if (!perfilSection || !data) return;
    perfilSection.innerHTML = `
        <h2>Mi Perfil</h2>
        <img src="${data.photoURL}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;">
        <p>Nombre: ${data.displayName}</p>
        <p>Email: ${data.email}</p>
        <p>Teléfono: ${data.telefono || 'No registrado'}</p>
        <button class="btn btn-secondary" onclick="editarPerfil()">Editar</button>
    `;
}

export function editarPerfil() {
    // Lógica para editar perfil
    alert('Funcionalidad de edición de perfil próximamente');
}
