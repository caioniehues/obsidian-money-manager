import { Notice } from 'obsidian';
import type MoneyManagerPlugin from '../main';

export async function increaseNexusScore(plugin: MoneyManagerPlugin, points: number, reason: string) {
    if (points === 0) return;

    plugin.settings.nexusScore += points;
    plugin.settings.scoreHistory.push({
        date: new Date().toISOString(),
        points: points,
        reason: reason,
        currentScore: plugin.settings.nexusScore
    });

    await plugin.saveSettings();

    // We don't emit 'data-changed' here to avoid a full view re-render.
    // The view will update the score display directly.
    new Notice(`+${points} Nexus Score!`);
}