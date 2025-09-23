import type MoneyManagerPlugin from '../../main';
import { NexusHubView } from './dashboard';
import { ReportView } from './reports';
import { FutureLedgerView } from './future-ledger';
import { MONEY_MANAGER_VIEW_TYPE, MONEY_MANAGER_REPORT_VIEW_TYPE, FUTURE_LEDGER_VIEW_TYPE } from '../../constants';

export function registerViews(plugin: MoneyManagerPlugin) {
    try {
        // Register Dashboard View
        plugin.registerView(
            MONEY_MANAGER_VIEW_TYPE,
            (leaf) => new NexusHubView(leaf, plugin)
        );

        // Register Report View
        plugin.registerView(
            MONEY_MANAGER_REPORT_VIEW_TYPE,
            (leaf) => new ReportView(leaf, plugin)
        );

        // Register Future Ledger View
        plugin.registerView(
            FUTURE_LEDGER_VIEW_TYPE,
            (leaf) => new FutureLedgerView(leaf, plugin)
        );

        // Add ribbon icons
        plugin.addRibbonIcon('piggy-bank', 'Open Money Manager Dashboard', () => {
            plugin.activateView().catch(error => {
                console.error('Failed to activate view from ribbon:', error);
            });
        });

        plugin.addRibbonIcon('pie-chart', 'Open Reports', async () => {
            try {
                const { openReportView } = await import('../../commands/navigation');
                await openReportView(plugin);
            } catch (error) {
                console.error('Failed to open report view from ribbon:', error);
            }
        });
    } catch (error) {
        console.error('Error registering views:', error);
        throw error;
    }
}

// Re-export view types for convenience
export { MONEY_MANAGER_VIEW_TYPE, MONEY_MANAGER_REPORT_VIEW_TYPE, FUTURE_LEDGER_VIEW_TYPE };