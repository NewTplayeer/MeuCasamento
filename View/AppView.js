export default class AppView {
    constructor() {
        if (window.lucide) window.lucide.createIcons();
    }

    // --- UTILS ---
    setView(viewName) {
        document.getElementById('client-view')?.classList.toggle('hidden', viewName !== 'client');
        document.getElementById('admin-view')?.classList.toggle('hidden', viewName !== 'admin');
        window.scrollTo(0, 0);
    }

    showModal(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hidden');
            el.classList.add('flex');
            if (window.lucide) window.lucide.createIcons();
        }
    }

    hideModal(id) {
        document.getElementById(id)?.classList.add('hidden');
        document.getElementById(id)?.classList.remove('flex');
    }

    showStatusBanner(msg, classes) {
        const b = document.getElementById('status-banner');
        if(!b) return;
        b.innerHTML = msg;
        // ESTILO QUADRADO
        b.className = `max-w-2xl mx-auto mt-6 p-4 rounded-sm text-sm text-center font-sans shadow-md border animate-in fade-in duration-300 block ${classes}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => b.classList.add('hidden'), 10000);
    }

    updateDbStatus(status) {
        const container = document.getElementById('db-status-indicator');
        if (!container) return;
        
        // MANIPULAÇÃO DE CORES PARA O PAINEL DE ADMIN
        const text = document.getElementById('status-text');
        const dot = document.getElementById('status-dot');
        const ping = document.getElementById('status-ping');

        if (status === 'online') {
            container.className = "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-green-600";
            text.innerText = "DB Sincronizado";
            dot.className = "relative inline-flex rounded-full h-2 w-2 bg-green-500";
            ping.className = "hidden";
        } else if (status === 'offline') {
            container.className = "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-red-500";
            text.innerText = "Desconectado";
            dot.className = "relative inline-flex rounded-full h-2 w-2 bg-red-500";
            ping.className = "hidden"; 
        } else {
            container.className = "flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-amber-500";
            text.innerText = "A Conectar...";
            dot.className = "relative inline-flex rounded-full h-2 w-2 bg-amber-500";
            ping.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75";
        }
    }

    // --- RENDERIZAÇÃO NO ESTILO QUADRADO/DOURADO ---
    renderClientGifts(gifts, model) {
        const grid = document.getElementById('gifts-grid');
        if (!grid) return;

        if (gifts.length === 0) { 
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-300 font-serif italic text-xl border border-dashed border-gray-200 rounded-sm">Sem itens configurados.</div>`; 
            return; 
        }
        
        grid.innerHTML = gifts.map(item => {
            const rem = model.getGiftRemainingQuotas(item);
            const isSoldOut = rem <= 0;
            const isFree = !item.valor || parseFloat(item.valor) === 0;

            // CARTÃO QUADRADO (rounded-sm) E DOURADO (text-gold)
            return `
            <div class="bg-white rounded-sm overflow-hidden shadow-lg border border-gray-100 flex flex-col transform transition-all duration-300 ${isSoldOut ? 'opacity-60 grayscale' : 'hover:-translate-y-2'}">
                <div class="p-6 md:p-8 text-center flex-grow flex flex-col font-sans">
                    <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gold">
                        <i data-lucide="gift" class="w-5 h-5"></i>
                    </div>
                    <h3 class="text-xl md:text-2xl font-serif text-dark mb-2 leading-tight">${item.nome}</h3>
                    <p class="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-4">${isFree ? '' : 'COTA: R$ ' + parseFloat(item.valor).toFixed(2)}</p>
                    <p class="text-[10px] uppercase font-bold mb-6 ${rem > 0 ? 'text-gold' : 'text-gray-400'}">${rem > 0 ? rem + ' disponíveis' : 'Reservado'}</p>
                    <button onclick="window.appController.handleOpenGiftModal('${item.id}')" ${isSoldOut ? 'disabled' : ''} class="mt-auto w-full py-4 bg-dark text-white rounded-sm text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-sm">
                        ${isFree ? 'Presentear' : 'Presentear'}
                    </button>
                </div>
            </div>`;
        }).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    renderAdminData(gifts, contributions) {
        const list = document.getElementById('contributions-list');
        const adminGifts = document.getElementById('admin-gifts-list');
        if (!list || !adminGifts) return;

        const sorted = [...contributions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        list.innerHTML = sorted.map(c => `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50">
                <td class="py-4 px-6 text-dark font-medium">${c.guestName}</td>
                <td class="py-4 px-6 text-gray-500">${c.giftName} (${c.quantity}x)</td>
                <td class="py-4 px-6 font-bold text-dark">${c.totalValue > 0 ? 'R$ ' + parseFloat(c.totalValue).toFixed(2) : '<span class="text-green-600 uppercase text-[9px] tracking-widest">Livre</span>'}</td>
                <td class="py-4 px-6 text-right">
                    <button onclick="window.appController.handleDeleteContrib('${c.id}')" class="text-gray-300 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>`).join('');

        adminGifts.innerHTML = gifts.map(item => `
            <div class="flex items-center gap-4 p-4 border border-gray-100 rounded-sm bg-gray-50/50 hover:bg-gray-50 transition-all font-sans text-left">
                <div class="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gold shadow-sm"><i data-lucide="gift" class="w-4 h-4"></i></div>
                <div class="flex-grow min-w-0">
                    <p class="font-bold text-sm truncate text-dark">${item.nome}</p>
                    <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">${(!item.valor || item.valor === 0) ? 'Livre' : 'R$ ' + parseFloat(item.valor).toFixed(2)} | Qtd: ${item.totalQuotas}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.appController.handleEditItem('${item.id}')" class="text-gray-400 hover:text-dark transition-colors"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    <button onclick="window.appController.handleDeleteGift('${item.id}')" class="text-gray-400 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>`).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    // --- FORM & MODAL LOGIC ---
    updateGiftModalUI(gift, qty) {
        document.getElementById('modal-gift-name').innerText = gift.nome;
        document.getElementById('modal-qty').innerText = qty;
        const isFree = !gift.valor || parseFloat(gift.valor) === 0;
        document.getElementById('modal-total-box').classList.toggle('hidden', isFree);
        if (!isFree) document.getElementById('modal-total').innerText = `R$ ${(gift.valor * qty).toFixed(2)}`;
    }

    fillGiftForm(item) {
        document.getElementById('edit-id').value = item.id;
        document.getElementById('form-nome').value = item.nome;
        document.getElementById('form-valor').value = item.valor || 0;
        document.getElementById('form-total-quotas').value = item.totalQuotas;
        document.getElementById('form-pix-key').value = item.pixKey || '';
        document.getElementById('btn-save').innerText = "Atualizar Item";
        document.getElementById('btn-cancel-edit').classList.remove('hidden');
    }

    resetGiftForm() {
        document.getElementById('gift-form').reset();
        document.getElementById('edit-id').value = "";
        document.getElementById('btn-save').innerText = "Guardar Presente";
        document.getElementById('btn-cancel-edit').classList.add('hidden');
    }

    showConfirmModal(title, msg, onConfirm) {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerText = msg;
        this.showModal('modal-confirm');
        const btn = document.getElementById('btn-confirm-action');
        btn.onclick = () => { onConfirm(); this.hideModal('modal-confirm'); };
    }

    setupPixModal(pixKey, qrUrl, instructionHtml) {
        document.getElementById('pix-qr').src = qrUrl;
        document.getElementById('pix-payload').innerText = pixKey;
        document.getElementById('pix-instruction').innerHTML = instructionHtml;
        this.showModal('modal-pix');
    }

    // --- GETTERS & RSVP ---
    getGiftFormData() {
        return {
            id: document.getElementById('edit-id').value,
            nome: document.getElementById('form-nome').value,
            valor: parseFloat(document.getElementById('form-valor').value || 0),
            totalQuotas: parseInt(document.getElementById('form-total-quotas').value || 1),
            pixKey: document.getElementById('form-pix-key').value || '',
        };
    }

    getGuestInputData() {
        return document.getElementById('guest-name-input').value.trim();
    }

    setGiftSubmitLoading(isLoading) {
        const btn = document.getElementById('btn-confirm-gift');
        if (btn) btn.disabled = isLoading;
    }

    getRSVPFormData() {
        return {
            name: document.getElementById('rsvp-name').value.trim(),
            phone: document.getElementById('rsvp-phone').value.trim(),
            adults: parseInt(document.getElementById('rsvp-adults').value || 1),
            kids: parseInt(document.getElementById('rsvp-kids').value || 0),
            message: document.getElementById('rsvp-message').value.trim()
        };
    }

    showRSVPSuccess() {
        document.getElementById('rsvp-form').classList.add('hidden');
        document.getElementById('rsvp-success').classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    setRSVPLoading(isLoading) {
        const btn = document.getElementById('btn-rsvp-submit');
        if (btn) {
            btn.disabled = isLoading;
            btn.innerText = isLoading ? "A Enviar..." : "Confirmar Presença";
        }
    }
}