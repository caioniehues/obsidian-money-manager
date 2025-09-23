import type MoneyManagerPlugin from '../main';
import { MONEY_MANAGER_VIEW_TYPE, MONEY_MANAGER_REPORT_VIEW_TYPE } from '../constants';
import { Notice } from 'obsidian';

export async function openMoneyManager(plugin: MoneyManagerPlugin) {
    try {
        // First, detach all existing leaves to ensure fresh instance
        const existingLeaves = plugin.app.workspace.getLeavesOfType(MONEY_MANAGER_VIEW_TYPE);
        if (existingLeaves.length > 0) {
            plugin.app.workspace.detachLeavesOfType(MONEY_MANAGER_VIEW_TYPE);
        }

        // Open in main area as a tab
        const leaf = plugin.app.workspace.getLeaf('tab');

        if (leaf) {
            await leaf.setViewState({
                type: MONEY_MANAGER_VIEW_TYPE,
                active: true,
            });
            plugin.app.workspace.setActiveLeaf(leaf);
        } else {
            const error = 'Failed to get workspace leaf for Money Manager';
            console.error(error);
            new Notice(error);
        }
    } catch (error) {
        console.error('Error opening Money Manager:', error);
        new Notice(`Failed to open Money Manager: ${error.message}`);
        throw error;
    }
}

export async function openReportView(plugin: MoneyManagerPlugin) {
    try {
        plugin.app.workspace.detachLeavesOfType(MONEY_MANAGER_REPORT_VIEW_TYPE);

        // Open in main area as a tab
        const leaf = plugin.app.workspace.getLeaf('tab');
        if (leaf) {
            await leaf.setViewState({
                type: MONEY_MANAGER_REPORT_VIEW_TYPE,
                active: true,
            });
        } else {
            const error = 'Failed to get workspace leaf for Report View';
            console.error(error);
            new Notice(error);
        }
    } catch (error) {
        console.error('Error opening Report View:', error);
        new Notice(`Failed to open Report View: ${error.message}`);
        throw error;
    }
}