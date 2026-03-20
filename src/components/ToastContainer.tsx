import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toast, hideToast } = useStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [toast]);

  if (!toast && !isVisible) return null;

  const icons = {
    success: <CheckCircle className="text-green-500" size={20} aria-hidden="true" />,
    error: <AlertCircle className="text-red-500" size={20} aria-hidden="true" />,
    info: <Info className="text-blue-500" size={20} aria-hidden="true" />
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    info: 'bg-blue-500/10 border-blue-500/20'
  };

  return (
    <div 
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md ${bgColors[toast?.type || 'info']} bg-bg-card`}>
        <div className="flex-shrink-0">
          {icons[toast?.type || 'info']}
        </div>
        <div className="flex-1 text-sm font-medium">
          {toast?.message}
        </div>
        <button 
          onClick={hideToast}
          className="p-1 hover:bg-black/5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Cerrar notificación"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
