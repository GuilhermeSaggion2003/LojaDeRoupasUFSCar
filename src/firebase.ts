// 1. Importar as funções fundamentais do núcleo do Firebase e do módulo de Autenticação
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// 2. Modo emulador (RNF04 / risco R5): com VITE_USE_EMULATORS=true
//    (`npm run dev:emulators`), o app usa os Emuladores Locais do Firebase em
//    vez do projeto real — funciona sem internet durante a apresentação.
//    O projectId "demo-*" garante que nada é enviado à nuvem por engano.
export const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === "true";
export const EMULATOR_PROJECT_ID = "demo-lojaderoupasufscar";
const EMULATOR_HOST = import.meta.env.VITE_EMULATOR_HOST || "127.0.0.1";

// 3. Credenciais do projeto (configuração pública do app web)
const firebaseConfig = {
  apiKey: "AIzaSyBbpGM2RVdGfnhN3vBaPCjB14GH9tqxg-8",
  authDomain: "lojaderoupasufscar.firebaseapp.com",
  projectId: USE_EMULATORS ? EMULATOR_PROJECT_ID : "lojaderoupasufscar",
  storageBucket: "lojaderoupasufscar.firebasestorage.app",
  messagingSenderId: "431808801219",
  appId: "1:431808801219:web:65cc5924055c29b715b576",
  measurementId: "G-HCDPFDWTMT"
};

// 4. Inicializar a aplicação e exportar os serviços
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// 5. Portas iguais às do firebase.json (auth: 9099, firestore: 8080)
if (USE_EMULATORS) {
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  console.info(`[firebase] Modo emulador ativo (${EMULATOR_HOST}) — projeto ${EMULATOR_PROJECT_ID}.`);
}
