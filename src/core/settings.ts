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
    { id: 'cat_1', name: 'Moradia' },
    { id: 'cat_2', name: 'Alimentação' },
    { id: 'cat_3', name: 'Transporte' },
    { id: 'cat_4', name: 'Saúde' },
    { id: 'cat_5', name: 'Lazer' },
    { id: 'cat_6', name: 'Assinaturas' },
    { id: 'cat_7', name: 'Educação' },
    { id: 'cat_8', name: 'Investimentos' },
    { id: 'cat_9', name: 'Outros' },
    { id: 'cat_income_1', name: 'Salário' },
    { id: 'cat_income_2', name: 'Renda Extra' },
];

export const DEFAULT_SETTINGS: MoneyManagerSettings = {
    language: 'pt-br' as Language,
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
                .addOption('pt-br', t('SETTINGS_LANGUAGE_PT_BR'))
                .addOption('en', t('SETTINGS_LANGUAGE_EN'))
                .setValue(this.plugin.settings.language)
                .onChange(async (value: Language) => {
                    this.plugin.settings.language = value;
                    // Aqui chamamos saveSettings, que irá disparar a verificação de conquistas
                    await this.plugin.saveSettings();
                    setLanguage(value);
                    eventManager.emit('data-changed'); // Dispara a atualização da UI principal
                    this.display(); // Redesenha a tela de configurações
                }));

        // --- ZONA DE PERIGO ---
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