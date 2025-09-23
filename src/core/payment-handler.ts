import { Notice } from 'obsidian';
import type MoneyManagerPlugin from '../main';
import { Transaction } from '../types';
import { t } from '../i18n/lang';
import { formatAsCurrency } from './helpers';
import { eventManager } from './event-manager';

export async function handlePayment(plugin: MoneyManagerPlugin, paidTransaction: Transaction) {
    // This becomes a simple wrapper around the bulk handler
    await handleBulkPayment(plugin, [paidTransaction]);
}

export async function handleBulkPayment(plugin: MoneyManagerPlugin, paidTransactions: Transaction[]) {
    if (paidTransactions.length === 0) return;

    let totalPoints = 0;
    const debtGoals = plugin.settings.goals.filter(g => g.goalType === 'Debt');

    for (const transaction of paidTransactions) {
        const isForDebtGoal = debtGoals.some(g => g.linkedAccountIds.includes(transaction.installmentOf || ''));
        let pointsForThisTransaction = isForDebtGoal ? 5 : 1;

        // Check if it's an emergency fund contribution
        if (transaction.description === t('TRANSACTION_EMERGENCY_FUND_CONTRIBUTION') && transaction.isRecurring) {
            plugin.settings.emergencyFund.currentBalance += transaction.amount;
            pointsForThisTransaction = 5; // Override to 5 points for this important habit
            plugin.settings.emergencyFund.history.push({
                date: new Date().toISOString(),
                type: 'deposit',
                amount: transaction.amount,
                balanceAfter: plugin.settings.emergencyFund.currentBalance,
                reason: t('TRANSACTION_EMERGENCY_FUND_CONTRIBUTION')
            });
            new Notice(t('MODAL_EMERGENCY_FUND_DEPOSIT_SUCCESS_NOTICE', { amount: formatAsCurrency(transaction.amount) }));
        }
        totalPoints += pointsForThisTransaction;
    }

    if (totalPoints > 0) {
        // Use increaseNexusScore to handle history and saving
        await plugin.increaseNexusScore(totalPoints, t('NEXUS_SCORE_REASON_BULK_PAYMENT', { count: paidTransactions.length }));
    }

    // Check for goal completion for each transaction
    for (const t of paidTransactions) {
        // This function will check and award bonus points if a goal is completed.
        await plugin.checkAndCompleteDebtGoal(t);
    }

    // Save settings to persist changes like emergency fund balance
    await plugin.saveSettings();

    // Final emit to refresh UI
    eventManager.emit('data-changed');
}