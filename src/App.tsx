import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { useStore } from './store/useStore';
import { lazy, Suspense, useEffect } from 'react';
import { auth, db } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ToastContainer from './components/ToastContainer';
import PageSkeleton from './components/skeletons/PageSkeleton';

// Lazy-loaded routes for code splitting
const Home = lazy(() => import('./pages/Home'));
const Booking = lazy(() => import('./pages/Booking'));
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const BarberDashboard = lazy(() => import('./pages/admin/BarberDashboard'));

function App() {
  const { theme, setUser, setAuthReady } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const roleDoc = await getDoc(doc(db, 'roles', currentUser.uid));
          const role = roleDoc.exists() ? roleDoc.data().role : 'user';
          setUser(currentUser, role);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUser(currentUser, 'user');
        }
      } else {
        setUser(null, null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="reserva" element={<Booking />} />
            <Route path="admin" element={<SuperAdminDashboard />} />
            <Route path="barber" element={<BarberDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
