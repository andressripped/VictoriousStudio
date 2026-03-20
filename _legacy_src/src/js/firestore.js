// src/js/firestore.js
console.log("🔥 firestore.js iniciando...");

// Verificar firebaseApp
console.log("📌 window.firebaseApp:", window.firebaseApp);

// Crear helper completo
window.firestoreHelper = {
    version: "1.0.0",
    
    test: function() {
        console.log("✅ Helper funcionando");
        return "ok";
    },
    
    onCitasChange: function(callback, filtros = {}) {
        console.log("📞 onCitasChange llamado", filtros);
        try {
            const db = window.firebaseApp?.db;
            if (!db) {
                console.warn("db no disponible, usando callback vacío");
                if (callback) callback([]);
                return function() {};
            }
            
            let query = db.collection('citas');
            if (filtros.fecha) query = query.where('fecha', '==', filtros.fecha);
            if (filtros.estado) query = query.where('estado', '==', filtros.estado);
            
            return query.onSnapshot(snapshot => {
                const citas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(citas);
            }, error => {
                console.error("Error en listener:", error);
                callback([]);
            });
        } catch (e) {
            console.error("Error en onCitasChange:", e);
            if (callback) callback([]);
            return function() {};
        }
    },
    
    onBloqueosChange: function(callback) {
        console.log("📞 onBloqueosChange llamado");
        try {
            const db = window.firebaseApp?.db;
            if (!db) {
                if (callback) callback([]);
                return function() {};
            }
            
            return db.collection('bloqueos').onSnapshot(snapshot => {
                const bloqueos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(bloqueos);
            }, error => {
                console.error("Error en listener de bloqueos:", error);
                callback([]);
            });
        } catch (e) {
            console.error("Error en onBloqueosChange:", e);
            if (callback) callback([]);
            return function() {};
        }
    },
    
    crearCita: async function(citaData) {
        console.log("📝 crearCita llamado", citaData);
        try {
            const db = window.firebaseApp?.db;
            if (!db) throw new Error("db no disponible");
            
            citaData.creadaEn = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('citas').add(citaData);
            console.log("✅ Cita creada:", docRef.id);
            return { id: docRef.id, ...citaData };
        } catch (error) {
            console.error("❌ Error creando cita:", error);
            throw error;
        }
    },
    
    // NUEVA FUNCIÓN: Guardar comprobante en Base64
    guardarComprobanteBase64: async function(file, userId, citaId) {
        console.log("📤 Guardando comprobante como Base64...");
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const base64 = e.target.result;
                    const db = window.firebaseApp?.db;
                    if (!db) throw new Error("db no disponible");
                    
                    // Guardar en Firestore
                    const docRef = await db.collection('comprobantes').add({
                        userId: userId,
                        citaId: citaId,
                        imagen: base64,
                        nombre: file.name,
                        tipo: file.type,
                        tamaño: file.size,
                        fecha: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log("✅ Comprobante guardado en Firestore:", docRef.id);
                    resolve(docRef.id);
                } catch (error) {
                    console.error("❌ Error guardando comprobante:", error);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error("❌ Error leyendo archivo:", error);
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    },

    // NUEVA FUNCIÓN: Guardar foto de perfil Base64 (colección fotosPerfil)
    guardarFotoPerfilBase64: async function(file, userId) {
        console.log("📤 Guardando foto de perfil como Base64...");
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const base64 = e.target.result;
                    const db = window.firebaseApp?.db;
                    if (!db) throw new Error("db no disponible");

                    const docRef = await db.collection('fotosPerfil').add({
                        userId: userId,
                        imagen: base64,
                        nombre: file.name,
                        tipo: file.type,
                        tamaño: file.size,
                        fecha: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log("✅ Foto de perfil guardada en Firestore:", docRef.id);
                    resolve({id: docRef.id, base64});
                } catch (error) {
                    console.error("❌ Error guardando foto de perfil:", error);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error("❌ Error leyendo archivo:", error);
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    },
    
    // Función para obtener comprobantes de una cita
    obtenerComprobante: async function(citaId) {
        console.log("🔍 obtenerComprobante llamado para cita:", citaId);
        try {
            const db = window.firebaseApp?.db;
            if (!db) throw new Error("db no disponible");
            
            const snapshot = await db.collection('comprobantes')
                .where('citaId', '==', citaId)
                .orderBy('fecha', 'desc')
                .limit(1)
                .get();
            
            console.log("📊 Snapshot obtenido, vacío?", snapshot.empty);
            
            if (snapshot.empty) {
                console.log("❌ No se encontraron comprobantes para cita:", citaId);
                return null;
            }
            
            const data = snapshot.docs[0].data();
            console.log("✅ Comprobante encontrado:", {
                id: snapshot.docs[0].id,
                nombre: data.nombre,
                tipo: data.tipo,
                tamaño: data.tamaño,
                tieneImagen: !!data.imagen,
                imagenLength: data.imagen?.length
            });
            
            return { id: snapshot.docs[0].id, ...data };
        } catch (error) {
            console.error("Error obteniendo comprobante:", error);
            return null;
        }
    },
    
    actualizarCita: async function(id, data) {
        console.log("📝 actualizarCita llamado", id, data);
        const db = window.firebaseApp?.db;
        if (!db) throw new Error("db no disponible");
        await db.collection('citas').doc(id).update(data);
    },
    
    eliminarCita: async function(id) {
        console.log("🗑️ eliminarCita llamado", id);
        const db = window.firebaseApp?.db;
        if (!db) throw new Error("db no disponible");
        await db.collection('citas').doc(id).delete();
    },
    
    crearBloqueo: async function(bloqueoData) {
        console.log("🚫 crearBloqueo llamado", bloqueoData);
        const db = window.firebaseApp?.db;
        if (!db) throw new Error("db no disponible");
        bloqueoData.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
        return await db.collection('bloqueos').add(bloqueoData);
    },
    
    eliminarBloqueo: async function(id) {
        console.log("🗑️ eliminarBloqueo llamado", id);
        const db = window.firebaseApp?.db;
        if (!db) throw new Error("db no disponible");
        await db.collection('bloqueos').doc(id).delete();
    },

};

console.log("✅ firestoreHelper asignado y listo:", Object.keys(window.firestoreHelper));