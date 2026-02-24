import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnfaI7u_AVro7vGUMunYFIFDglp-CPYXI",
    authDomain: "meu-casamento-8c35e.firebaseapp.com",
    projectId: "meu-casamento-8c35e",
    storageBucket: "meu-casamento-8c35e.firebasestorage.app",
    messagingSenderId: "941453802788",
    appId: "1:941453802788:web:b929272448a451d33c87b1",
    measurementId: "G-S88MGSEDY7"
};

// Inicializa e exporta para os outros arquivos usarem
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Constantes
export const ADMIN_PASSWORD = "NewT.001";
// Detecta se está rodando no editor de código do Firebase ou site real
const isCanvas = typeof __app_id !== 'undefined';
const currentAppId = isCanvas ? __app_id : 'casamento_bruno_maria';

export const giftsPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'gifts'] : ['casamento_bruno_maria', 'lista', 'presentes'];
export const contribsPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'contributions'] : ['casamento_bruno_maria', 'lista', 'contribuicoes'];

// ... (código anterior)
export const contribsPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'contributions'] : ['casamento_bruno_maria', 'lista', 'contribuicoes'];

// ADICIONE ESTA LINHA NO FINAL:
export const guestsPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'guests'] : ['casamento_bruno_maria', 'lista', 'presenca'];