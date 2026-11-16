// Configuración web de Firebase. Estos valores son públicos por diseño
// (viajan al navegador de todos modos): la seguridad real la dan las
// reglas de Firestore. Ver README.md → "Reglas de seguridad".
export const firebaseConfig = {
  apiKey: 'AIzaSyD6EQxG6wldQdPo6CDEnHDVc_gWbq5fUaI',
  authDomain: 'cartocor-motores.firebaseapp.com',
  projectId: 'cartocor-motores',
  storageBucket: 'cartocor-motores.firebasestorage.app',
  messagingSenderId: '924232630993',
  appId: '1:924232630993:web:dbeadf5357dfce00643bf0',
  measurementId: 'G-LQN3XLL2L1',
};

// Ruta de la colección donde ya están guardados los motores.
// No cambiarla: la versión anterior de la app escribía acá.
export const MOTORS_COLLECTION_PATH = [
  'artifacts',
  'cartocor-motors-production',
  'public',
  'data',
  'motors_list',
];
