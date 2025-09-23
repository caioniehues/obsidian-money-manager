import { Notice } from 'obsidian';
import type MoneyManagerPlugin from '../main';
import { t } from '../i18n/lang';
import { DEFAULT_SETTINGS } from '../core/settings';
import { OnboardingModal } from '../ui/modals';
import { MONEY_MANAGER_VIEW_TYPE, MONEY_MANAGER_REPORT_VIEW_TYPE, FUTURE_LEDGER_VIEW_TYPE } from '../constants';

export async function resetAllData(plugin: MoneyManagerPlugin) {
    const confirmation = window.prompt(t('RESET_DATA_CONFIRM_1', { keyword: t('RESET_DATA_CONFIRM_KEYWORD_1') }));
    if (confirmation === t('RESET_DATA_CONFIRM_KEYWORD_1')) {
        const secondConfirmation = window.prompt(t('RESET_DATA_CONFIRM_2', { keyword: t('RESET_DATA_CONFIRM_KEYWORD_2') }));
        if (secondConfirmation === t('RESET_DATA_CONFIRM_KEYWORD_2')) {
            // Detach all views before changing data underneath them
            plugin.app.workspace.detachLeavesOfType(MONEY_MANAGER_VIEW_TYPE);
            plugin.app.workspace.detachLeavesOfType(MONEY_MANAGER_REPORT_VIEW_TYPE);
            plugin.app.workspace.detachLeavesOfType(FUTURE_LEDGER_VIEW_TYPE);

            plugin.settings = DEFAULT_SETTINGS;
            // Use saveData to avoid triggering achievement check on empty data
            await plugin.saveData(plugin.settings);

            new Notice(t('RESET_DATA_SUCCESS'));

            // Open the onboarding modal to re-configure
            new OnboardingModal(plugin.app, plugin, () => {
                plugin.activateView();
            }).open();
        }
    }
}