import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVjoXpO5PwW3-7B8KBs4jzKQcVWVCzi_s",
    authDomain: "casamento-fb87b.firebaseapp.com",
    projectId: "casamento-fb87b",
    storageBucket: "casamento-fb87b.firebasestorage.app",
    messagingSenderId: "727131908134",
    appId: "1:727131908134:web:e1df1695894c2220171ee7",
    measurementId: "G-QFL6YHZF0X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const isCanvas = typeof __app_id !== 'undefined';
const currentAppId = isCanvas ? __app_id : 'casamento_mb';
const rsvpPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'rsvps'] : ['casamento_mb', 'lista', 'presencas'];
const ADMIN_PASSWORD = "NewT.001";
let user = null;
let rsvps = [];

lucide.createIcons();

window.toggleCompanions = (show) => {
    const section = document.getElementById('companions-section');
    if (show) {
        section.classList.remove('opacity-50', 'pointer-events-none', 'hidden');
    } else {
        section.classList.add('opacity-50', 'pointer-events-none', 'hidden');
        document.getElementById('form-acompanhantes').value = "0";
    }
};

window.openLoginModal = () => {
    if (sessionStorage.getItem('admin_authed') === 'true') { setView('admin'); } 
    else { document.getElementById('modal-login').classList.remove('hidden'); document.getElementById('modal-login').classList.add('flex'); }
};

window.closeModal = (id) => { 
    document.getElementById(id).classList.add('hidden'); 
    document.getElementById(id).classList.remove('flex'); 
};

window.setView = (v) => {
    document.getElementById('client-view').classList.toggle('hidden', v !== 'client');
    document.getElementById('admin-view').classList.toggle('hidden', v !== 'admin');
    window.scrollTo(0,0);
};

window.handleAdminAuth = () => {
    const input = document.getElementById('login-pass-input').value;
    if (input === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_authed', 'true');
        closeModal('modal-login');
        setView('admin');
    } else {
        alert("Senha incorreta!");
        document.getElementById('login-pass-input').value = "";
    }
};

document.getElementById('rsvp-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "A Enviar...";
    const nome = document.getElementById('form-nome').value.trim();
    const vaiComparecer = document.querySelector('input[name="presenca"]:checked').value === "sim";
    const acompanhantes = vaiComparecer ? parseInt(document.getElementById('form-acompanhantes').value) : 0;
    const mensagem = document.getElementById('form-mensagem').value.trim();

    try {
        await addDoc(collection(db, ...rsvpPath), {
            nome, vaiComparecer, acompanhantes, mensagem, timestamp: new Date().toISOString()
        });
        document.getElementById('rsvp-form').reset();
        toggleCompanions(true);
        const msgEl = document.getElementById('success-message');
        if(vaiComparecer) {
            msgEl.innerHTML = `Que bom que estará connosco, <b>${nome}</b>!<br>A sua presença foi confirmada com sucesso.`;
        } else {
            msgEl.innerHTML = `Agradecemos por nos avisar, <b>${nome}</b>.<br>Sentiremos a sua falta!`;
        }
        document.getElementById('modal-success').classList.remove('hidden');
        document.getElementById('modal-success').classList.add('flex');
    } catch (err) {
        console.error(err);
        alert("Erro ao enviar. Tente novamente.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Enviar Confirmação";
    }
};

function initAdminData() {
    onSnapshot(collection(db, ...rsvpPath), snap => {
        rsvps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdminList();
    });
}

function renderAdminList() {
    const list = document.getElementById('rsvp-list');
    if(!list) return;
    let totalPessoas = 0;
    const sorted = [...rsvps].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    list.innerHTML = sorted.map(r => {
        if (r.vaiComparecer) totalPessoas += (1 + r.acompanhantes);
        const statusBadge = r.vaiComparecer 
            ? `<span class="bg-green-100 text-green-700 py-1 px-3 rounded-full text-[9px] uppercase tracking-widest">Confirmado</span>`
            : `<span class="bg-red-100 text-red-700 py-1 px-3 rounded-full text-[9px] uppercase tracking-widest">Não Vai</span>`;
        return `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="py-4 px-6 text-dark">${r.nome}</td>
            <td class="py-4 px-6 text-center">${statusBadge}</td>
            <td class="py-4 px-6 text-center text-gray-500">${r.vaiComparecer ? r.acompanhantes : '-'}</td>
            <td class="py-4 px-6 text-gray-500 italic max-w-xs truncate" title="${r.mensagem}">${r.mensagem || '-'}</td>
            <td class="py-4 px-6 text-right">
                <button onclick="handleDeleteRsvp('${r.id}')" class="text-gray-300 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>`;
    }).join('');
    document.getElementById('total-guests').innerText = totalPessoas;
    lucide.createIcons();
}

window.handleDeleteRsvp = async (id) => {
    if(confirm("Tem certeza que deseja apagar esta confirmação?")) {
        await deleteDoc(doc(db, ...rsvpPath, id));
    }
};

async function startApp() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token).catch(async () => await signInAnonymously(auth));
        } else { await signInAnonymously(auth); }
    } catch (err) { console.error(err); }
    onAuthStateChanged(auth, u => { if(u) { user = u; initAdminData(); } });
}
startApp();