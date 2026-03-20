import { create } from 'zustand';

interface AppState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;

  user: any;
  userRole: 'superadmin' | 'barber' | 'user' | null;
  isAuthReady: boolean;
  setUser: (user: any, role?: 'superadmin' | 'barber' | 'user' | null) => void;
  setAuthReady: (ready: boolean) => void;

  services: any[];
  setServices: (services: any[]) => void;
  
  bookings: any[];
  setBookings: (bookings: any[]) => void;

  toast: { message: string, type: 'success' | 'error' | 'info', id: number } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useStore = create<AppState>((set) => ({
  toast: null,
  showToast: (message, type = 'info') => {
    const id = Date.now();
    set({ toast: { message, type, id } });
    setTimeout(() => {
      set((state) => (state.toast?.id === id ? { toast: null } : {}));
    }, 4000);
  },
  hideToast: () => set({ toast: null }),
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    return { theme: newTheme };
  }),
  
  isLoginModalOpen: false,
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),

  user: null,
  userRole: null,
  isAuthReady: false,
  setUser: (user, role = null) => set({ user, userRole: role }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),

  services: [],
  setServices: (services) => set({ services }),
  
  bookings: [],
  setBookings: (bookings) => set({ bookings })
}));
