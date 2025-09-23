import { Modal, Setting, Notice, App, setIcon } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { setupCurrencyInput } from '../../../utils/ui-helpers';
import { ALL_ACHIEVEMENTS } from '../../../core/achievements';

export class AchievementsModal extends Modal {
    plugin: MoneyManagerPlugin;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('MODAL_ACHIEVEMENTS_TITLE') });

        const achievementsContainer = contentEl.createDiv({ cls: 'achievements-container' });

        const userAchievements = new Map(this.plugin.settings.achievements.map(a => [a.id, a]));

        ALL_ACHIEVEMENTS.forEach(achievementTpl => {
            const userAchievement = userAchievements.get(achievementTpl.id);
            const isUnlocked = !!userAchievement;

            const card = achievementsContainer.createDiv({ cls: 'achievement-card' });
            card.toggleClass('is-unlocked', isUnlocked);

            const iconEl = card.createDiv({ cls: 'achievement-icon' });
            setIcon(iconEl, achievementTpl.icon);

            const infoEl = card.createDiv({ cls: 'achievement-info' });
            infoEl.createEl('h3', { text: achievementTpl.name });
            infoEl.createEl('p', { text: achievementTpl.description });

            if (isUnlocked) {
                infoEl.createEl('span', {
                    text: t('MODAL_ACHIEVEMENTS_UNLOCKED_ON', { date: moment(userAchievement.unlockedDate).format('DD/MM/YYYY') }),
                    cls: 'achievement-date'
                });
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class NexusScoreHistoryModal extends Modal {
    plugin: MoneyManagerPlugin;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: t('MODAL_NEXUS_SCORE_HISTORY_TITLE') });

        const currentScoreEl = contentEl.createDiv({ cls: 'nexus-score-current-display' });
        currentScoreEl.createSpan({ text: t('MODAL_NEXUS_SCORE_HISTORY_CURRENT_SCORE') });
        currentScoreEl.createSpan({ text: String(this.plugin.settings.nexusScore) });

        contentEl.createEl('hr');

        const historyContainer = contentEl.createDiv({ cls: 'nexus-score-history-list' });
        const history = [...this.plugin.settings.scoreHistory].reverse(); // Mostra os mais recentes primeiro

        if (history.length === 0) {
            historyContainer.createEl('p', { text: t('MODAL_NEXUS_SCORE_HISTORY_EMPTY'), cls: 'mod-subtle' });
        } else {
            history.forEach((item: { date: string; points: number; reason: string; currentScore: number; }) => {
                const itemEl = historyContainer.createDiv({ cls: 'score-history-item' });

                const infoEl = itemEl.createDiv();
                infoEl.createDiv({ text: item.reason, cls: 'score-reason' });
                infoEl.createDiv({ text: moment(item.date).format('DD/MM/YYYY HH:mm'), cls: 'score-date' });

                const pointsEl = itemEl.createDiv({
                    text: item.points > 0 ? `+${item.points}` : String(item.points),
                    cls: `score-points ${item.points > 0 ? 'positive' : 'negative'}`
                });
            });
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class OnboardingModal extends Modal {
    plugin: MoneyManagerPlugin;
    onSubmit?: () => void;
    userName: string = "";
    monthlyIncome: number = 0;

    constructor(app: App, plugin: MoneyManagerPlugin, onSubmit?: () => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Pre-fill with existing data for editing
        this.userName = this.plugin.settings.userName;

        const isEditing = this.plugin.settings.onboardingComplete;

        if (isEditing) {
            contentEl.createEl("h1", { text: t('MODAL_ONBOARDING_UPDATE_TITLE') });
        } else {
            contentEl.createEl("h1", { text: t('MODAL_ONBOARDING_WELCOME_TITLE') });
            contentEl.createEl("p", { text: t('MODAL_ONBOARDING_WELCOME_DESC') });
        }

        new Setting(contentEl)
            .setName(t('MODAL_ONBOARDING_NAME_LABEL'))
            .addText(text =>
                text.setPlaceholder(t('MODAL_ONBOARDING_NAME_PLACEHOLDER'))
                    .setValue(this.userName)
                    .onChange((value) => this.userName = value));

        // Only ask for income during initial onboarding
        if (!isEditing) {
            new Setting(contentEl)
                .setName(t('MODAL_ONBOARDING_INCOME_LABEL'))
                .addText(text => {
                    text.setPlaceholder(formatAsCurrency(5000));
                    setupCurrencyInput(text, val => this.monthlyIncome = val);
                });
        }

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText(isEditing ? t('MODAL_ONBOARDING_SAVE_BUTTON') : t('MODAL_ONBOARDING_START_BUTTON'))
                .setCta()
                .onClick(async () => {
                    if (!this.userName) {
                        new Notice(t('MODAL_ONBOARDING_NAME_REQUIRED_NOTICE'));
                        return;
                    }
                    if (!isEditing && this.monthlyIncome <= 0) {
                        new Notice(t('MODAL_ONBOARDING_INCOME_REQUIRED_NOTICE'));
                        return;
                    }

                    this.plugin.settings.userName = this.userName.trim();

                    if (!isEditing) {
                        this.plugin.settings.onboardingComplete = true;
                        this.createRecurringIncome();
                    }

                    await this.plugin.saveSettings();
                    eventManager.emit('data-changed');
                    if (this.onSubmit) {
                        this.onSubmit();
                    }
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

    onClose() {
        this.contentEl.empty();
    }
}