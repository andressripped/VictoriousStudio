import { useState } from 'react';
import { useStore } from '../store/useStore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { X, UserCircle, Loader2 } from 'lucide-react';
import ValidatedInput from './ui/ValidatedInput';
import PrimaryButton from './ui/PrimaryButton';
import { validateEmail, validatePassword } from '../utils/validators';

export default function LoginModal() {
  const { isLoginModalOpen, setLoginModalOpen } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate before submitting
    if (validateEmail(email) || validatePassword(password)) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setLoginModalOpen(false);
      setEmail('');
      setPassword('');
      setIsRegistering(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Este correo ya está registrado.');
      else if (err.code === 'auth/weak-password') setError('La contraseña debe tener al menos 6 caracteres.');
      else setError('Credenciales incorrectas o error de red.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setLoginModalOpen(false);
      setEmail('');
      setPassword('');
      setIsRegistering(false);
    } catch (err: any) {
      console.error(err);
      // Ignorar el error si el usuario cerró el popup manualmente
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request' || err.message.includes('closed')) {
        setLoading(false);
        return;
      }
      setError('Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isRegistering ? 'Formulario de registro' : 'Formulario de inicio de sesión'}
    >
      <div className="bg-bg-card p-10 rounded-xl shadow-2xl w-full max-w-sm relative border border-border-subtle flex flex-col items-center animate-scale-in">
        <button 
          onClick={() => setLoginModalOpen(false)}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary bg-bg-tertiary rounded-full p-2 transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Cerrar ventana de inicio de sesión"
        >
          <X size={20} />
        </button>
        
        <div className="text-center mb-6">
          <UserCircle size={56} className="mx-auto mb-4 text-accent-primary" aria-hidden="true" />
          <h3 className="font-display text-2xl mb-1">{isRegistering ? 'Crea tu Cuenta' : 'Bienvenido'}</h3>
          <p className="text-text-muted text-sm px-4">
            {isRegistering ? 'Únete para agendar citas fácilmente.' : 'Inicia sesión para gestionar tus citas.'}
          </p>
        </div>

        {/* Botón de Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center relative mb-6 py-3 border-gray-300 border-2 bg-white hover:bg-gray-100 text-black rounded-xl font-bold transition-all duration-300 disabled:opacity-50 shadow-sm"
          aria-label="Iniciar sesión con Google"
        >
          <div className="flex items-center justify-center gap-3 transition-all duration-300">
            {loading && (
              <Loader2 size={18} className="animate-spin text-black flex-shrink-0" />
            )}
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>Continuar con Google</span>
          </div>
        </button>

        <div className="w-full flex items-center gap-4 mb-6" role="separator">
          <div className="flex-1 h-px bg-border-strong"></div>
          <span className="text-xs text-text-muted font-bold uppercase">O usa tu correo</span>
          <div className="flex-1 h-px bg-border-strong"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4" noValidate>
          <ValidatedInput
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={setEmail}
            validate={validateEmail}
          />
          <ValidatedInput
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={setPassword}
            validate={validatePassword}
          />
          {error && <p className="text-accent-error text-xs text-center bg-accent-error/10 p-2 rounded" role="alert">{error}</p>}
          
          <PrimaryButton
            type="submit"
            loading={loading}
            disabled={!!validateEmail(email) || !!validatePassword(password)}
            className="w-full py-3 mt-2"
          >
            {isRegistering ? 'Registrarse' : 'Entrar'}
          </PrimaryButton>
        </form>

        <p className="text-sm text-text-muted mt-6 text-center">
          {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
            className="text-accent-primary font-bold ml-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
          >
            {isRegistering ? 'Inicia sesión' : 'Regístrate aquí'}
          </button>
        </p>
      </div>
    </div>
  );
}
