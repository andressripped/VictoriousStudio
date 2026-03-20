// Lógica de autenticación y rol
export async function checkAuthState(callback) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const role = await determinarRol(user);
            callback(user, role);
        } else {
            callback(null, null);
        }
    });
}

export async function determinarRol(user) {
    // Lógica para obtener el rol desde Firestore
    const doc = await firebase.firestore().collection('roles').doc(user.uid).get();
    return doc.exists ? doc.data().rol : 'CLIENTE';
}

export function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = '/';
    });
}
