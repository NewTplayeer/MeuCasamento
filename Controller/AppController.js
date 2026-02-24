// Importa a senha do Model
import { ADMIN_PASSWORD } from "../Model/config.js";

export default class AppController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.state = { selectedGift: null, modalQty: 1 };

        // Conecta Model -> View
        this.model.onDataChanged = (gifts, contributions) => {
            this.view.renderClientGifts(gifts, this.model);
            this.view.renderAdminData(gifts, contributions);
        };
        
        this.model.onStatusChanged = (status, errorMsg) => {
            this.view.updateDbStatus(status);
            if(errorMsg) this.view.showStatusBanner(errorMsg, "bg-red-50 text-red-600 border-red-200");
        };
    }

    init() {
        this.bindFormEvents();
        this.model.authenticate().then(() => {
            this.model.listenToAuthChanges(() => {
                this.model.startListeners();
            });
        });
    }

    bindFormEvents() {
        const form = document.getElementById('gift-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.handleSaveGift();
            };
        }
    }

    // --- Ações ---
    openLoginModal() {
        if (sessionStorage.getItem('admin_authed') === 'true') { 
            this.view.setView('admin'); 
        } else { 
            this.view.showModal('modal-login'); 
        }
    }

    handleAdminAuth() {
        const input = document.getElementById('login-pass-input');
        if (input.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_authed', 'true');
            this.view.hideModal('modal-login');
            this.view.setView('admin');
            input.value = "";
        } else {
            this.view.showStatusBanner("Senha incorreta!", "bg-red-50 text-red-600 border-red-200");
            input.value = "";
        }
    }

    async handleSaveGift() {
        const data = this.view.getGiftFormData();
        const id = data.id || "gift_" + Date.now();
        delete data.id; 
        data.timestamp = new Date().toISOString();

        try {
            await this.model.saveGift(id, data);
            this.view.resetGiftForm();
            this.view.showStatusBanner("Gravado com sucesso!", "bg-green-50 text-green-700 border-green-200");
        } catch (err) { console.error(err); }
    }

    handleEditItem(id) {
        const item = this.model.gifts.find(g => g.id === id);
        if (item) this.view.fillGiftForm(item);
    }

    handleDeleteGift(id) {
        const item = this.model.gifts.find(g => g.id === id);
        this.view.showConfirmModal("Excluir?", `Remover "${item.nome}"?`, async () => {
            await this.model.deleteGift(id);
        });
    }

    handleDeleteContrib(id) {
        this.view.showConfirmModal("Remover histórico?", "Não poderá ser desfeito.", async () => {
            await this.model.deleteContribution(id);
        });
    }

    handleClearAllContribs() {
        this.view.showConfirmModal("Limpar Tudo?", "Isto apagará TODAS as contribuições!", async () => {
            await this.model.clearAllContributions();
        });
    }

    // --- Fluxo de Presentear ---
    handleOpenGiftModal(id) {
        const gift = this.model.gifts.find(g => g.id === id);
        if (!gift) return;

        this.state.selectedGift = gift;
        this.state.selectedGift.rem = this.model.getGiftRemainingQuotas(gift);
        this.state.modalQty = 1;
        
        const input = document.getElementById('guest-name-input');
        if(input) input.value = '';
        
        this.view.updateGiftModalUI(this.state.selectedGift, this.state.modalQty);
        this.view.showModal('modal-gift');
    }

    handleQtyChange(val) {
        if(!this.state.selectedGift) return;
        const next = this.state.modalQty + val;
        if (next >= 1 && next <= this.state.selectedGift.rem) { 
            this.state.modalQty = next; 
            this.view.updateGiftModalUI(this.state.selectedGift, this.state.modalQty);
        }
    }

    async handleConfirmContribution() {
        const name = this.view.getGuestInputData();
        if (!name) return this.view.showStatusBanner("Assine o seu presente!", "bg-amber-50 text-amber-700 border-amber-200");
        
        const gift = this.state.selectedGift;
        const isFree = !gift.valor || parseFloat(gift.valor) === 0;
        const total = isFree ? 0 : gift.valor * this.state.modalQty;
        
        this.view.setGiftSubmitLoading(true);

        try {
            await this.model.addContribution({
                giftId: gift.id, giftName: gift.nome, guestName: name, 
                quantity: this.state.modalQty, totalValue: total, 
                timestamp: new Date().toISOString()
            });

            if (!isFree && gift.pixKey) {
                const payload = this.model.generatePixPayload(gift.pixKey, 'Bruno Freitas & Maria Fernanda', 'SAO PAULO', total);
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;
                const instruction = `<b>${name}</b>, utilize a chave abaixo ou o QR Code para pagar <b>R$ ${total.toFixed(2)}</b> via PIX.`;
                
                this.view.hideModal('modal-gift');
                this.view.setupPixModal(gift.pixKey, qrUrl, instruction);
            } else { 
                this.handleFinishProcess(name); 
            }
        } catch (e) { 
            console.error(e); 
        } finally {
            this.view.setGiftSubmitLoading(false);
        }
    }

    handleFinishProcess(guestNameFallback) {
        this.view.hideModal('modal-pix');
        this.view.hideModal('modal-gift');
        const name = this.view.getGuestInputData() || guestNameFallback;
        
        this.view.showStatusBanner(`<div class="flex flex-col items-center gap-2">
            <i data-lucide="check-circle" class="w-10 h-10 text-gold mb-2"></i>
            <p class="text-xl font-serif text-dark">Muito Obrigado, ${name}!</p>
            <p class="text-gray-500 font-light">O seu carinho faz toda a diferença.</p>
        </div>`, "bg-white border-gold border-t-4");
    }

    copyPixToClipboard() {
        const t = document.getElementById('pix-payload').innerText;
        const el = document.createElement('textarea'); 
        el.value = t; 
        document.body.appendChild(el); 
        el.select();
        document.execCommand('copy'); 
        document.body.removeChild(el);

        const icon = document.getElementById('pix-copy-icon'); 
        if(icon) {
            icon.setAttribute('data-lucide', 'check'); 
            icon.classList.add('text-green-500'); 
            if(window.lucide) window.lucide.createIcons();
            
            setTimeout(() => { 
                icon.setAttribute('data-lucide', 'copy'); 
                icon.classList.remove('text-green-500'); 
                if(window.lucide) window.lucide.createIcons(); 
            }, 2000);
        }
    }
}

// Dentro da classe AppController:

    // ... métodos anteriores ...

    // ADICIONE ESTE MÉTODO:
    async handleRSVPSubmit() {
        // 1. Pega os dados da View
        const data = this.view.getRSVPFormData();

        // 2. Validação básica
        if (!data.name || !data.phone) {
            this.view.showStatusBanner("Por favor, preencha o nome e telefone.", "bg-amber-50 text-amber-700 border-amber-200");
            return;
        }

        this.view.setRSVPLoading(true);

        try {
            // 3. Salva no Model
            await this.model.addGuest({
                ...data,
                timestamp: new Date().toISOString()
            });

            // 4. Mostra sucesso
            this.view.showRSVPSuccess();
            
        } catch (error) {
            console.error(error);
            this.view.showStatusBanner("Erro ao confirmar. Tente novamente.", "bg-red-50 text-red-600 border-red-200");
        } finally {
            this.view.setRSVPLoading(false);
        }
    }