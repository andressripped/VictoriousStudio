// Componente de configuraciones funcional
export async function cargarConfiguraciones(uid) {
    const doc = await firebase.firestore().collection('clientes').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data().prefs || {};
}

export function renderConfiguraciones(prefs) {
    const configSection = document.getElementById('config-section');
    if (!configSection) return;
    configSection.innerHTML = `
        <h2>Configuraciones</h2>
        <label>Mensaje de bienvenida:</label>
        <input type="text" value="${prefs.mensaje || ''}" id="mensaje-input">
        <button class="btn btn-primary" onclick="guardarConfiguraciones()">Guardar</button>
    `;
}

export function guardarConfiguraciones() {
    // Lógica para guardar configuraciones
    alert('Funcionalidad de guardar configuraciones próximamente');
}
