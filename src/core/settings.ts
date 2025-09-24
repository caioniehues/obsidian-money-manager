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
    MoneyManagerSettings,
    MCLSettings
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
    MoneyManagerSettings,
    MCLSettings
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

export const DEFAULT_MCL_SETTINGS: MCLSettings = {
    enabled: false,
    columnMinWidth: 250,
    cardMinWidth: 250,
    cardGap: 16,
    cardPadding: 16,
    cardRadius: 8,
    floatMaxWidth: 40,
    galleryColumns: 3,
    dashboardEnhanced: false,
    transactionCards: false,
    budgetCardsEnhanced: false,
    wideReports: false
};

export const DEFAULT_SETTINGS: MoneyManagerSettings = {
    language: 'en' as Language,
    dataVersion: 3,
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
    mclSettings: DEFAULT_MCL_SETTINGS
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
                .onChange(async (value: any) => {
                    // Ensure we only save valid language values
                    const validLanguages = ['en'];
                    this.plugin.settings.language = validLanguages.includes(value) ? value : 'en';
                    // Here we call saveSettings, which will trigger achievements verification
                    await this.plugin.saveSettings();
                    setLanguage(value);
                    eventManager.emit('data-changed'); // Triggers the main UI update
                    this.display(); // Redraws the settings screen
                }));

        // --- MCL ENHANCEMENT SETTINGS ---
        containerEl.createEl('hr');
        containerEl.createEl('h3', { text: 'Layout Enhancements (MCL)' });

        if (!this.plugin.settings.mclSettings) {
            this.plugin.settings.mclSettings = DEFAULT_MCL_SETTINGS;
        }

        new Setting(containerEl)
            .setName('Enable MCL Enhancements')
            .setDesc('Enable Modular CSS Layout enhancements for better visual organization')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mclSettings?.enabled ?? false)
                .onChange(async (value) => {
                    if (!this.plugin.settings.mclSettings) {
                        this.plugin.settings.mclSettings = DEFAULT_MCL_SETTINGS;
                    }
                    this.plugin.settings.mclSettings.enabled = value;
                    await this.plugin.saveSettings();
                    eventManager.emit('data-changed');
                }));

        if (this.plugin.settings.mclSettings?.enabled) {
            new Setting(containerEl)
                .setName('Enhanced Dashboard')
                .setDesc('Use enhanced grid layout for dashboard')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.mclSettings?.dashboardEnhanced ?? false)
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.dashboardEnhanced = value;
                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                        }
                    }));

            new Setting(containerEl)
                .setName('Transaction Cards')
                .setDesc('Display transactions as cards instead of list items')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.mclSettings?.transactionCards ?? false)
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.transactionCards = value;
                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                        }
                    }));

            new Setting(containerEl)
                .setName('Enhanced Budget Cards')
                .setDesc('Use enhanced visual style for budget cards')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.mclSettings?.budgetCardsEnhanced ?? false)
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.budgetCardsEnhanced = value;
                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                        }
                    }));

            new Setting(containerEl)
                .setName('Wide Reports View')
                .setDesc('Use full width for reports and charts')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.mclSettings?.wideReports ?? false)
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.wideReports = value;
                            await this.plugin.saveSettings();
                            eventManager.emit('data-changed');
                        }
                    }));

            new Setting(containerEl)
                .setName('Card Minimum Width')
                .setDesc('Minimum width for card layouts (pixels)')
                .addSlider(slider => slider
                    .setLimits(200, 400, 10)
                    .setValue(this.plugin.settings.mclSettings?.cardMinWidth ?? 250)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.cardMinWidth = value;
                            document.body.style.setProperty('--mcl-card-min-width', `${value}px`);
                            await this.plugin.saveSettings();
                        }
                    }));

            new Setting(containerEl)
                .setName('Card Gap')
                .setDesc('Space between cards (pixels)')
                .addSlider(slider => slider
                    .setLimits(8, 32, 2)
                    .setValue(this.plugin.settings.mclSettings?.cardGap ?? 16)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.cardGap = value;
                            document.body.style.setProperty('--mcl-card-gap', `${value}px`);
                            await this.plugin.saveSettings();
                        }
                    }));
        }

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