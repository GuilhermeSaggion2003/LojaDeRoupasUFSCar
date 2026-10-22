import { initializeApp } from "firebase/app";
// Posteriormente, irá importar o Authentication e o Firestore aqui

const firebaseConfig = {
  apiKey: "AIzaSyBbpGM2RVdGfnhN3vBaPCjBl4GH9tqxg-8",
  authDomain: "lojaderoupasufscar.firebaseapp.com",
  projectId: "lojaderoupasufscar",
  storageBucket: "lojaderoupasufscar.firebasestorage.app",
  messagingSenderId: "431808801219",
  appId: "1:431808801219:web:65cc5924055c29b715b576"
};

// Inicializa o Firebase e exporta a constante para ser usada no resto do projeto
export const app = initializeApp(firebaseConfig);