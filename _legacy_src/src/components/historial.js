// Componente de historial funcional
export async function cargarHistorial(uid) {
    const snapshot = await firebase.firestore().collection('reservas').where('cliente', '==', uid).get();
    return snapshot.docs.map(doc => doc.data());
}

export function renderHistorial(historial) {
    const histSection = document.getElementById('historial-section');
    if (!histSection) return;
    histSection.innerHTML = '<h2>Historial de Reservas</h2>';
    if (!historial.length) {
        histSection.innerHTML += '<p>No tienes reservas aún.</p>';
        return;
    }
    histSection.innerHTML += '<ul>' + historial.map(r => `<li>${r.fecha} - ${r.servicio}</li>`).join('') + '</ul>';
}
