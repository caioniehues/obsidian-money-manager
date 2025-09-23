import { Notice } from 'obsidian';
import type MoneyManagerPlugin from '../main';
import { Transaction } from '../types';
import { t } from '../i18n/lang';

export async function checkAndCompleteDebtGoal(plugin: MoneyManagerPlugin, transaction: Transaction) {
    // Check if this transaction is linked to a debt goal
    const debtGoals = plugin.settings.goals.filter(g =>
        g.goalType === 'Debt' &&
        g.linkedAccountIds.includes(transaction.installmentOf || transaction.id)
    );

    for (const goal of debtGoals) {
        if (goal.completed) continue;

        // Update goal progress
        goal.currentAmount += transaction.amount;

        // Check if goal is now complete
        if (goal.currentAmount >= goal.targetAmount) {
            goal.completed = true;

            // Award bonus Nexus Score for completing a debt goal
            await plugin.increaseNexusScore(
                100,
                t('NEXUS_SCORE_REASON_DEBT_GOAL_COMPLETED', { goalName: goal.name })
            );

            new Notice(
                t('MODAL_GOALS_COMPLETED_NOTICE', { goalName: goal.name }),
                5000
            );
        }
    }

    // Save settings if any goals were updated
    if (debtGoals.length > 0) {
        await plugin.saveSettings();
    }
}