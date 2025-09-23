import { Modal, Setting, Notice, App } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { renderCategoryDropdown } from '../../../utils/ui-helpers';

export class AccountDetailModal extends Modal {
    plugin: MoneyManagerPlugin;
    groupKey: string; // description for recurring, installmentOf for installments
    isInstallment: boolean;

    constructor(app: App, plugin: MoneyManagerPlugin, groupKey: string, isInstallment: boolean) {
        super(app);
        this.plugin = plugin;
        this.groupKey = groupKey;
        this.isInstallment = isInstallment;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const groupTransactions = this.isInstallment
            ? this.plugin.settings.transactions.filter((transaction: Transaction) => transaction.installmentOf === this.groupKey)
            : this.plugin.settings.transactions.filter((transaction: Transaction) => transaction.description === this.groupKey && transaction.isRecurring);

        if (groupTransactions.length === 0) {
            contentEl.setText(t('MODAL_ACCOUNT_DETAIL_NOT_FOUND'));
            return;
        }

        const firstTransaction = groupTransactions[0];
        const mainDescription = this.isInstallment
            ? firstTransaction.description.substring(0, firstTransaction.description.lastIndexOf('(')).trim()
            : firstTransaction.description;

        const header = contentEl.createDiv({ cls: 'modal-header-with-action' });
        header.createEl('h2', { text: mainDescription });
        header.createEl('button', { text: t('MODAL_ACCOUNT_DETAIL_EDIT_BUTTON') }).addEventListener('click', () => {
            new EditAccountModal(this.app, this.plugin, this.groupKey, this.isInstallment, () => this.onOpen()).open();
        });

        // Botão de Pausar, apenas para transações recorrentes
        if (!this.isInstallment) {
            header.createEl('button', { text: t('MODAL_ACCOUNT_DETAIL_PAUSE_BUTTON') }).addEventListener('click', () => {
                new PauseRecurringModal(this.app, this.plugin, this.groupKey, () => this.onOpen()).open();
            });
        }

        contentEl.createEl('p', { text: t('MODAL_ACCOUNT_DETAIL_CATEGORY', { category: firstTransaction.category }) });
        if (!this.isInstallment) {
            contentEl.createEl('p', { text: t('MODAL_ACCOUNT_DETAIL_MONTHLY_AMOUNT', { amount: formatAsCurrency(firstTransaction.amount) }) });
        }

        contentEl.createEl('h3', { text: t('MODAL_ACCOUNT_DETAIL_FUTURE_PAYMENTS') });
        const futureContainer = contentEl.createDiv({ cls: 'payment-list-container' });
        const pending = groupTransactions.filter((transaction: Transaction) => transaction.status === 'pending').sort((a: Transaction, b: Transaction) => moment(a.date).diff(moment(b.date)));
        if (pending.length > 0) {
            pending.forEach((transaction: Transaction) => {
                const name = moment(transaction.date).format('DD/MM/YYYY');
                const desc = transaction.pausedUntil && moment(transaction.pausedUntil).isSameOrAfter(moment(transaction.date), 'day')
                    ? t('MODAL_ACCOUNT_DETAIL_PAUSED_UNTIL', { amount: formatAsCurrency(transaction.amount), date: moment(transaction.pausedUntil).format('DD/MM/YY') })
                    : formatAsCurrency(transaction.amount);
                new Setting(futureContainer).setName(name).setDesc(desc);
            });
        } else {
            futureContainer.createEl('p', { text: t('MODAL_ACCOUNT_DETAIL_NO_FUTURE_PAYMENTS'), cls: 'mod-subtle' });
        }

        contentEl.createEl('h3', { text: t('MODAL_ACCOUNT_DETAIL_PAYMENT_HISTORY') });
        const historyContainer = contentEl.createDiv({ cls: 'payment-list-container' });
        const paid = groupTransactions.filter((transaction: Transaction) => transaction.status === 'paid').sort((a: Transaction, b: Transaction) => moment(b.date).diff(moment(a.date)));
        if (paid.length > 0) {
            paid.forEach((transaction: Transaction) => new Setting(historyContainer).setName(moment(transaction.date).format('DD/MM/YYYY')).setDesc(formatAsCurrency(transaction.amount)));
        } else {
            historyContainer.createEl('p', { text: t('MODAL_ACCOUNT_DETAIL_NO_PAYMENT_HISTORY'), cls: 'mod-subtle' });
        }
    }
}

export class EditAccountModal extends Modal {
    plugin: MoneyManagerPlugin;
    groupKey: string;
    isInstallment: boolean;
    onSave: () => void;

    private newDescription: string;
    private newCategory: string;

    constructor(app: App, plugin: MoneyManagerPlugin, groupKey: string, isInstallment: boolean, onSave: () => void) {
        super(app);
        this.plugin = plugin;
        this.groupKey = groupKey;
        this.isInstallment = isInstallment;
        this.onSave = onSave;

        const firstTransaction = this.isInstallment
            ? this.plugin.settings.transactions.find((transaction: Transaction) => transaction.installmentOf === this.groupKey)
            : this.plugin.settings.transactions.find((transaction: Transaction) => transaction.description === this.groupKey && transaction.isRecurring);

        if (firstTransaction) {
            this.newDescription = this.isInstallment
                ? firstTransaction.description.substring(0, firstTransaction.description.lastIndexOf('(')).trim()
                : firstTransaction.description;
            this.newCategory = firstTransaction.category;
        } else {
            this.newDescription = "";
            this.newCategory = "";
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_EDIT_ACCOUNT_TITLE', { groupName: this.newDescription }) });

        new Setting(contentEl)
            .setName(t('MODAL_EDIT_ACCOUNT_GROUP_NAME'))
            .addText(text => text
                .setValue(this.newDescription)
                .setDisabled(true)); // Disabling name change for now to avoid complexity

        renderCategoryDropdown(contentEl, this.plugin, () => this.newCategory, (val) => this.newCategory = val);

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t('MODAL_SAVE_BUTTON'))
                .setCta()
                .onClick(async () => {
                    // Update category for all future transactions in the group
                    this.plugin.settings.transactions.forEach((transaction: Transaction) => {
                        const isMatch = this.isInstallment ? transaction.installmentOf === this.groupKey : (transaction.description === this.groupKey && transaction.isRecurring);
                        if (isMatch && transaction.status === 'pending') {
                            transaction.category = this.newCategory;
                        }
                    });

                    await this.plugin.saveSettings();
                    eventManager.emit('data-changed');
                    this.onSave();
                    this.close();
                }));
    }
}

export class PauseRecurringModal extends Modal {
    plugin: MoneyManagerPlugin;
    groupKey: string;
    onSave: () => void;
    private pauseUntilDate: string = moment().add(1, 'month').format('YYYY-MM-DD');

    constructor(app: App, plugin: MoneyManagerPlugin, groupKey: string, onSave: () => void) {
        super(app);
        this.plugin = plugin;
        this.groupKey = groupKey;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_PAUSE_RECURRING_TITLE', { groupName: this.groupKey }) });
        contentEl.createEl('p', { text: t('MODAL_PAUSE_RECURRING_DESC') });

        new Setting(contentEl)
            .setName(t('MODAL_PAUSE_RECURRING_DATE_LABEL'))
            .addText(text => {
                text.inputEl.type = 'date';
                text.setValue(this.pauseUntilDate).onChange(val => this.pauseUntilDate = val);
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t('MODAL_PAUSE_RECURRING_SAVE_BUTTON'))
                .setCta()
                .onClick(() => this.savePause()))
            .addButton(btn => btn
                .setButtonText(t('MODAL_PAUSE_RECURRING_REMOVE_BUTTON'))
                .setClass('mod-warning')
                .onClick(() => this.removePause()));
    }

    private async savePause() {
        if (!this.pauseUntilDate) {
            new Notice(t('MODAL_PAUSE_RECURRING_DATE_REQUIRED_NOTICE'));
            return;
        }

        this.plugin.settings.transactions.forEach(transaction => {
            if (transaction.description === this.groupKey && transaction.isRecurring && transaction.status === 'pending') {
                transaction.pausedUntil = this.pauseUntilDate;
            }
        });

        await this.plugin.saveSettings();
        eventManager.emit('data-changed');
        new Notice(t('MODAL_PAUSE_RECURRING_SUCCESS_NOTICE', { date: moment(this.pauseUntilDate).format('DD/MM/YYYY') }));
        this.onSave();
        this.close();
    }

    private async removePause() {
        this.plugin.settings.transactions.forEach(transaction => {
            if (transaction.description === this.groupKey && transaction.isRecurring) {
                delete transaction.pausedUntil;
            }
        });

        await this.plugin.saveSettings();
        eventManager.emit('data-changed');
        new Notice(t('MODAL_PAUSE_RECURRING_REMOVED_NOTICE'));
        this.onSave();
        this.close();
    }
}