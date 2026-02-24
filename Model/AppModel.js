import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, setDoc, doc, deleteDoc, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Importa as configurações do ficheiro vizinho
import { auth, db, giftsPath, contribsPath } from "./config.js";
// No topo, atualize os imports para incluir guestsPath
import { auth, db, giftsPath, contribsPath, guestsPath } from "./config.js";

// Dentro da classe AppModel:
    // ... métodos anteriores ...

    // ADICIONE ESTE MÉTODO:
    async addGuest(data) {
        await addDoc(collection(db, ...guestsPath), data);
    }

    // ... restante da classe ...

export default class AppModel {
    constructor() {
        this.gifts = [];
        this.contributions = [];
        this.user = null;
        this.onDataChanged = null;
        this.onStatusChanged = null;
    }

    async authenticate() {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token).catch(() => signInAnonymously(auth));
            } else {
                await signInAnonymously(auth);
            }
        } catch (err) { console.error("Auth error:", err); }
    }

    listenToAuthChanges(callback) {
        onAuthStateChanged(auth, user => {
            this.user = user;
            if (user) callback();
        });
    }

    startListeners() {
        if (this.onStatusChanged) this.onStatusChanged('loading');

        onSnapshot(collection(db, ...giftsPath), 
            (snap) => {
                this.gifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (this.onDataChanged) this.onDataChanged(this.gifts, this.contributions);
                if (this.onStatusChanged) this.onStatusChanged('online');
            },
            (error) => {
                console.error("Erro Gifts:", error);
                if (this.onStatusChanged) this.onStatusChanged('offline', 'Erro de conexão!');
            }
        );

        onSnapshot(collection(db, ...contribsPath), 
            (snap) => {
                this.contributions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (this.onDataChanged) this.onDataChanged(this.gifts, this.contributions);
                if (this.onStatusChanged) this.onStatusChanged('online');
            }
        );
    }

    async saveGift(id, data) { await setDoc(doc(db, ...giftsPath, id), data); }
    async deleteGift(id) { await deleteDoc(doc(db, ...giftsPath, id)); }
    async addContribution(data) { await addDoc(collection(db, ...contribsPath), data); }
    async deleteContribution(id) { await deleteDoc(doc(db, ...contribsPath, id)); }

    async clearAllContributions() {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, ...contribsPath));
        snapshot.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    getGiftRemainingQuotas(gift) {
        const used = this.contributions.filter(c => c.giftId === gift.id).reduce((s, c) => s + (parseInt(c.quantity) || 0), 0);
        return Math.max(0, (parseInt(gift.totalQuotas) || 1) - used);
    }

    generatePixPayload(key, name, city, amount) {
        const crc16 = (d) => {
            let c = 0xFFFF;
            for (let i = 0; i < d.length; i++) {
                c ^= d.charCodeAt(i) << 8;
                for (let j = 0; j < 8; j++) { if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; else c <<= 1; }
            }
            return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        };
        const formatTag = (id, val) => `${id}${val.toString().length.toString().padStart(2, '0')}${val}`;
        
        const cleanKey = key.replace(/\s/g, '');
        const merchantInfo = formatTag('00', 'br.gov.bcb.pix') + formatTag('01', cleanKey);
        let p = formatTag('00', '01') + formatTag('26', merchantInfo) + formatTag('52', '0000') + formatTag('53', '986') +
            formatTag('54', amount.toFixed(2)) + formatTag('58', 'BR') + formatTag('59', name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25)) +
            formatTag('60', city.toUpperCase().slice(0, 15)) + formatTag('62', formatTag('05', 'CASAMENTO')) + '6304';
        
        return p + crc16(p);
    }
}

