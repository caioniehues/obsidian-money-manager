import { Notice } from 'obsidian';
declare const moment: any;
import type MoneyManagerPlugin from '../main';
import { eventManager } from '../core/event-manager';

export function exportFullBackup(plugin: MoneyManagerPlugin) {
    try {
        const backupData = JSON.stringify(plugin.settings, null, 2);
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus-hub-backup-${moment().format('YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        new Notice('Backup completo exportado com sucesso!');
    } catch (error) {
        console.error("Erro ao exportar backup:", error);
        new Notice('Ocorreu um erro ao exportar o backup.');
    }
}

export function importFullBackup(plugin: MoneyManagerPlugin) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const importedSettings = JSON.parse(content);

                // Validação simples para garantir que é um arquivo de backup válido
                if (importedSettings.userName === undefined || !Array.isArray(importedSettings.transactions)) {
                    throw new Error("Arquivo de backup inválido ou corrompido.");
                }

                if (window.confirm("Atenção: Isto irá sobrescrever TODOS os seus dados atuais do Money Manager. Esta ação não pode ser desfeita. Deseja continuar?")) {
                    plugin.settings = importedSettings;
                    await plugin.saveSettings();
                    eventManager.emit('data-changed');
                    new Notice('Backup importado com sucesso! Os dados foram restaurados.');
                    plugin.activateView();
                }
            } catch (error: any) {
                console.error("Erro ao importar backup:", error);
                new Notice(`Falha ao importar backup: ${error.message}`);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}