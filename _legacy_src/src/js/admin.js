// SISTEMA DE ADMINISTRACION - Panel de Usuarios
// Funciones para gestionar usuarios desde el panel admin

async function renderizarPanelAdmin(containerId = 'admin-users-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Contenedor no encontrado: ' + containerId);
        return;
    }
    try {
        const clientesSnap = await firebase.firestore().collection('clientes').get();
        const adminsSnap = await firebase.firestore().collection('admins').get();
        const usuarios = [];
        
        clientesSnap.forEach(doc => {
            usuarios.push({id: doc.id, ...doc.data(), tipo: 'cliente'});
        });
        adminsSnap.forEach(doc => {
            usuarios.push({id: doc.id, ...doc.data(), tipo: 'admin'});
        });
        
        console.log('Usuarios encontrados:', usuarios.length);
        
        if (usuarios.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 1rem; color: var(--text-muted);">No hay usuarios registrados.</p>';
            return;
        }

        let html = '';
        html += '<table style="width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; box-shadow:var(--shadow-sm);">';
        html += '<thead style="background:var(--bg-secondary); color:var(--text-primary);">';
        html += '<tr>';
        html += '<th style="padding:1rem; text-align:left;">Nombre</th>';
        html += '<th style="padding:1rem; text-align:left;">Email</th>';
        html += '<th style="padding:1rem; text-align:center;">Rol</th>';
        html += '<th style="padding:1rem; text-align:center;">Estado</th>';
        html += '<th style="padding:1rem; text-align:center;">Acciones</th>';
        html += '</tr>';
        html += '</thead><tbody>';

        usuarios.forEach((u, idx) => {
            const rol = (u.rol || u.role) || 'cliente';
            const estado = u.estado || 'activo';
            const bg = idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-tertiary)';

            html += '<tr style="background:' + bg + '; border-bottom:1px solid var(--border-subtle);">';
            html += '<td style="padding:1rem; color:var(--text-primary);"><strong>' + (u.nombre || u.email || 'Sin nombre') + '</strong></td>';
            html += '<td style="padding:1rem; font-size:0.9rem; color:var(--text-muted);">' + (u.email || 'N/A') + '</td>';
            html += '<td style="padding:1rem; text-align:center;">';
            html += '<select data-user-id="' + u.id + '" data-user-type="' + u.tipo + '" style="padding:0.5rem; border:1px solid var(--border-medium); border-radius:6px; background:var(--bg-primary); color:var(--text-primary);">';
            html += '<option value="cliente" ' + (rol === 'cliente' ? 'selected' : '') + '>Cliente</option>';
            html += '<option value="admin" ' + (rol === 'admin' ? 'selected' : '') + '>Admin</option>';
            html += '</select>';
            html += '</td>';
            html += '<td style="padding:1rem; text-align:center;"><span style="display:inline-block; padding:0.25rem 0.75rem; border-radius:20px; font-size:0.75rem; font-weight:700; background:' + (estado === 'bloqueado' ? 'var(--accent-danger)' : 'var(--accent-success)') + '; color:var(--accent-white);">' + (estado === 'bloqueado' ? 'BLOQUEADO' : 'ACTIVO') + '</span></td>';
            html += '<td style="padding:1rem; text-align:center;">';
            html += '<button data-action="delete" data-user-id="' + u.id + '" style="padding:0.5rem 1rem; background:var(--accent-danger); color:var(--accent-white); border:none; border-radius:8px; cursor:pointer; font-weight:600;">Eliminar</button>';
            html += '</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        // Adjuntar listeners
        document.querySelectorAll('[data-user-type]').forEach(select => {
            select.addEventListener('change', function() {
                cambiarRolUsuario(this.dataset.userId, this.dataset.userType, this.value);
            });
        });

        // Solo botones con data-action="delete"
        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm('Eliminar este usuario?')) {
                    eliminarUsuario(this.dataset.userId);
                }
            });
        });
        
    } catch (error) {
        console.error('Error renderizando panel:', error);
        container.innerHTML = '<div style="color: red; padding: 1rem; background: #ffe0e0; border-radius: 4px;">Error: ' + error.message + '</div>';
    }
}

async function cambiarRolUsuario(userId, userType, nuevoRol) {
    try {
        const db = firebase.firestore();

        // Promote cliente -> admin
        if (userType === 'cliente' && nuevoRol === 'admin') {
            const clienteRef = db.collection('clientes').doc(userId);
            const snap = await clienteRef.get();
            if (snap.exists) {
                const data = snap.data() || {};
                data.role = 'admin';
                data.rol = 'admin';
                await db.collection('admins').doc(userId).set(data);
                await clienteRef.delete();
                console.log('Usuario promovido a admin');
                if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Usuario promovido a admin', 'success');
            }
        }

        // Demote admin -> cliente
        else if (userType === 'admin' && nuevoRol === 'cliente') {
            const adminRef = db.collection('admins').doc(userId);
            const snap = await adminRef.get();
            if (snap.exists) {
                const data = snap.data() || {};
                data.role = 'cliente';
                data.rol = 'cliente';
                await db.collection('clientes').doc(userId).set(data);
                await adminRef.delete();
                console.log('Usuario degradado a cliente');
                if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Usuario degradado a cliente', 'success');
            }
        }

        // Simple role change within same collection
        else {
            const collection = userType === 'cliente' ? 'clientes' : 'admins';
            await db.collection(collection).doc(userId).update({role: nuevoRol, rol: nuevoRol});
            console.log('Rol actualizado a ' + nuevoRol);
            if (typeof mostrarNotificacion === 'function') mostrarNotificacion('Rol actualizado a ' + nuevoRol, 'success');
        }

        // Refresh view
        setTimeout(() => renderizarPanelAdmin(), 400);
    } catch (error) {
        console.error('Error:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error: ' + error.message, 'error');
        }
    }
}

async function bloquearUsuario(userId, dias) {
    try {
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + parseInt(dias));
        
        await firebase.firestore().collection('clientes').doc(userId).update({
            estado: 'bloqueado',
            fechaBloqueo: fechaFutura
        });
        
        console.log('Usuario bloqueado hasta ' + fechaFutura.toDateString());
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Usuario bloqueado por ' + dias + ' dias', 'success');
        }
        
        setTimeout(() => renderizarPanelAdmin(), 500);
    } catch (error) {
        console.error('Error:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error: ' + error.message, 'error');
        }
    }
}

async function eliminarUsuario(userId) {
    try {
        try {
            await firebase.firestore().collection('clientes').doc(userId).delete();
        } catch (e) {
            await firebase.firestore().collection('admins').doc(userId).delete();
        }
        
        console.log('Usuario eliminado');
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Usuario eliminado exitosamente', 'success');
        }
        
        setTimeout(() => renderizarPanelAdmin(), 500);
    } catch (error) {
        console.error('Error:', error);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error: ' + error.message, 'error');
        }
    }
}

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.renderizarPanelAdmin = renderizarPanelAdmin;
    window.cambiarRolUsuario = cambiarRolUsuario;
    window.bloquearUsuario = bloquearUsuario;
    window.eliminarUsuario = eliminarUsuario;
    console.log('Admin panel functions exported to window');
}
