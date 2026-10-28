// 1. Importar as funções fundamentais do núcleo do Firebase e do módulo de Autenticação
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// 2. Colar as credenciais copiadas da Consola do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBbpGM2RVdGfnhN3vBaPCjB14GH9tqxg-8",
  authDomain: "lojaderoupasufscar.firebaseapp.com",
  projectId: "lojaderoupasufscar",
  storageBucket: "lojaderoupasufscar.firebasestorage.app",
  messagingSenderId: "431808801219",
  appId: "1:431808801219:web:65cc5924055c29b715b576",
  measurementId: "G-HCDPFDWTMT"
};

// 3. Inicializar a aplicação (isto liga o seu site ao backend da Google)
const app = initializeApp(firebaseConfig);

// 4. Ativar o serviço de autenticação e exportá-lo
export const auth = getAuth(app);