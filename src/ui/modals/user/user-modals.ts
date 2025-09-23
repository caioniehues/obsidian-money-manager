import { Modal, Setting, Notice, App } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { setupCurrencyInput, ConfirmationModal } from '../../../utils/ui-helpers';

export class EditUserModal extends Modal {
    plugin: MoneyManagerPlugin;
    private userName: string;
    private monthlyIncome: number;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app);
        this.plugin = plugin;
        this.userName = this.plugin.settings.userName;

        // Find the latest recurring income transaction to get the most recent salary value.
        const allRecurringIncomes = this.plugin.settings.transactions
            .filter(transaction => transaction.type === 'income' && transaction.isRecurring)
            .sort((a, b) => moment(b.date).diff(moment(a.date))); // Sort descending by date

        const lastKnownIncome = allRecurringIncomes.length > 0 ? allRecurringIncomes[0] : undefined;
        this.monthlyIncome = lastKnownIncome ? lastKnownIncome.amount : 0;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_EDIT_PROFILE_TITLE') });

        new Setting(contentEl)
            .setName(t('MODAL_EDIT_PROFILE_NAME'))
            .addText(text => text
                .setValue(this.userName)
                .onChange(value => this.userName = value));

        new Setting(contentEl)
            .setName(t('MODAL_EDIT_PROFILE_INCOME'))
            .addText(text => {
                text.setPlaceholder(formatAsCurrency(5000));
                setupCurrencyInput(text, val => this.monthlyIncome = val, this.monthlyIncome);
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t('MODAL_SAVE_BUTTON'))
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.userName = this.userName.trim();

                    const pendingIncomeTransactions = this.plugin.settings.transactions.filter(transaction =>
                        transaction.type === 'income' && transaction.isRecurring && transaction.status === 'pending'
                    );

                    if (pendingIncomeTransactions.length > 0) {
                        // Update all future recurring income transactions
                        pendingIncomeTransactions.forEach(transaction => {
                            transaction.amount = this.monthlyIncome;
                        });
                    } else {
                        this.createRecurringIncome();
                    }

                    await this.plugin.saveSettings();

                    eventManager.emit('data-changed');
                    this.close();
                }));
    }

    private createRecurringIncome() {
        const newTransactions: Transaction[] = [];
        const incomeDay = 5; // Dia padrão para o recebimento da renda
        let startDate = moment().startOf('month');
        const finalDate = moment().add(5, 'years');

        // Se o dia do pagamento no mês atual já passou, começa a criar a partir do próximo mês.
        if (moment().date() > incomeDay) {
            startDate.add(1, 'month');
        }

        let currentDate = startDate.clone();

        while (currentDate.isBefore(finalDate)) {
            const transactionDate = currentDate.clone().date(incomeDay);


            const transaction: Transaction = {
                id: `txn_income_${currentDate.format('YYYY-MM')}`,
                description: t('TRANSACTION_MONTHLY_INCOME'),
                amount: this.monthlyIncome,
                date: transactionDate.format('YYYY-MM-DD'),
                category: t('CATEGORY_SALARY'),
                type: 'income',
                status: 'pending',
                isRecurring: true,
                recurrenceRule: 'monthly',
                isInstallment: false,
            };
            newTransactions.push(transaction);
            currentDate.add(1, 'month');
        }
        this.plugin.settings.transactions.push(...newTransactions);
    }
}

export class ExtraIncomeModal extends Modal {
    plugin: MoneyManagerPlugin;
    currentMonth: moment.Moment;

    constructor(app: App, plugin: MoneyManagerPlugin, currentMonth: moment.Moment) {
        super(app);
        this.plugin = plugin;
        this.currentMonth = currentMonth;
    }

    onOpen() {
        this.render();
    }

    render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_EXTRA_INCOME_TITLE') });
        contentEl.createEl('p', { text: t('MODAL_EXTRA_INCOME_DESC', { monthYear: this.currentMonth.format('MMMM YYYY') }), cls: 'mod-subtle' });

        // --- List existing extra incomes ---
        const extraIncomes = this.plugin.settings.transactions.filter(transaction =>
            transaction.type === 'income' &&
            !transaction.isRecurring &&
            moment(transaction.date).isSame(this.currentMonth, 'month')
        );

        const listContainer = contentEl.createDiv();
        if (extraIncomes.length > 0) {
            extraIncomes.forEach(income => {
                new Setting(listContainer)
                    .setName(income.description)
                    .setDesc(formatAsCurrency(income.amount))
                    .addButton(btn => btn
                        .setIcon('trash')
                        .setTooltip(t('MODAL_EXTRA_INCOME_DELETE_TOOLTIP'))
                        .setClass('mod-warning')
                        .onClick(async () => {
                            new ConfirmationModal(
                                this.app,
                                t('MODAL_EXTRA_INCOME_DELETE_TITLE'),
                                t('MODAL_EXTRA_INCOME_DELETE_CONFIRM', { incomeName: income.description }),
                                async () => {
                                    this.plugin.settings.transactions = this.plugin.settings.transactions.filter(tx => tx.id !== income.id);
                                    await this.plugin.saveSettings();
                                    eventManager.emit('data-changed');
                                    this.render(); // Re-render the modal
                                }
                            ).open();
                        }));
            });
        } else {
            listContainer.createEl('p', { text: t('MODAL_EXTRA_INCOME_EMPTY'), cls: 'mod-subtle' });
        }

        contentEl.createEl('hr');

        // --- Form to add new extra income ---
        contentEl.createEl('h3', { text: t('MODAL_EXTRA_INCOME_ADD_NEW_TITLE') });
        let description = '';
        let amount = 0;
        let date = this.currentMonth.clone().startOf('month').format('YYYY-MM-DD');

        new Setting(contentEl).setName(t('MODAL_EXTRA_INCOME_DESCRIPTION')).addText(text => text.setPlaceholder(t('MODAL_EXTRA_INCOME_DESCRIPTION_PLACEHOLDER')).onChange(val => description = val.trim()));
        new Setting(contentEl).setName(t('MODAL_EXTRA_INCOME_VALUE')).addText(text => setupCurrencyInput(text, val => amount = val));
        new Setting(contentEl).setName(t('MODAL_EXTRA_INCOME_DATE')).addText(text => {
            text.inputEl.type = 'date';
            text.setValue(date).onChange(val => date = val);
        });

        new Setting(contentEl).addButton(btn => btn
            .setButtonText(t('MODAL_EXTRA_INCOME_ADD_BUTTON'))
            .setCta()
            .onClick(async () => {
                if (!description || amount <= 0) {
                    new Notice(t('MODAL_EXTRA_INCOME_REQUIRED_FIELDS_NOTICE'));
                    return;
                }
                const newIncome: Transaction = {
                    id: `txn_extra_${Date.now()}`, description, amount, date,
                    category: t('CATEGORY_EXTRA_INCOME'), type: 'income', status: 'pending',
                    isRecurring: false, isInstallment: false,
                };
                this.plugin.settings.transactions.push(newIncome);
                await this.plugin.saveSettings();
                eventManager.emit('data-changed');
                this.render(); // Re-render to show the new item
            }));
    }

    onClose() {
        this.contentEl.empty();
    }
}