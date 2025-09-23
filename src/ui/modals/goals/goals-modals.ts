import { Modal, Setting, Notice, App } from 'obsidian';
import { t } from '../../../i18n/lang';
import { Goal } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { ConfirmationModal } from '../../../utils/ui-helpers';

export class GoalsModal extends Modal {
    plugin: MoneyManagerPlugin;
    filter: 'All' | 'Saving' | 'Debt';

    constructor(app: App, plugin: MoneyManagerPlugin, filter: 'All' | 'Saving' | 'Debt') {
        super(app);
        this.plugin = plugin;
        this.filter = filter;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_GOALS_TITLE') });

        const goalTypeDisplayText = this.filter === 'Saving' ? t('GOAL_TYPE_SAVING') : (this.filter === 'Debt' ? t('GOAL_TYPE_DEBT') : undefined);
        const emptyText = goalTypeDisplayText ? t('MODAL_GOALS_EMPTY_FILTERED', { goalType: goalTypeDisplayText }) : t('MODAL_GOALS_EMPTY_ALL');
        const createButtonText = this.filter === 'Debt' ? t('MODAL_GOALS_CREATE_DEBT_GROUP') : t('MODAL_GOALS_CREATE_NEW');

        const goalsToDisplay = this.filter !== 'All'
            ? this.plugin.settings.goals.filter(g => g.goalType === this.filter)
            : this.plugin.settings.goals;

        const goalsListContainer = contentEl.createDiv({ cls: 'goals-list-container' });

        if (goalsToDisplay.length === 0) {
            goalsListContainer.createEl('p', { text: emptyText });
        } else {
            goalsToDisplay.forEach(goal => {
                const goalCard = goalsListContainer.createDiv({ cls: 'goal-card' });
                goalCard.createEl('h3', { text: goal.name });

                const target = goal.targetAmount || 1;
                const current = goal.currentAmount || 0;
                goalCard.createEl('progress', { attr: { max: target, value: current } });
                const percentage = target > 0 ? ((current / target) * 100).toFixed(1) : 0;
                const progressText = `${formatAsCurrency(current)} ${t('MODAL_GOALS_PROGRESS_OF')} ${formatAsCurrency(target)} (${percentage}%)`;
                goalCard.createEl('p', { text: progressText, cls: 'progress-text' });

                // Apenas metas de 'Economizar Dinheiro' podem ter contribuições manuais
                if (goal.goalType === 'Saving') {
                    const contributionContainer = goalCard.createDiv({ cls: 'contribution-container' });
                    const amountInput = contributionContainer.createEl('input', { type: 'number', placeholder: t('MODAL_GOALS_CONTRIBUTION_VALUE') });
                    const contributeButton = contributionContainer.createEl('button', { text: t('MODAL_GOALS_CONTRIBUTE_BUTTON') });

                    contributeButton.addEventListener('click', async () => {
                        const amountValue = parseFloat(amountInput.value);
                        if (!isNaN(amountValue) && amountValue > 0) {
                            goal.currentAmount += amountValue;

                            // Log the contribution to the goal's history
                            if (!goal.history) {
                                goal.history = [];
                            }
                            goal.history.push({
                                date: new Date().toISOString(),
                                amount: amountValue,
                                balanceAfter: goal.currentAmount
                            });

                            // Check for goal completion
                            if (!goal.completed && goal.currentAmount >= goal.targetAmount) {
                                goal.completed = true;
                                this.plugin.increaseNexusScore(50, t('NEXUS_SCORE_REASON_SAVING_GOAL_COMPLETED', { goalName: goal.name }));
                                new Notice(t('MODAL_GOALS_COMPLETED_NOTICE', { goalName: goal.name }));
                            }

                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                            this.onOpen(); // Re-render the modal
                        }
                    });
                }

                const actionsContainer = goalCard.createDiv({ cls: 'goal-actions-container' });
                const editButton = actionsContainer.createEl('button', { text: t('MODAL_EDIT_BUTTON') });
                editButton.addEventListener('click', () => {
                    new CreateEditGoalModal(this.app, this.plugin, () => this.onOpen(), goal).open();
                    this.close();
                });

                const deleteButton = actionsContainer.createEl('button', { text: t('MODAL_DELETE_BUTTON'), cls: 'mod-warning' });
                deleteButton.addEventListener('click', async () => {
                    new ConfirmationModal(
                        this.app,
                        t('MODAL_GOALS_DELETE_TITLE'),
                        t('MODAL_GOALS_DELETE_CONFIRM', { goalName: goal.name }),
                        async () => {
                            this.plugin.settings.goals = this.plugin.settings.goals.filter(g => g.id !== goal.id);
                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                            this.onOpen(); // Recarrega o GoalsModal
                        }
                    ).open();
                });
            });
        }

        const isDebtPanel = this.filter === 'Debt';
        const goalTypeToCreate = isDebtPanel ? 'Debt' : (this.filter === 'Saving' ? 'Saving' : undefined);

        if (goalsToDisplay.length > 0) contentEl.createEl('hr');
        new Setting(contentEl).addButton(btn => btn
            .setButtonText(createButtonText)
            .setCta()
            .onClick(() => {
                // Pass the specific type to the creation modal if we are in a filtered view
                new CreateEditGoalModal(this.app, this.plugin, () => this.onOpen(), undefined, goalTypeToCreate).open();
                this.close();
            }));
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class CreateEditGoalModal extends Modal {
    plugin: MoneyManagerPlugin;
    onSubmit: () => void;
    goal?: Goal;

    // Form state
    private goalName: string = '';
    private goalType: 'Saving' | 'Debt' = 'Saving';
    private totalValue: number = 0;
    private targetDate: string = '';
    private step: 1 | 2 | 3 = 1;
    private selectedAccountIds: Set<string> = new Set();
    private initialGoalType: 'Saving' | 'Debt' | undefined;

    constructor(app: App, plugin: MoneyManagerPlugin, onSubmit: () => void, goal?: Goal, initialGoalType?: 'Saving' | 'Debt') {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
        this.goal = goal;
        this.initialGoalType = initialGoalType;

        if (this.goal) {
            this.goalName = this.goal.name;
            this.goalType = this.goal.goalType; // Now it's 'Saving' or 'Debt'
            this.totalValue = this.goal.targetAmount;
            this.targetDate = this.goal.targetDate || "";
            this.selectedAccountIds = new Set(this.goal.linkedAccountIds);
        }
    }

    onOpen() {
        this.renderStep();
    }

    private renderStep() {
        const { contentEl } = this;
        contentEl.empty();
        const isEditing = !!this.goal;

        if (isEditing) {
            contentEl.createEl('h2', { text: t('MODAL_CREATE_EDIT_GOAL_EDIT_TITLE', { goalName: this.goalName }) });
            this.renderForm();
        } else {
            // If an initial type is provided (e.g., from a specific button), skip the choice step.
            if (this.initialGoalType) {
                this.goalType = this.initialGoalType;
                this.step = 2;
            }

            switch (this.step) {
                case 1: this.renderTypeChoice(); break;
                case 2: this.renderForm(); break;
            }
        }
    }

    private renderTypeChoice() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: t('MODAL_CREATE_EDIT_GOAL_NEW_TITLE') });

        const choiceContainer = contentEl.createDiv({ cls: 'goal-type-choice-container' });

        const savingCard = choiceContainer.createDiv({ cls: 'goal-type-card' });
        savingCard.createEl('h3', { text: t('MODAL_CREATE_EDIT_GOAL_TYPE_SAVING_TITLE') });
        savingCard.createEl('p', { text: t('MODAL_CREATE_EDIT_GOAL_TYPE_SAVING_DESC') });
        savingCard.addEventListener('click', () => {
            this.goalType = 'Saving';
            this.step = 2;
            this.renderStep();
        });

        const debtCard = choiceContainer.createDiv({ cls: 'goal-type-card' });
        debtCard.createEl('h3', { text: t('MODAL_CREATE_EDIT_GOAL_TYPE_DEBT_TITLE') });
        debtCard.createEl('p', { text: t('MODAL_CREATE_EDIT_GOAL_TYPE_DEBT_DESC') });
        debtCard.addEventListener('click', () => {
            this.goalType = 'Debt';
            this.step = 2;
            this.renderStep();
        });
    }

    private renderForm() {
        const { contentEl } = this;
        const isEditing = !!this.goal;

        new Setting(contentEl)
            .setName(t('MODAL_CREATE_EDIT_GOAL_NAME'))
            .addText(text => text
                .setPlaceholder(t('MODAL_CREATE_EDIT_GOAL_NAME_PLACEHOLDER'))
                .setValue(this.goalName)
                .onChange(val => this.goalName = val));

        if (this.goalType === 'Saving') {
            new Setting(contentEl)
                .setName(t('MODAL_CREATE_EDIT_GOAL_TARGET_AMOUNT'))
                .addText(text => {
                    text.inputEl.type = 'number';
                    text.setValue(String(this.totalValue))
                        .onChange(val => this.totalValue = parseFloat(val) || 0);
                });

            new Setting(contentEl)
                .setName(t('MODAL_CREATE_EDIT_GOAL_TARGET_DATE'))
                .addText(text => {
                    text.inputEl.type = 'date';
                    text.setValue(this.targetDate)
                        .onChange(val => this.targetDate = val);
                });
        } else if (this.goalType === 'Debt') {
            contentEl.createEl('h3', { text: t('MODAL_CREATE_EDIT_GOAL_GROUP_DEBTS_TITLE') });
            contentEl.createEl('p', { text: t('MODAL_CREATE_EDIT_GOAL_GROUP_DEBTS_DESC') });

            const accountsContainer = contentEl.createDiv({ cls: 'goal-accounts-list' });

            const installmentGroups = this.plugin.settings.transactions
                .filter(transaction => transaction.isInstallment && transaction.installmentOf)
                .reduce((acc, t) => {
                    if (!acc.has(t.installmentOf!)) {
                        const baseDescription = t.description.substring(0, t.description.lastIndexOf(' ('));
                        const totalAmount = t.amount * t.totalInstallments!;
                        acc.set(t.installmentOf!, { description: baseDescription, total: totalAmount });
                    }
                    return acc;
                }, new Map<string, { description: string, total: number }>());

            if (installmentGroups.size === 0) {
                accountsContainer.createEl('p', { text: t('MODAL_CREATE_EDIT_GOAL_NO_INSTALLMENTS_FOUND'), cls: 'mod-subtle' });
            } else {
                installmentGroups.forEach((group, id) => {
                    const itemEl = accountsContainer.createDiv({ cls: 'goal-account-item' });
                    const label = itemEl.createEl('label');
                    const checkbox = label.createEl('input', { type: 'checkbox' });
                    checkbox.checked = this.selectedAccountIds.has(id);
                    checkbox.onchange = () => {
                        if (checkbox.checked) {
                            this.selectedAccountIds.add(id);
                        } else {
                            this.selectedAccountIds.delete(id);
                        }
                    };
                    label.appendText(` ${group.description} `);
                    label.createEl('span', { text: `(${formatAsCurrency(group.total)})`, cls: 'mod-subtle' });
                });
            }
        }

        const buttonText = isEditing
            ? t('MODAL_CREATE_EDIT_GOAL_SAVE_CHANGES_BUTTON')
            : (this.goalType === 'Debt' ? t('MODAL_CREATE_EDIT_GOAL_CREATE_DEBT_BUTTON') : t('MODAL_CREATE_EDIT_GOAL_CREATE_SAVING_BUTTON'));
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(buttonText)
                .setCta()
                .onClick(() => this.saveGoal()));
    }

    private async saveGoal() {
        if (!this.goalName) {
            new Notice(t('MODAL_CREATE_EDIT_GOAL_INCOMPLETE_NOTICE'));
            return;
        }

        let calculatedTarget = this.totalValue;
        let calculatedCurrent = 0;

        if (this.goalType === 'Debt') {
            // For debt goals, the target and current amounts are calculated from linked accounts
            calculatedTarget = 0;
            calculatedCurrent = 0;
            this.selectedAccountIds.forEach(accountId => {
                const relatedInstallments = this.plugin.settings.transactions.filter(tx => tx.installmentOf === accountId);
                if (relatedInstallments.length > 0) {
                    const installmentAmount = relatedInstallments[0].amount;
                    const totalInstallments = relatedInstallments[0].totalInstallments!;
                    calculatedTarget += installmentAmount * totalInstallments;
                    const paidCount = relatedInstallments.filter(tx => tx.status === 'paid').length;
                    calculatedCurrent += paidCount * installmentAmount;
                }
            });
        }

        if (this.goal) { // Editing existing goal
            const goalToUpdate = this.plugin.settings.goals.find(g => g.id === this.goal!.id);
            if (goalToUpdate) {
                goalToUpdate.name = this.goalName;
                if (goalToUpdate.goalType === 'Saving') {
                    goalToUpdate.targetAmount = this.totalValue;
                    goalToUpdate.targetDate = this.targetDate;
                }
                if (goalToUpdate.goalType === 'Debt') {
                    goalToUpdate.linkedAccountIds = Array.from(this.selectedAccountIds);
                    goalToUpdate.targetAmount = calculatedTarget;
                    goalToUpdate.currentAmount = calculatedCurrent;
                }
            }
        } else { // Creating new goal
            const newGoal: Goal = {
                id: `goal_${Date.now()}`,
                name: this.goalName,
                goalType: this.goalType,
                targetAmount: calculatedTarget,
                currentAmount: calculatedCurrent,
                targetDate: this.goalType === 'Saving' ? this.targetDate : undefined,
                linkedAccountIds: Array.from(this.selectedAccountIds),
                completed: false,
            };
            this.plugin.settings.goals.push(newGoal);
        }

        await this.plugin.saveSettings();
        eventManager.emit('data-changed');
        this.onSubmit();
        this.close();
    }
}