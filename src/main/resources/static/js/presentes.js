import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, setDoc, doc, deleteDoc, updateDoc, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnfaI7u_AVro7vGUMunYFIFDglp-CPYXI",
    authDomain: "meu-casamento-8c35e.firebaseapp.com",
    projectId: "meu-casamento-8c35e",
    storageBucket: "meu-casamento-8c35e.firebasestorage.app",
    messagingSenderId: "941453802788",
    appId: "1:941453802788:web:b929272448a451d33c87b1",
    measurementId: "G-S88MGSEDY7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const isCanvas = typeof __app_id !== 'undefined';
const currentAppId = isCanvas ? __app_id : 'casamento_bruno_maria';
const giftsPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'gifts'] : ['casamento_bruno_maria', 'lista', 'presentes'];
const contribsPath = isCanvas ? ['artifacts', currentAppId, 'public', 'data', 'contributions'] : ['casamento_bruno_maria', 'lista', 'contribuicoes'];
const ADMIN_PASSWORD = "NewT.001";
let user = null;
let gifts = [], contributions = [], selectedGift = null, modalQty = 1;

const crc16 = (d) => {
    let c = 0xFFFF;
    for (let i = 0; i < d.length; i++) {
        c ^= d.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) { if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; else c <<= 1; }
    }
    return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};
const formatTag = (id, val) => `${id}${val.toString().length.toString().padStart(2, '0')}${val}`;
const generatePixPayload = (key, name, city, amount) => {
    const cleanKey = key.replace(/\s/g, '');
    const merchantInfo = formatTag('00', 'br.gov.bcb.pix') + formatTag('01', cleanKey);
    let p = formatTag('00', '01') + formatTag('26', merchantInfo) + formatTag('52', '0000') + formatTag('53', '986') +
        formatTag('54', amount.toFixed(2)) + formatTag('58', 'BR') + formatTag('59', name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25)) +
        formatTag('60', city.toUpperCase().slice(0, 15)) + formatTag('62', formatTag('05', 'CASAMENTO')) + '6304';
    return p + crc16(p);
};

window.openLoginModal = () => {
    const authed = sessionStorage.getItem('admin_authed') === 'true';
    if (authed) { setView('admin'); } else { openModal('modal-login'); }
};

window.handleAdminAuth = () => {
    const input = document.getElementById('login-pass-input').value;
    if (input === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_authed', 'true');
        closeModal('modal-login');
        setView('admin');
        renderAdminData();
    } else {
        showStatus("Senha incorreta!", "bg-red-50 text-red-600 border-red-200");
        document.getElementById('login-pass-input').value = "";
    }
};

window.setView = (v) => {
    document.getElementById('client-view').classList.toggle('hidden', v !== 'client');
    document.getElementById('admin-view').classList.toggle('hidden', v !== 'admin');
    window.scrollTo(0, 0);
};

window.closeModal = (id) => { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); };
window.openModal = (id) => { document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('flex'); lucide.createIcons(); };

function showStatus(msg, classes) {
    const b = document.getElementById('status-banner');
    b.innerHTML = msg;
    b.className = `max-w-2xl mx-auto mt-6 p-4 rounded-sm text-sm text-center font-sans shadow-md border animate-in fade-in duration-300 block ${classes}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => b.classList.add('hidden'), 10000);
}

function initData() {
    setDbStatus('loading');
    onSnapshot(collection(db, ...giftsPath), 
        (snap) => {
            gifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderGifts();
            renderAdminData();
            setDbStatus('online'); 
        }, 
        (error) => {
            console.error("Erro Gifts:", error);
            setDbStatus('offline');
            showStatus("Erro de conexão com o banco!", "bg-red-50 text-red-600 border-red-200");
        }
    );
    onSnapshot(collection(db, ...contribsPath), 
        (snap) => {
            contributions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderGifts();
            renderAdminData();
            setDbStatus('online');
        },
        (error) => {
            console.error("Erro Contribs:", error);
            setDbStatus('offline');
        }
    );
}

window.renderGifts = () => {
    const grid = document.getElementById('gifts-grid');
    if (gifts.length === 0) { grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-300 font-serif italic text-xl border-2 border-dashed border-gray-200 rounded-sm">Sem itens configurados.</div>`; return; }
    grid.innerHTML = gifts.map(item => {
        const used = contributions.filter(c => c.giftId === item.id).reduce((s, c) => s + (parseInt(c.quantity) || 0), 0);
        const rem = Math.max(0, (parseInt(item.totalQuotas) || 1) - used);
        const isSoldOut = rem <= 0;
        const isFree = !item.valor || parseFloat(item.valor) === 0;
        return `
        <div class="bg-white rounded-sm overflow-hidden shadow-lg border border-gray-100 flex flex-col transform transition-all duration-300 ${isSoldOut ? 'opacity-60 grayscale' : 'hover:-translate-y-2'}">
            <div class="p-6 md:p-8 text-center flex-grow flex flex-col font-sans">
                <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gold">
                    <i data-lucide="gift" class="w-5 h-5"></i>
                </div>
                <h3 class="text-xl md:text-2xl font-serif text-dark mb-2 leading-tight">${item.nome}</h3>
                <p class="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-4">${isFree ? '' : 'COTA: R$ ' + parseFloat(item.valor).toFixed(2)}</p>
                <p class="text-[10px] uppercase font-bold mb-6 ${rem > 0 ? 'text-gold' : 'text-gray-400'}">${rem > 0 ? rem + ' disponíveis' : 'Reservado'}</p>
                <button onclick="handleOpenGiftModal('${item.id}', ${rem})" ${isSoldOut ? 'disabled' : ''} class="mt-auto w-full py-4 bg-dark text-white rounded-sm text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-sm">${isFree ? 'Presentear' : 'Presentear'}</button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
};

window.renderAdminData = () => {
    const list = document.getElementById('contributions-list');
    if (!list) return;
    const sorted = [...contributions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    list.innerHTML = sorted.map(c => `
        <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50">
            <td class="py-4 px-6 text-dark font-medium">${c.guestName}</td>
            <td class="py-4 px-6 text-gray-500">${c.giftName} (${c.quantity}x)</td>
            <td class="py-4 px-6 font-bold text-dark">${c.totalValue > 0 ? 'R$ ' + parseFloat(c.totalValue).toFixed(2) : '<span class="text-green-600 uppercase text-[9px] tracking-widest">Livre</span>'}</td>
            <td class="py-4 px-6 text-right"><button onclick="handleDeleteContrib('${c.id}')" class="text-gray-300 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>
        </tr>`).join('');
    const adminGifts = document.getElementById('admin-gifts-list');
    if (adminGifts) {
        adminGifts.innerHTML = gifts.map(item => `
            <div class="flex items-center gap-4 p-4 border border-gray-100 rounded-sm bg-gray-50/50 hover:bg-gray-50 transition-all font-sans text-left">
                <div class="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gold shadow-sm"><i data-lucide="gift" class="w-4 h-4"></i></div>
                <div class="flex-grow min-w-0"><p class="font-bold text-sm truncate text-dark">${item.nome}</p><p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">${(!item.valor || item.valor === 0) ? 'Livre' : 'R$ ' + parseFloat(item.valor).toFixed(2)} | Qtd: ${item.totalQuotas}</p></div>
                <div class="flex gap-2"><button onclick="handleEditItem('${item.id}')" class="text-gray-400 hover:text-dark transition-colors"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="handleDeleteItem('${item.id}')" class="text-gray-400 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>
            </div>`).join('');
    }
    lucide.createIcons();
};

document.getElementById('gift-form').onsubmit = async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const data = {
        nome: document.getElementById('form-nome').value,
        valor: parseFloat(document.getElementById('form-valor').value || 0),
        totalQuotas: parseInt(document.getElementById('form-total-quotas').value || 1),
        pixKey: document.getElementById('form-pix-key').value || '',
        timestamp: new Date().toISOString()
    };
    try {
        const id = editId || "gift_" + Date.now();
        await setDoc(doc(db, ...giftsPath, id), data);
        resetGiftForm();
        showStatus("Gravado com sucesso!", "bg-green-50 text-green-700 border-green-200");
    } catch (err) { console.error(err); }
};

window.handleEditItem = (id) => {
    const item = gifts.find(g => g.id === id);
    if (!item) return;
    document.getElementById('edit-id').value = id;
    document.getElementById('form-nome').value = item.nome;
    document.getElementById('form-valor').value = item.valor || 0;
    document.getElementById('form-total-quotas').value = item.totalQuotas;
    document.getElementById('form-pix-key').value = item.pixKey || '';
    document.getElementById('btn-save').innerText = "Atualizar Item";
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
};

window.resetGiftForm = () => {
    document.getElementById('gift-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('btn-save').innerText = "Guardar Presente";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

window.handleDeleteItem = (id) => {
    const item = gifts.find(g => g.id === id);
    showConfirm("Excluir?", `Remover "${item.nome}"?`, async () => { await deleteDoc(doc(db, ...giftsPath, id)); closeModal('modal-confirm'); });
};

window.handleDeleteContrib = (id) => {
    showConfirm("Remover histórico?", "Não poderá ser desfeito.", async () => { await deleteDoc(doc(db, ...contribsPath, id)); closeModal('modal-confirm'); });
};

window.handleClearAllContribs = () => {
    showConfirm("Limpar Tudo?", "Isto apagará TODAS as contribuições!", async () => {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, ...contribsPath));
        snapshot.forEach(d => batch.delete(d.ref));
        await batch.commit();
        closeModal('modal-confirm');
    });
};

window.handleOpenGiftModal = (id, rem) => {
    selectedGift = gifts.find(g => g.id === id);
    if (!selectedGift) return;
    selectedGift.rem = rem; modalQty = 1;
    document.getElementById('guest-name-input').value = '';
    document.getElementById('modal-gift-name').innerText = selectedGift.nome;
    const isFree = !selectedGift.valor || parseFloat(selectedGift.valor) === 0;
    document.getElementById('modal-total-box').classList.toggle('hidden', isFree);
    updateModalUI(); openModal('modal-gift');
};

window.updateQty = (val) => {
    const next = modalQty + val;
    if (next >= 1 && next <= selectedGift.rem) { modalQty = next; updateModalUI(); }
};

function updateModalUI() {
    document.getElementById('modal-qty').innerText = modalQty;
    const isFree = !selectedGift.valor || parseFloat(selectedGift.valor) === 0;
    if (!isFree) document.getElementById('modal-total').innerText = `R$ ${(selectedGift.valor * modalQty).toFixed(2)}`;
}

window.handleFinishProcess = () => {
    closeModal('modal-pix');
    closeModal('modal-gift');
    const name = document.getElementById('guest-name-input').value.trim();
    showStatus(`<div class="flex flex-col items-center gap-2"><i data-lucide="check-circle" class="w-10 h-10 text-gold mb-2"></i><p class="text-xl font-serif text-dark">Muito Obrigado, ${name}!</p><p class="text-gray-500 font-light">O seu carinho faz toda a diferença.</p></div>`, "bg-white border-gold border-t-4");
    lucide.createIcons();
};

window.handleConfirmContribution = async () => {
    const name = document.getElementById('guest-name-input').value.trim();
    if (!name) return showStatus("Assina o teu presente!", "bg-amber-50 text-amber-700 border-amber-200");
    const isFree = !selectedGift.valor || parseFloat(selectedGift.valor) === 0;
    const total = isFree ? 0 : selectedGift.valor * modalQty;
    const btn = document.getElementById('btn-confirm-gift');
    btn.disabled = true;
    try {
        await addDoc(collection(db, ...contribsPath), { giftId: selectedGift.id, giftName: selectedGift.nome, guestName: name, quantity: modalQty, totalValue: total, timestamp: new Date().toISOString() });
        if (!isFree && selectedGift.pixKey) {
            const p = generatePixPayload(selectedGift.pixKey, 'Bruno Freitas & Maria Fernanda', 'SAO PAULO', total);
            document.getElementById('pix-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(p)}`;
            document.getElementById('pix-payload').innerText = selectedGift.pixKey;
            document.getElementById('pix-instruction').innerHTML = `<b>${name}</b>, utiliza a chave abaixo ou o QR Code para pagar <b>R$ ${total.toFixed(2)}</b> via PIX.`;
            closeModal('modal-gift'); openModal('modal-pix');
        } else { handleFinishProcess(); }
    } catch (e) { console.error(e); btn.disabled = false; }
};

window.copyPixToClipboard = () => {
    const t = document.getElementById('pix-payload').innerText;
    const el = document.createElement('textarea'); el.value = t; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    const icon = document.getElementById('pix-copy-icon'); icon.setAttribute('data-lucide', 'check'); icon.classList.add('text-green-500'); lucide.createIcons();
    setTimeout(() => { icon.setAttribute('data-lucide', 'copy'); icon.classList.remove('text-green-500'); lucide.createIcons(); }, 2000);
};

function showConfirm(title, msg, action) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-msg').innerText = msg;
    openModal('modal-confirm');
    document.getElementById('btn-confirm-action').onclick = action;
}

async function startApp() {
    lucide.createIcons();
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token).catch(async () => await signInAnonymously(auth));
        } else { await signInAnonymously(auth); }
    } catch (err) { console.error(err); }
    onAuthStateChanged(auth, u => { if (u) { user = u; initData(); } });
}
startApp();

window.setDbStatus = (status) => {
    const container = document.getElementById('db-status-indicator');
    const text = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    const ping = document.getElementById('status-ping');

    if (status === 'online') {
        container.className = "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-green-600 transition-colors duration-500";
        text.innerText = "DB Sincronizado";
        dot.className = "relative inline-flex rounded-full h-2 w-2 bg-green-500";
        ping.className = "hidden";
    } else if (status === 'offline') {
        container.className = "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-red-500 transition-colors duration-500";
        text.innerText = "Desconectado";
        dot.className = "relative inline-flex rounded-full h-2 w-2 bg-red-500";
        ping.className = "hidden"; 
    } else {
        container.className = "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-amber-500 transition-colors duration-500";
        text.innerText = "A Conectar...";
        dot.className = "relative inline-flex rounded-full h-2 w-2 bg-amber-500";
        ping.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75";
    }
};

window.addEventListener('offline', () => setDbStatus('offline'));
window.addEventListener('online', () => setDbStatus('loading'));