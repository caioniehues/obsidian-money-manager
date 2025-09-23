import { Modal, Setting, Notice, App, TextComponent } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency, suggestCategory } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { setupCurrencyInput, renderCategoryDropdown } from '../../../utils/ui-helpers';

export class AddTransactionModal extends Modal {
    plugin: MoneyManagerPlugin;
    onSubmit: () => void;

    // State properties
    private description: string = "";
    private amount: number = 0;
    private category: string = "";
    private isRecurring: boolean = false;

    // Single
    private date: string = moment().format("YYYY-MM-DD");

    // Recurring
    private dayOfMonthDue: number = 1;
    private hasEndDate: boolean = false;
    private endDate: string = ''; // YYYY-MM-DD

    constructor(app: App, plugin: MoneyManagerPlugin, onSubmit: () => void, transactionToDuplicate?: Transaction) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;

        if (transactionToDuplicate) {
            // Pre-fill state from the transaction to be duplicated
            this.description = transactionToDuplicate.description;
            this.amount = transactionToDuplicate.amount;
            this.category = transactionToDuplicate.category;
            this.isRecurring = transactionToDuplicate.isRecurring;
            // Default the date to today for convenience, a common use case for duplication
            this.date = moment().format("YYYY-MM-DD");
        } else {
            // Default state for a new transaction
            if (this.plugin.settings.categories.length > 0) {
                this.category = this.plugin.settings.categories[0].name;
            }
        }
    }

    onOpen() {
        this.render();
    }

    onClose() {
        this.contentEl.empty();
    }

    private handleDescriptionChange(description: string) {
        this.description = description;
        // A query é um pouco frágil, mas funciona para a estrutura atual do modal.
        const categoryDropdown = this.contentEl.querySelector('.setting-item-control select') as HTMLSelectElement;
        if (!categoryDropdown) return;

        const suggestedCategory = suggestCategory(description, this.plugin.settings.categories);
        if (suggestedCategory && suggestedCategory !== categoryDropdown.value) {
            const optionExists = Array.from(categoryDropdown.options).some(opt => opt.value === suggestedCategory);
            if (optionExists) {
                this.category = suggestedCategory;
                categoryDropdown.value = suggestedCategory;
                new Notice(`Categoria sugerida: ${suggestedCategory}`, 2000);
            }
        }
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: t('MODAL_ADD_TRANSACTION_TITLE') });

        // Main Toggle
        const recurringOptionsContainer = contentEl.createDiv();
        const singleOptionsContainer = contentEl.createDiv();

        new Setting(contentEl)
            .setName(t('MODAL_ADD_TRANSACTION_IS_RECURRING'))
            .addToggle(toggle => toggle
                .setValue(this.isRecurring)
                .onChange(value => {
                    this.isRecurring = value;
                    recurringOptionsContainer.toggleClass('is-hidden', !value);
                    singleOptionsContainer.toggleClass('is-hidden', value);
                }));

        // Container for single transaction options
        singleOptionsContainer.toggleClass('is-hidden', this.isRecurring);
        this.renderSingleTransactionOptions(singleOptionsContainer);

        // Container for recurring/installment options
        recurringOptionsContainer.toggleClass('is-hidden', !this.isRecurring);
        this.renderRecurringSubOptions(recurringOptionsContainer);

        // Common Fields (that are truly common)
        new Setting(contentEl)
            .setName(t('MODAL_ADD_TRANSACTION_VALUE'))
            .addText(text => {
                setupCurrencyInput(text, val => this.amount = val, this.amount);
            });

        renderCategoryDropdown(contentEl, this.plugin, () => this.category, (val) => this.category = val);

        // Save button
        new Setting(contentEl)
            .addButton(btn => btn.setButtonText(t('MODAL_SAVE_BUTTON')).setCta().onClick(() => this.saveTransaction()));
    }

    private renderSingleTransactionOptions(container: HTMLElement) {
        container.empty();

        // Dropdown for description as requested for "Variable Expense"
        const nameSetting = new Setting(container).setName(t('MODAL_ADD_TRANSACTION_DESCRIPTION'));
        const otherNameInput = new Setting(container).setName(t('MODAL_ADD_TRANSACTION_OTHER_DESCRIPTION')).addText(text => text.setValue(this.description).onChange(val => this.description = val));

        nameSetting.addDropdown(dd => {
            const standardOptions = [t('MODAL_ADD_TRANSACTION_STANDARD_OPTION_LIGHT'), t('MODAL_ADD_TRANSACTION_STANDARD_OPTION_WATER'), t('MODAL_ADD_TRANSACTION_STANDARD_OPTION_GAS'), t('MODAL_ADD_TRANSACTION_STANDARD_OPTION_INTERNET')];
            standardOptions.forEach(opt => dd.addOption(opt, opt));
            dd.addOption('__OTHER__', t('MODAL_ADD_TRANSACTION_OTHER_OPTION'));

            // Pre-select based on duplicated transaction or default
            const isStandard = standardOptions.includes(this.description);
            if (this.description && !isStandard) {
                dd.setValue('__OTHER__');
                otherNameInput.settingEl.removeClass('is-hidden');
            } else {
                dd.setValue(this.description || t('MODAL_ADD_TRANSACTION_STANDARD_OPTION_LIGHT'));
                otherNameInput.settingEl.addClass('is-hidden');
                if (!this.description) this.handleDescriptionChange(t('MODAL_ADD_TRANSACTION_STANDARD_OPTION_LIGHT')); // Set initial value and try to categorize
            }

            dd.onChange(val => {
                if (val !== '__OTHER__') {
                    this.handleDescriptionChange(val);
                    otherNameInput.settingEl.addClass('is-hidden');
                } else {
                    this.description = '';
                    otherNameInput.settingEl.removeClass('is-hidden');
                    (otherNameInput.components[0] as TextComponent).inputEl.focus();
                }
            });
        });

        (otherNameInput.components[0] as TextComponent).inputEl.addEventListener('blur', () => {
            this.handleDescriptionChange((otherNameInput.components[0] as TextComponent).getValue());
        });

        // Date picker
        new Setting(container)
            .setName(t('MODAL_ADD_TRANSACTION_DUE_DATE'))
            .addText(text => {
                text.inputEl.type = 'date';
                text.setValue(this.date).onChange(value => this.date = value);
            });
    }

    private renderRecurringSubOptions(container: HTMLElement) {
        container.empty();
        new Setting(container).setName(t('MODAL_ADD_TRANSACTION_DESCRIPTION')).addText(text => {
            text.setPlaceholder(t('MODAL_ADD_TRANSACTION_RECURRING_DESC_PLACEHOLDER'))
                .onChange(value => this.description = value);

            text.inputEl.addEventListener('blur', () => this.handleDescriptionChange(text.getValue()));
        });

        new Setting(container).setName(t('MODAL_ADD_TRANSACTION_RECURRING_DUE_DAY')).addText(text => {
            text.inputEl.type = 'number';
            text.inputEl.min = '1';
            text.inputEl.max = '31';
            text.setValue(String(this.dayOfMonthDue));
            text.onChange(val => this.dayOfMonthDue = parseInt(val) || 1);
        });

        const endDateSetting = new Setting(container).setName(t('MODAL_ADD_TRANSACTION_RECURRING_END_DATE')).addText(text => {
            text.inputEl.type = 'date'; // YYYY-MM-DD
            text.onChange(val => this.endDate = val);
        });
        endDateSetting.settingEl.toggleClass('is-hidden', !this.hasEndDate);

        new Setting(container).setName(t('MODAL_ADD_TRANSACTION_RECURRING_HAS_END_DATE')).addToggle(toggle => toggle
            .setValue(this.hasEndDate)
            .onChange(val => {
                this.hasEndDate = val;
                endDateSetting.settingEl.toggleClass('is-hidden', !val);
            }));
    }

    private async saveTransaction() {
        if (!this.description || this.amount <= 0) {
            new Notice(t('MODAL_ADD_TRANSACTION_REQUIRED_FIELDS_NOTICE'));
            return;
        }

        const newTransactions: Transaction[] = [];

        if (!this.isRecurring) { // Single Transaction
            const transaction: Transaction = {
                id: `txn_${Date.now()}`,
                description: this.description,
                amount: this.amount,
                date: this.date,
                category: this.category,
                type: 'expense',
                status: 'pending',
                isRecurring: false,
                isInstallment: false,
            };
            newTransactions.push(transaction);
        } else { // Recurring Transaction
            const startDate = moment().startOf('month');
            const finalDate = this.hasEndDate && this.endDate ? moment(this.endDate) : moment().add(5, 'years');
            let currentDate = startDate.clone();

            while (currentDate.isBefore(finalDate) || currentDate.isSame(finalDate, 'month')) {
                const transactionDate = currentDate.clone().date(this.dayOfMonthDue);
                // Evita criar transações no passado se a data de início for a atual
                if (transactionDate.isBefore(moment(), 'day') && currentDate.isSame(moment(), 'month')) {
                    currentDate.add(1, 'month');
                    continue;
                }

                const transaction: Transaction = {
                    id: `txn_${Date.now()}_${currentDate.format('YYYY-MM')}`,
                    description: this.description,
                    amount: this.amount,
                    date: transactionDate.format('YYYY-MM-DD'),
                    category: this.category,
                    type: 'expense',
                    status: 'pending',
                    isRecurring: true,
                    recurrenceRule: 'monthly',
                    endDate: this.hasEndDate ? this.endDate : undefined,
                    isInstallment: false,
                };
                newTransactions.push(transaction);
                currentDate.add(1, 'month');
            }
        }

        this.plugin.settings.transactions.push(...newTransactions);
        await this.plugin.saveSettings();
        eventManager.emit('data-changed');
        new Notice(t('MODAL_ADD_TRANSACTION_SUCCESS_NOTICE'));
        this.onSubmit();
        this.close();
    }
}

export class ManageBudgetsModal extends Modal {
    plugin: MoneyManagerPlugin;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_MANAGE_BUDGETS_TITLE') });

        // --- Seção 1: Orçamentos Existentes ---
        contentEl.createEl('h3', { text: t('MODAL_MANAGE_BUDGETS_EXISTING_HEADER') });
        const existingBudgetsContainer = contentEl.createDiv();
        const existingBudgets = this.plugin.settings.budgets;

        if (existingBudgets.length === 0) {
            existingBudgetsContainer.createEl('p', { text: t('MODAL_MANAGE_BUDGETS_NO_BUDGETS'), cls: 'mod-subtle' });
        } else {
            existingBudgets.forEach(budget => {
                const category = this.plugin.settings.categories.find(c => c.id === budget.categoryId);
                if (!category) return;

                new Setting(existingBudgetsContainer)
                    .setName(category.name)
                    .addText(text => {
                        setupCurrencyInput(text, (newValue) => {
                            budget.amount = newValue;
                        }, budget.amount);
                        text.inputEl.addEventListener('blur', async () => {
                            if (budget.amount > 0) {
                                await this.plugin.saveSettings();
                                eventManager.emit('data-changed');
                            } else {
                                this.plugin.settings.budgets = this.plugin.settings.budgets.filter(b => b.categoryId !== budget.categoryId);
                                await this.plugin.saveSettings();
                                eventManager.emit('data-changed');
                                this.onOpen(); // Re-render
                            }
                        });
                    })
                    .addButton(btn => {
                        btn.setIcon('trash')
                            .setTooltip(t('MODAL_MANAGE_BUDGETS_DELETE_TOOLTIP'))
                            .setClass('mod-warning')
                            .onClick(async () => {
                                this.plugin.settings.budgets = this.plugin.settings.budgets.filter(b => b.categoryId !== budget.categoryId);
                                await this.plugin.saveSettings();
                                eventManager.emit('data-changed');
                                this.onOpen(); // Re-render
                            });
                    });
            });
        }

        contentEl.createEl('hr');

        // --- Seção 2: Adicionar Novo Orçamento ---
        contentEl.createEl('h3', { text: t('MODAL_MANAGE_BUDGETS_ADD_NEW_HEADER') });
        const addBudgetContainer = contentEl.createDiv();

        const budgetedCategoryIds = new Set(existingBudgets.map(b => b.categoryId));
        const availableCategories = this.plugin.settings.categories.filter(c =>
            !budgetedCategoryIds.has(c.id) &&
            c.name !== t('CATEGORY_SALARY') &&
            c.name !== t('CATEGORY_EXTRA_INCOME')
        );

        if (availableCategories.length === 0) {
            addBudgetContainer.createEl('p', { text: t('MODAL_MANAGE_BUDGETS_NO_MORE_CATEGORIES'), cls: 'mod-subtle' });
            return;
        }

        let newBudgetCategoryId = availableCategories[0].id;
        let newBudgetAmount = 0;

        new Setting(addBudgetContainer)
            .addDropdown(dd => {
                availableCategories.forEach(cat => dd.addOption(cat.id, cat.name));
                dd.onChange(val => newBudgetCategoryId = val);
            })
            .addText(text => {
                text.setPlaceholder(t('MODAL_MANAGE_BUDGETS_AMOUNT_PLACEHOLDER'));
                setupCurrencyInput(text, val => newBudgetAmount = val);
            })
            .addButton(btn => {
                btn.setButtonText(t('MODAL_MANAGE_BUDGETS_ADD_BUTTON'))
                    .setCta()
                    .onClick(async () => {
                        if (newBudgetAmount > 0 && newBudgetCategoryId) {
                            this.plugin.settings.budgets.push({
                                categoryId: newBudgetCategoryId,
                                amount: newBudgetAmount
                            });
                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                            this.onOpen(); // Re-render o modal com o novo orçamento
                        }
                    });
            });
    }
}