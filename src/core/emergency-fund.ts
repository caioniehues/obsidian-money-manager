import { Notice } from 'obsidian';
import type MoneyManagerPlugin from '../main';
import { t } from '../i18n/lang';
import { formatAsCurrency } from './helpers';
import { eventManager } from './event-manager';

export async function payFromEmergencyFund(plugin: MoneyManagerPlugin, transactionId: string) {
    const transaction = plugin.settings.transactions.find(tx => tx.id === transactionId);
    if (!transaction) {
        new Notice(t('TRANSACTION_NOT_FOUND'));
        return;
    }

    if (plugin.settings.emergencyFund.currentBalance < transaction.amount) {
        new Notice(t('MODAL_EMERGENCY_FUND_INSUFFICIENT_FUNDS_NOTICE'));
        return;
    }

    // 1. Update Emergency Fund
    plugin.settings.emergencyFund.currentBalance -= transaction.amount;
    plugin.settings.emergencyFund.history.push({
        date: new Date().toISOString(),
        type: 'withdrawal',
        amount: transaction.amount,
        balanceAfter: plugin.settings.emergencyFund.currentBalance,
        reason: `${t('PAYMENT')}: ${transaction.description}`
    });

    // 2. Mark transaction as paid
    transaction.status = 'paid';

    // Award 2 Nexus points for using emergency fund (responsible financial behavior)
    await plugin.increaseNexusScore(2, t('NEXUS_SCORE_REASON_EMERGENCY_FUND_USE'));

    // 3. Save and notify
    await plugin.saveSettings();
    eventManager.emit('data-changed');

    new Notice(t('MODAL_EMERGENCY_FUND_PAYMENT_SUCCESS_NOTICE', {
        amount: formatAsCurrency(transaction.amount),
        description: transaction.description,
        balance: formatAsCurrency(plugin.settings.emergencyFund.currentBalance)
    }));
}