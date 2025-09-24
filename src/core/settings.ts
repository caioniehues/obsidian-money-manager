import { App, PluginSettingTab, Setting } from 'obsidian';
import type MoneyManagerPlugin from '../main';
import { Language, setLanguage, t } from '../i18n/lang';
declare const moment: any;
import { eventManager } from './event-manager';
import {
    Transaction,
    CreditCard,
    Goal,
    Achievement,
    Budget,
    EmergencyFund,
    Category,
    MoneyManagerSettings
} from '../types';

// Re-export types for backward compatibility
export type {
    Transaction,
    CreditCard,
    Goal,
    Achievement,
    Budget,
    EmergencyFund,
    Category,
    MoneyManagerSettings
};

// --- DEFAULT SETTINGS ---

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_1', name: 'Housing' },
    { id: 'cat_2', name: 'Food' },
    { id: 'cat_3', name: 'Transportation' },
    { id: 'cat_4', name: 'Healthcare' },
    { id: 'cat_5', name: 'Entertainment' },
    { id: 'cat_6', name: 'Subscriptions' },
    { id: 'cat_7', name: 'Education' },
    { id: 'cat_8', name: 'Investments' },
    { id: 'cat_9', name: 'Other' },
    { id: 'cat_income_1', name: 'Salary' },
    { id: 'cat_income_2', name: 'Extra Income' },
];

export const DEFAULT_SETTINGS: MoneyManagerSettings = {
    language: 'en' as Language,
    dataVersion: 2,
    onboardingComplete: false,
    userName: "",
    nexusScore: 0,
    scoreHistory: [],
    achievements: [],
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    budgets: [],
    goals: [],
    creditCards: [],
    emergencyFund: {
        currentBalance: 0,
        monthlyContribution: 100,
        isEnabled: false,
        history: []
    },
    notifiedTransactionIds: [],
};

// --- SETTINGS TAB ---

export class MoneyManagerSettingsTab extends PluginSettingTab {
    plugin: MoneyManagerPlugin;

    constructor(app: App, plugin: MoneyManagerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: t('SETTINGS_HEADER') });

        new Setting(containerEl)
            .setName(t('SETTINGS_LANGUAGE'))
            .setDesc(t('SETTINGS_LANGUAGE_DESC'))
            .addDropdown(dropdown => dropdown
                .addOption('en', t('SETTINGS_LANGUAGE_EN'))
                .setValue(this.plugin.settings.language)
                .onChange(async (value: Language) => {
                    this.plugin.settings.language = value;
                    // Here we call saveSettings, which will trigger achievements verification
                    await this.plugin.saveSettings();
                    setLanguage(value);
                    eventManager.emit('data-changed'); // Triggers the main UI update
                    this.display(); // Redraws the settings screen
                }));

        // --- DANGER ZONE ---
        containerEl.createEl('hr');
        const dangerZone = containerEl.createDiv({ cls: 'danger-zone' });
        dangerZone.createEl('h3', { text: t('SETTINGS_DANGER_ZONE_HEADER') });
        dangerZone.createEl('p', { text: t('SETTINGS_DANGER_ZONE_DESC'), cls: 'mod-subtle' });

        new Setting(dangerZone)
            .addButton(btn => btn
                .setButtonText(t('SETTINGS_RESET_DATA_BUTTON'))
                .setClass('mod-warning')
                .onClick(() => this.plugin.resetAllData()));
    }
}