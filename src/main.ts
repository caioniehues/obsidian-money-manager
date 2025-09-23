import { Plugin } from 'obsidian';
import { MoneyManagerSettings, DEFAULT_SETTINGS, MoneyManagerSettingsTab } from './core/settings';
import { setLanguage } from './i18n/lang';
import { registerCommands } from './commands';
import { migrateData } from './core/data-migration';
import { registerViews } from './ui/views';
import { OnboardingModal } from './ui/modals';
import { checkAchievements } from './core/achievements';

export default class MoneyManagerPlugin extends Plugin {
    settings: MoneyManagerSettings;

    async onload() {
        console.log('Loading Money Manager plugin...');

        try {
            // Load settings
            await this.loadSettings();

            // Run data migration
            await migrateData(this.settings, (data) => this.saveData(data));

            // Initialize language
            setLanguage(this.settings.language);

            // Show onboarding if needed
            if (!this.settings.onboardingComplete) {
                new OnboardingModal(this.app, this, () => {
                    this.activateView();
                }).open();
            }

            // Register views
            registerViews(this);

            // Register commands
            registerCommands(this);

            // Add settings tab
            this.addSettingTab(new MoneyManagerSettingsTab(this.app, this));

            console.log('Money Manager plugin loaded successfully');
        } catch (error) {
            console.error('Failed to load Money Manager plugin:', error);
            throw error;
        }
    }

    onunload() {
        console.log('Unloading Money Manager plugin.');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Check for achievements after saving
        const result = checkAchievements(this.settings);
        // Achievement logic handled in checkAchievements
    }

    // Helper method for views/commands to access
    async activateView() {
        try {
            const { openMoneyManager } = await import('./commands/navigation');
            await openMoneyManager(this);
        } catch (error) {
            console.error('Failed to activate Money Manager view:', error);
            throw error;
        }
    }

    async activateReportView() {
        try {
            const { openReportView } = await import('./commands/navigation');
            await openReportView(this);
        } catch (error) {
            console.error('Failed to activate Report view:', error);
            throw error;
        }
    }

    async activateFutureLedgerView() {
        try {
            const { FUTURE_LEDGER_VIEW_TYPE } = await import('./constants');
            this.app.workspace.detachLeavesOfType(FUTURE_LEDGER_VIEW_TYPE);
            // Open in main area as a tab
            const leaf = this.app.workspace.getLeaf('tab');
            if (leaf) {
                await leaf.setViewState({
                    type: FUTURE_LEDGER_VIEW_TYPE,
                    active: true,
                });
            } else {
                console.error('Failed to get workspace leaf for Future Ledger view');
            }
        } catch (error) {
            console.error('Failed to activate Future Ledger view:', error);
            throw error;
        }
    }

    // These methods should ideally be moved to a separate module, but are kept here for now
    async increaseNexusScore(points: number, reason: string) {
        const implementation = await import('./core/nexus-score');
        await implementation.increaseNexusScore(this, points, reason);
    }

    async handlePayment(transaction: any) {
        const implementation = await import('./core/payment-handler');
        await implementation.handlePayment(this, transaction);
    }

    async handleBulkPayment(transactions: any[]) {
        const implementation = await import('./core/payment-handler');
        await implementation.handleBulkPayment(this, transactions);
    }

    async payFromEmergencyFund(transactionId: string) {
        const implementation = await import('./core/emergency-fund');
        await implementation.payFromEmergencyFund(this, transactionId);
    }

    async resetAllData() {
        const { resetAllData } = await import('./commands/reset-data');
        await resetAllData(this);
    }

    async checkAndCompleteDebtGoal(transaction: any) {
        const implementation = await import('./core/goals-handler');
        await implementation.checkAndCompleteDebtGoal(this, transaction);
    }
}