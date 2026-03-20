import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOVClPC3wxG15BAw0hgPnf3ZSZ_dCpxjA",
  authDomain: "victorious-9efcc.firebaseapp.com",
  projectId: "victorious-9efcc",
  storageBucket: "victorious-9efcc.firebasestorage.app",
  messagingSenderId: "1092917356284",
  appId: "1:1092917356284:web:098ee3017b9e6f6b8d9979"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// App secundaria para crear usuarios admin/barberos sin desloguear al SuperAdmin actual
export const createSecondaryApp = () => {
  const apps = getApps();
  const secondaryAppName = 'SecondaryAppCreation';
  
  if (!apps.find(a => a.name === secondaryAppName)) {
    return initializeApp(firebaseConfig, secondaryAppName);
  }
  return getApp(secondaryAppName);
};
