import { Modal, Setting, Notice, App, setIcon } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction, CreditCard } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency, calculateCardBill } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { setupCurrencyInput, renderCategoryDropdown, ConfirmationModal } from '../../../utils/ui-helpers';

export class AddCreditCardFormModal extends Modal {
    plugin: MoneyManagerPlugin;
    onSubmit: () => void;

    constructor(app: App, plugin: MoneyManagerPlugin, onSubmit: () => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: t('MODAL_ADD_CARD_TITLE') });

        let name = '', limit = 0, closingDay = 0, dueDate = 0;

        new Setting(contentEl).setName(t('MODAL_ADD_CARD_NAME')).addText(text => text.onChange(val => name = val.trim()));
        new Setting(contentEl).setName(t('MODAL_ADD_CARD_LIMIT')).addText(text => setupCurrencyInput(text, val => limit = val));
        new Setting(contentEl).setName(t('MODAL_ADD_CARD_CLOSING_DAY')).addText(text => {
            text.inputEl.type = 'number'; text.inputEl.min = '1'; text.inputEl.max = '31';
            text.onChange(val => closingDay = parseInt(val) || 0);
        });
        new Setting(contentEl).setName(t('MODAL_ADD_CARD_DUE_DAY')).addText(text => {
            text.inputEl.type = 'number'; text.inputEl.min = '1'; text.inputEl.max = '31';
            text.onChange(val => dueDate = parseInt(val) || 0);
        });

        new Setting(contentEl).addButton(btn => btn
            .setButtonText(t('MODAL_ADD_CARD_SAVE_BUTTON'))
            .setCta()
            .onClick(async () => {
                if (name && limit > 0 && closingDay >= 1 && closingDay <= 31 && dueDate >= 1 && dueDate <= 31) {
                    const newCard: CreditCard = { id: `cc_${Date.now()}`, name, limit, closingDay, dueDate };
                    this.plugin.settings.creditCards.push(newCard);
                    await this.plugin.saveSettings();
                    eventManager.emit('data-changed');
                    this.onSubmit(); // Recarrega o modal anterior
                    this.close();
                } else { new Notice(t('MODAL_ADD_CARD_INVALID_FIELDS_NOTICE')); }
            }));
    }

    onClose() { this.contentEl.empty(); }
}

export class ManageCreditCardsModal extends Modal {
    plugin: MoneyManagerPlugin;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_MANAGE_CARDS_TITLE') });

        // --- SEÇÃO DE LISTAGEM DE CARTÕES ---
        const cardsListContainer = contentEl.createDiv({ cls: 'cards-list-container' });
        const creditCards = this.plugin.settings.creditCards;

        if (creditCards.length === 0) {
            cardsListContainer.createEl('p', { text: t('MODAL_MANAGE_CARDS_EMPTY') });
        } else {
            creditCards.forEach(card => {
                const cardItem = cardsListContainer.createDiv({ cls: 'credit-card-item' });

                const cardInfo = cardItem.createDiv({ cls: 'card-info' });
                cardInfo.createEl('span', { text: card.name, cls: 'card-name' });
                cardInfo.createEl('span', { text: t('MODAL_MANAGE_CARDS_LIMIT_LABEL', { limit: formatAsCurrency(card.limit) }), cls: 'card-limit' });

                const cardActions = cardItem.createDiv({ cls: 'card-actions' });

                // BOTÃO EXPLÍCITO PARA DETALHAR FATURA
                cardActions.createEl('button', { text: t('MODAL_MANAGE_CARDS_DETAILS_BUTTON') })
                    .addEventListener('click', () => {
                        // Ao abrir a partir daqui, queremos ver a próxima fatura a vencer.
                        const today = moment();
                        let billMonth = moment();
                        // Se a data de hoje já passou do dia de fechamento, a "próxima fatura" é a do mês seguinte.
                        if (today.date() > card.closingDay) {
                            billMonth.add(1, 'month');
                        }
                        new CardBillDetailModal(this.app, this.plugin, card.id, billMonth).open();
                        this.close();
                    });

                const deleteButton = cardActions.createEl('button', { cls: 'mod-warning' });
                setIcon(deleteButton, 'trash-2'); // Usa um ícone de lixeira
                deleteButton.addEventListener('click', async () => {
                    new ConfirmationModal(
                        this.app,
                        t('MODAL_MANAGE_CARDS_DELETE_TITLE'),
                        t('MODAL_MANAGE_CARDS_DELETE_CONFIRM', { cardName: card.name }),
                        async () => {
                            this.plugin.settings.creditCards = this.plugin.settings.creditCards.filter(c => c.id !== card.id);
                            await this.plugin.saveSettings();
                            this.onOpen();
                        }
                    ).open();
                });
            });
        }

        contentEl.createEl('hr');

        // --- SEÇÃO PARA ADICIONAR NOVO CARTÃO ---
        new Setting(contentEl)
            .setName(t('MODAL_MANAGE_CARDS_ADD_NEW_TITLE'))
            .setDesc(t('MODAL_MANAGE_CARDS_ADD_NEW_DESC'))
            .addButton(button => {
                button.setButtonText(t('MODAL_MANAGE_CARDS_ADD_NEW_BUTTON'))
                    .setCta()
                    .onClick(() => {
                        new AddCreditCardFormModal(this.app, this.plugin, () => this.onOpen()).open();
                    });
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class CardBillDetailModal extends Modal {
    plugin: MoneyManagerPlugin;
    cardId: string;
    currentMonth: moment.Moment;

    constructor(app: App, plugin: MoneyManagerPlugin, cardId: string, currentMonth: moment.Moment) {
        super(app);
        this.plugin = plugin;
        this.cardId = cardId;
        this.currentMonth = currentMonth;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const card = this.plugin.settings.creditCards.find(c => c.id === this.cardId);
        if (!card) {
            contentEl.setText(t('MODAL_CARD_BILL_NOT_FOUND'));
            return;
        }

        contentEl.createEl('h2', { text: t('MODAL_CARD_BILL_TITLE', { cardName: card.name }) });

        // Usa o mês que foi passado pelo construtor para garantir consistência com a view principal.
        const bill = calculateCardBill(card, this.plugin.settings.transactions, this.currentMonth);
        const { total: billTotal, dueDate: billDueDate, transactions: transactionsForBill } = bill;

        contentEl.createEl('p', { text: t('MODAL_CARD_BILL_HEADER', { monthYear: this.currentMonth.format('MMMM YYYY'), dueDate: billDueDate.format('DD/MM'), total: formatAsCurrency(billTotal) }) });

        // --- List transactions in the bill ---
        if (transactionsForBill.length > 0) {
            const billItemsContainer = contentEl.createDiv({ cls: 'payment-list-container' });
            billItemsContainer.createEl('h4', { text: t('MODAL_CARD_BILL_ITEMS_TITLE') });
            transactionsForBill.forEach((transaction: Transaction) => {
                const itemSetting = new Setting(billItemsContainer)

                    .setName(transaction.description)
                    .setDesc(formatAsCurrency(transaction.amount));

                // Adiciona botão de Editar
                itemSetting.addButton(btn => btn
                    .setIcon('pencil')
                    .setTooltip(t('MODAL_CARD_BILL_EDIT_PURCHASE_TOOLTIP'))
                    .onClick(() => {
                        if (!transaction.isInstallment || !transaction.installmentOf) {
                            new Notice(t('MODAL_CARD_BILL_EDIT_ONLY_INSTALLMENTS_NOTICE'));
                            return;
                        }
                        const purchaseId = transaction.installmentOf;
                        const allInstallments = this.plugin.settings.transactions
                            .filter((trans: Transaction) => trans.installmentOf === purchaseId)
                            .sort((a: Transaction, b: Transaction) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

                        if (allInstallments.length > 0) {
                            const firstInstallment = allInstallments[0];
                            new EditPurchaseModal(this.app, this.plugin, firstInstallment, () => this.onOpen()).open();
                            this.close();
                        } else {
                            new Notice(t('MODAL_CARD_BILL_EDIT_ORIGINAL_NOT_FOUND_NOTICE'));
                        }
                    }));

                // Adiciona botão de Apagar
                itemSetting.addButton(btn => btn
                    .setIcon('trash')
                    .setTooltip(t('MODAL_CARD_BILL_DELETE_PURCHASE_TOOLTIP'))
                    .setClass('mod-warning')
                    .onClick(async () => {
                        if (!transaction.installmentOf) {
                            new Notice(t('MODAL_CARD_BILL_DELETE_ONLY_INSTALLMENTS_NOTICE'));
                            return;
                        }
                        const baseDescription = transaction.description.substring(0, transaction.description.lastIndexOf(' ('));
                        new ConfirmationModal(
                            this.app,
                            t('MODAL_CARD_BILL_DELETE_TITLE'),
                            t('MODAL_CARD_BILL_DELETE_CONFIRM', { purchaseName: baseDescription }),
                            async () => {
                                const purchaseId = transaction.installmentOf!;
                                this.plugin.settings.transactions = this.plugin.settings.transactions.filter(
                                    trans => trans.installmentOf !== purchaseId
                                );
                                await this.plugin.saveSettings();
                                eventManager.emit('data-changed');
                                this.onOpen(); // Recarrega o modal para refletir a exclusão
                            }
                        ).open();
                    }));
            });
        } else {
            contentEl.createEl('p', { text: t('MODAL_CARD_BILL_EMPTY', { monthYear: this.currentMonth.format('MMMM YYYY') }), cls: 'mod-subtle' });
        }

        contentEl.createEl('hr');

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t('MODAL_CARD_BILL_ADD_PURCHASE_BUTTON'))
                .setCta()
                .onClick(() => {
                    // Abre o modal de adição, passando um callback para recarregar este modal ao salvar
                    new AddPurchaseModal(this.app, this.plugin, this.cardId, () => this.onOpen()).open();
                    this.close();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class EditPurchaseModal extends Modal {
    plugin: MoneyManagerPlugin;
    firstInstallment: Transaction;
    onSaveCallback?: () => void;

    // Form state
    private description: string = '';
    private totalAmount: number = 0;
    private installments: number = 1;
    private purchaseDate: string = moment().format('YYYY-MM-DD');
    private category: string = '';
    private installmentsPaid: number = 0;
    private cardId: string;

    constructor(app: App, plugin: MoneyManagerPlugin, firstInstallment: Transaction, onSaveCallback?: () => void) {
        super(app);
        this.plugin = plugin;
        this.firstInstallment = firstInstallment;
        this.onSaveCallback = onSaveCallback;
        this.cardId = firstInstallment.cardId!;

        // Pre-populate form state
        const purchaseGroup = this.plugin.settings.transactions.filter((transaction: Transaction) => transaction.installmentOf === this.firstInstallment.installmentOf);

        this.description = this.firstInstallment.description.substring(0, this.firstInstallment.description.lastIndexOf(' ('));
        this.totalAmount = this.firstInstallment.amount * this.firstInstallment.totalInstallments!;
        this.installments = this.firstInstallment.totalInstallments!;
        this.purchaseDate = this.firstInstallment.purchaseDate || moment().format('YYYY-MM-DD');
        this.category = this.firstInstallment.category;
        this.installmentsPaid = purchaseGroup.filter((transaction: Transaction) => transaction.status === 'paid').length;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_EDIT_PURCHASE_TITLE') });

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_DESCRIPTION')).addText(text => text.setValue(this.description).onChange(val => this.description = val));

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_TOTAL_AMOUNT')).addText(text => {
            setupCurrencyInput(text, val => this.totalAmount = val, this.totalAmount);
        });

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_TOTAL_INSTALLMENTS')).addText(text => {
            text.inputEl.type = 'number';
            text.inputEl.min = '1';
            text.setValue(String(this.installments)).onChange(val => this.installments = parseInt(val) || 1);
        });

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_DATE')).addText(text => {
            text.inputEl.type = 'date';
            text.setValue(this.purchaseDate).onChange(val => this.purchaseDate = val);
        });

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_INSTALLMENTS_PAID')).addText(text => {
            text.inputEl.type = 'number';
            text.inputEl.min = '0';
            text.setValue(String(this.installmentsPaid));
            text.setDisabled(true); // Non-editable
        });

        renderCategoryDropdown(contentEl, this.plugin, () => this.category, (val) => this.category = val);

        new Setting(contentEl).addButton(btn => btn
            .setButtonText(t('MODAL_EDIT_PURCHASE_SAVE_BUTTON'))
            .setCta()
            .onClick(() => this.saveChanges()));
    }

    private async saveChanges() {
        if (!this.description || this.totalAmount <= 0 || this.installments <= 0) {
            new Notice(t('MODAL_EDIT_PURCHASE_REQUIRED_FIELDS_NOTICE'));
            return;
        }
        if (this.installmentsPaid >= this.installments) {
            new Notice(t('MODAL_EDIT_PURCHASE_PAID_EXCEEDS_TOTAL_NOTICE'));
            return;
        }

        // 1. Remove ALL existing transactions for this purchase to ensure consistency
        const purchaseId = this.firstInstallment.installmentOf!;
        this.plugin.settings.transactions = this.plugin.settings.transactions.filter((transaction: Transaction) =>
            transaction.installmentOf !== purchaseId
        );

        // 2. Re-generate all installments from scratch with the new, correct data
        const card = this.plugin.settings.creditCards.find((c: CreditCard) => c.id === this.cardId);
        if (!card) {
            new Notice(t('MODAL_EDIT_PURCHASE_CARD_NOT_FOUND_NOTICE'));
            return;
        }

        const installmentAmount = this.totalAmount / this.installments;
        const newTransactions: Transaction[] = [];

        // Lógica de data definitiva para cálculo de vencimento da fatura.
        // 1. Determina o mês de FECHAMENTO da primeira parcela.
        const purchaseDateMoment = moment(this.purchaseDate);
        let closingMonth = purchaseDateMoment.clone();
        if (purchaseDateMoment.date() > card.closingDay) {
            closingMonth.add(1, 'month');
        }

        // 2. Determina o mês de VENCIMENTO da primeira parcela.
        let firstDueDateMonth = closingMonth.clone();
        if (card.dueDate < card.closingDay) {
            firstDueDateMonth.add(1, 'month');
        }

        for (let i = 0; i < this.installments; i++) {
            const installmentNumber = i + 1;

            const targetMonth = firstDueDateMonth.clone().add(i, 'months');
            const daysInTargetMonth = targetMonth.daysInMonth();
            const dueDay = Math.min(card.dueDate, daysInTargetMonth);
            const billDueDate = targetMonth.date(dueDay);

            const newTransaction: Transaction = {
                id: `txn_${purchaseId}_${installmentNumber}`,
                description: `${this.description} (${installmentNumber}/${this.installments})`,
                amount: installmentAmount,
                date: billDueDate.format('YYYY-MM-DD'),
                category: this.category,
                type: 'expense',
                status: installmentNumber <= this.installmentsPaid ? 'paid' : 'pending',
                isRecurring: false,
                isInstallment: true,
                installmentOf: purchaseId,
                installmentNumber: installmentNumber,
                totalInstallments: this.installments,
                cardId: this.cardId,
                purchaseDate: this.purchaseDate,
            };
            newTransactions.push(newTransaction);
        }

        this.plugin.settings.transactions.push(...newTransactions);
        await this.plugin.saveSettings();
        eventManager.emit('data-changed');
        new Notice(t('MODAL_EDIT_PURCHASE_SUCCESS_NOTICE'));
        this.onSaveCallback?.();
        this.close();
    }

}

export class AddPurchaseModal extends Modal {
    plugin: MoneyManagerPlugin;
    cardId: string;
    private onSaveCallback?: () => void;

    // Form state
    private description: string = '';
    private totalAmount: number = 0;
    private installments: number = 1;
    private purchaseDate: string = moment().format('YYYY-MM-DD');
    private category: string = '';
    private installmentsPaid: number = 0;

    constructor(app: App, plugin: MoneyManagerPlugin, cardId: string, onSaveCallback?: () => void) {
        super(app);
        this.plugin = plugin;
        this.cardId = cardId;
        this.onSaveCallback = onSaveCallback;

        // MODO DE CRIAÇÃO: Usa valores padrão
        if (this.plugin.settings.categories.length > 0) {
            this.category = this.plugin.settings.categories.find((c: {id: string, name: string}) => c.name === 'Alimentação')?.name || this.plugin.settings.categories[0].name;
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_ADD_PURCHASE_TITLE') });

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_DESCRIPTION')).addText(text => text.onChange(val => this.description = val));
        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_TOTAL_AMOUNT')).addText(text => setupCurrencyInput(text, val => this.totalAmount = val));

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_TOTAL_INSTALLMENTS')).addText(text => {
            text.inputEl.type = 'number';
            text.inputEl.min = '1';
            text.setValue('1').onChange(val => this.installments = parseInt(val) || 1);
        });

        new Setting(contentEl).setName(t('MODAL_EDIT_PURCHASE_DATE')).addText(text => {
            text.inputEl.type = 'date';
            text.setValue(this.purchaseDate).onChange(val => this.purchaseDate = val);
        });

        new Setting(contentEl).setName(t('MODAL_ADD_PURCHASE_INSTALLMENTS_PAID')).addText(text => {
            text.inputEl.type = 'number';
            text.inputEl.min = '0';
            text.setValue('0').onChange(val => this.installmentsPaid = parseInt(val) || 0);
        });

        renderCategoryDropdown(contentEl, this.plugin, () => this.category, (val) => this.category = val);

        new Setting(contentEl).addButton(btn => btn
            .setButtonText(t('MODAL_ADD_PURCHASE_SAVE_BUTTON'))
            .setCta()
            .onClick(() => this.savePurchase()));
    }

    private async savePurchase() {
        if (!this.description || this.totalAmount <= 0 || this.installments <= 0) {
            new Notice(t('MODAL_EDIT_PURCHASE_REQUIRED_FIELDS_NOTICE'));
            return;
        }
        if (this.installmentsPaid >= this.installments) {
            new Notice(t('MODAL_EDIT_PURCHASE_PAID_EXCEEDS_TOTAL_NOTICE'));
            return;
        }

        const card = this.plugin.settings.creditCards.find((c: CreditCard) => c.id === this.cardId);
        if (!card) {
            new Notice(t('MODAL_EDIT_PURCHASE_CARD_NOT_FOUND_NOTICE'));
            return;
        }

        const purchaseId = `purch_${Date.now()}`;
        const installmentAmount = this.totalAmount / this.installments;
        const newTransactions: Transaction[] = [];

        // Lógica de data definitiva para cálculo de vencimento da fatura.
        // 1. Determina o mês de FECHAMENTO da primeira parcela.
        const purchaseDateMoment = moment(this.purchaseDate);
        let closingMonth = purchaseDateMoment.clone();
        if (purchaseDateMoment.date() > card.closingDay) {
            closingMonth.add(1, 'month');
        }

        // 2. Determina o mês de VENCIMENTO da primeira parcela.
        let firstDueDateMonth = closingMonth.clone();
        if (card.dueDate < card.closingDay) {
            firstDueDateMonth.add(1, 'month');
        }

        // Create ALL installments, from the first to the last
        for (let i = 0; i < this.installments; i++) {
            const installmentNumber = i + 1;
            const targetMonth = firstDueDateMonth.clone().add(i, 'months');
            const daysInTargetMonth = targetMonth.daysInMonth();
            const dueDay = Math.min(card.dueDate, daysInTargetMonth);
            const billDueDate = targetMonth.date(dueDay);

            const newTransaction: Transaction = {
                id: `txn_${purchaseId}_${installmentNumber}`,
                description: `${this.description} (${installmentNumber}/${this.installments})`,
                amount: installmentAmount,
                date: billDueDate.format('YYYY-MM-DD'),
                category: this.category,
                type: 'expense',
                // Set status based on how many were already paid
                status: installmentNumber <= this.installmentsPaid ? 'paid' : 'pending',
                isRecurring: false,
                isInstallment: true,
                installmentOf: purchaseId,
                installmentNumber: installmentNumber,
                totalInstallments: this.installments,
                cardId: this.cardId,
                purchaseDate: this.purchaseDate,
            };
            newTransactions.push(newTransaction);
        }

        this.plugin.settings.transactions.push(...newTransactions);
        await this.plugin.saveSettings();
        eventManager.emit('data-changed');
        new Notice(t('MODAL_ADD_PURCHASE_SUCCESS_NOTICE'));
        this.onSaveCallback?.();
        this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class PurchaseDetailModal extends Modal {
    plugin: MoneyManagerPlugin;
    purchaseId: string;

    constructor(app: App, plugin: MoneyManagerPlugin, purchaseId: string) {
        super(app);
        this.plugin = plugin;
        this.purchaseId = purchaseId;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const allInstallments = this.plugin.settings.transactions
            .filter((transaction: Transaction) => transaction.installmentOf === this.purchaseId)
            .sort((a: Transaction, b: Transaction) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

        if (allInstallments.length === 0) {
            contentEl.createEl('h2', { text: t('MODAL_PURCHASE_DETAIL_ERROR_TITLE') });
            contentEl.createEl('p', { text: t('MODAL_PURCHASE_DETAIL_NOT_FOUND') });
            return;
        }

        const firstInstallment = allInstallments[0];
        const baseDescription = firstInstallment.description.substring(0, firstInstallment.description.lastIndexOf(' (')).trim();
        const totalAmount = firstInstallment.amount * (firstInstallment.totalInstallments || 1);

        contentEl.createEl('h2', { text: baseDescription });
        new Setting(contentEl)
            .setName(t('MODAL_PURCHASE_DETAIL_TOTAL_AMOUNT'))
            .setDesc(formatAsCurrency(totalAmount));
        new Setting(contentEl)
            .setName(t('MODAL_PURCHASE_DETAIL_CATEGORY'))
            .setDesc(firstInstallment.category);
        new Setting(contentEl)
            .setName(t('MODAL_PURCHASE_DETAIL_TOTAL_INSTALLMENTS'))
            .setDesc(String(firstInstallment.totalInstallments || 1));

        contentEl.createEl('hr');
        contentEl.createEl('h3', { text: t('MODAL_PURCHASE_DETAIL_INSTALLMENTS_TITLE') });

        const installmentsContainer = contentEl.createDiv({ cls: 'installments-list-container' });
        allInstallments.forEach((installment: Transaction) => {
            const item = new Setting(installmentsContainer)
                .setName(installment.description)
                .setDesc(t('MODAL_PURCHASE_DETAIL_DUE_DATE', { date: moment(installment.date).format('DD/MM/YYYY') }));

            item.controlEl.createSpan({
                text: installment.status === 'paid' ? t('STATUS_PAID') : t('STATUS_PENDING'),
                cls: `status-badge status-${installment.status}`
            });
        });
    }
}