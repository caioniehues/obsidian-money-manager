import { Modal, Setting, Notice, App } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { setupCurrencyInput } from '../../../utils/ui-helpers';

export class EmergencyFundModal extends Modal {
    plugin: MoneyManagerPlugin;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: t('MODAL_EMERGENCY_FUND_TITLE') });
        contentEl.createEl('p', { text: t('MODAL_EMERGENCY_FUND_DESC') });

        const balance = this.plugin.settings.emergencyFund.currentBalance;
        contentEl.createDiv({ text: t('MODAL_EMERGENCY_FUND_BALANCE', { balance: formatAsCurrency(balance) }), cls: 'emergency-fund-balance' });

        contentEl.createEl('hr');

        // --- Configuration Section ---
        contentEl.createEl('h3', { text: t('MODAL_EMERGENCY_FUND_CONFIG_TITLE') });

        let monthlyContribution = this.plugin.settings.emergencyFund.monthlyContribution;
        let isEnabled = this.plugin.settings.emergencyFund.isEnabled;

        new Setting(contentEl)
            .setName(t('MODAL_EMERGENCY_FUND_CONTRIBUTION_LABEL'))
            .setDesc(t('MODAL_EMERGENCY_FUND_CONTRIBUTION_DESC'))
            .addText(text => setupCurrencyInput(text, val => monthlyContribution = val, monthlyContribution || 100));

        new Setting(contentEl)
            .setName(t('MODAL_EMERGENCY_FUND_ENABLE_LABEL'))
            .addToggle(toggle => toggle
                .setValue(isEnabled)
                .onChange(value => {
                    isEnabled = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t('MODAL_EMERGENCY_FUND_SAVE_CONFIG_BUTTON'))
                .setCta()
                .onClick(async () => {
                    const wasEnabled = this.plugin.settings.emergencyFund.isEnabled;
                    this.plugin.settings.emergencyFund.monthlyContribution = monthlyContribution;
                    this.plugin.settings.emergencyFund.isEnabled = isEnabled;
                    await this.updateRecurringContributionTransaction(isEnabled, wasEnabled, monthlyContribution);
                    eventManager.emit('data-changed');
                    this.onOpen();
                }));

        contentEl.createEl('hr');

        // --- Transaction Section ---
        contentEl.createEl('h3', { text: t('MODAL_EMERGENCY_FUND_TRANSACTION_TITLE') });
        let transactionAmount = 0;

        new Setting(contentEl)
            .setName(t('MODAL_EMERGENCY_FUND_TRANSACTION_AMOUNT_LABEL'))
            .addText(text => {
                setupCurrencyInput(text, val => transactionAmount = val, 50);
            });

        const transactionActions = new Setting(contentEl);
        transactionActions.addButton(btn => btn
            .setButtonText(t('MODAL_EMERGENCY_FUND_DEPOSIT_BUTTON'))
            .onClick(async () => {
                if (transactionAmount > 0) {
                    this.plugin.settings.emergencyFund.currentBalance += transactionAmount;
                    this.plugin.settings.emergencyFund.history.push({
                        date: new Date().toISOString(),
                        type: 'deposit',
                        amount: transactionAmount,
                        balanceAfter: this.plugin.settings.emergencyFund.currentBalance
                    });
                    await this.plugin.saveSettings();
                    eventManager.emit('data-changed');
                    new Notice(t('MODAL_EMERGENCY_FUND_DEPOSIT_SUCCESS_NOTICE', { amount: formatAsCurrency(transactionAmount) }));
                    this.onOpen(); // Re-render modal
                } else {
                    new Notice(t('MODAL_EMERGENCY_FUND_INVALID_AMOUNT_NOTICE'));
                }
            }));

        transactionActions.addButton(btn => btn
            .setButtonText(t('MODAL_EMERGENCY_FUND_WITHDRAW_BUTTON'))
            .setClass('mod-warning')
            .onClick(async () => {
                if (transactionAmount > 0) {
                    if (this.plugin.settings.emergencyFund.currentBalance >= transactionAmount) {
                        // 1. Subtrai do saldo da reserva
                        this.plugin.settings.emergencyFund.currentBalance -= transactionAmount;
                        this.plugin.settings.emergencyFund.history.push({
                            date: new Date().toISOString(),
                            type: 'withdrawal',
                            amount: transactionAmount,
                            balanceAfter: this.plugin.settings.emergencyFund.currentBalance
                        });

                        // 2. Cria uma transação de renda para refletir no orçamento
                        const withdrawalTransaction: Transaction = {
                            id: `txn_ef_wd_${Date.now()}`,
                            description: t('TRANSACTION_EMERGENCY_FUND_WITHDRAWAL'),
                            amount: transactionAmount,
                            date: moment().format('YYYY-MM-DD'), // Data da retirada é hoje
                            category: t('CATEGORY_EXTRA_INCOME'),
                            type: 'income',
                            status: 'paid', // Dinheiro já recebido
                            isRecurring: false,
                            isInstallment: false,
                        };
                        this.plugin.settings.transactions.push(withdrawalTransaction);

                        await this.plugin.saveSettings();
                        eventManager.emit('data-changed');
                        new Notice(t('MODAL_EMERGENCY_FUND_WITHDRAW_SUCCESS_NOTICE', { amount: formatAsCurrency(transactionAmount) }));
                        this.onOpen(); // Re-render modal
                    } else {
                        new Notice(t('MODAL_EMERGENCY_FUND_INSUFFICIENT_FUNDS_NOTICE'));
                    }
                } else {
                    new Notice(t('MODAL_EMERGENCY_FUND_INVALID_AMOUNT_NOTICE'));
                }
            }));

        contentEl.createEl('hr');

        // --- History Section ---
        contentEl.createEl('h3', { text: t('MODAL_EMERGENCY_FUND_HISTORY_TITLE') });
        const historyContainer = contentEl.createDiv({ cls: 'emergency-fund-history' });

        const history = [...this.plugin.settings.emergencyFund.history].reverse(); // Show most recent first

        if (history.length === 0) {
            historyContainer.createEl('p', { text: t('MODAL_EMERGENCY_FUND_HISTORY_EMPTY'), cls: 'mod-subtle' });
        } else {
            history.forEach(item => {
                const itemEl = historyContainer.createDiv({ cls: 'history-item' });

                const mainInfo = itemEl.createDiv({ cls: 'history-main-info' });
                mainInfo.createDiv({ cls: 'history-date', text: moment(item.date).format('DD/MM/YY') });
                mainInfo.createDiv({ cls: `history-type ${item.type}`, text: item.type === 'deposit' ? t('MODAL_EMERGENCY_FUND_HISTORY_TYPE_DEPOSIT') : t('MODAL_EMERGENCY_FUND_HISTORY_TYPE_WITHDRAWAL') });
                mainInfo.createDiv({ cls: 'history-amount', text: formatAsCurrency(item.amount) });
                if (item.reason) {
                    itemEl.createDiv({ cls: 'history-reason', text: item.reason });
                }
            });
        }
    }

    private async updateRecurringContributionTransaction(isEnabled: boolean, wasEnabled: boolean, amount: number) {
        const description = t('TRANSACTION_EMERGENCY_FUND_CONTRIBUTION');

        // 1. Remove todas as transações futuras pendentes para a reserva de emergência para evitar duplicatas.
        this.plugin.settings.transactions = this.plugin.settings.transactions.filter(transaction =>
            !(transaction.description === description && transaction.isRecurring && transaction.status === 'pending' && moment(transaction.date).isSameOrAfter(moment(), 'day'))
        );

        // Se a configuração não mudou e o valor é o mesmo, não faz nada.
        if (isEnabled === wasEnabled && amount === this.plugin.settings.emergencyFund.monthlyContribution) {
            return;
        }

        // 2. Se estiver ativado e com um valor válido, cria as novas transações recorrentes.
        if (isEnabled && amount > 0) {
            const newTransactions: Transaction[] = [];
            const contributionDay = 15; // Dia padrão para a contribuição
            let startDate = moment().startOf('month');
            const finalDate = moment().add(5, 'years');

            // Se o dia da contribuição no mês atual já passou, começa a partir do próximo mês.
            if (moment().date() > contributionDay) {
                startDate.add(1, 'month');
            }

            let currentDate = startDate.clone();

            while (currentDate.isBefore(finalDate)) {
                const transactionDate = currentDate.clone().date(contributionDay);

                const transaction: Transaction = {
                    id: `txn_ef_${currentDate.format('YYYY-MM')}`,
                    description: description,
                    amount: amount,
                    date: transactionDate.format('YYYY-MM-DD'),
                    category: "Investimentos", // Usa a mesma categoria das metas
                    type: 'expense',
                    status: 'pending',
                    isRecurring: true,
                    recurrenceRule: 'monthly',
                    isInstallment: false,
                };
                newTransactions.push(transaction);
                currentDate.add(1, 'month');
            }
            this.plugin.settings.transactions.push(...newTransactions);
            await this.plugin.saveSettings();
            new Notice(t('MODAL_EMERGENCY_FUND_CONTRIBUTION_SCHEDULED_NOTICE', { amount: formatAsCurrency(amount) }));
        } else {
            await this.plugin.saveSettings();
            new Notice(t('MODAL_EMERGENCY_FUND_CONTRIBUTION_DISABLED_NOTICE'));
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}