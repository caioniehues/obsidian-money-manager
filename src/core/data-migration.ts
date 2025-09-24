import { Notice } from 'obsidian';
import { MoneyManagerSettings } from '../types';
import { t } from '../i18n/lang';

export async function migrateData(settings: MoneyManagerSettings, saveData: (data: any) => Promise<void>): Promise<void> {
    const currentVersion = settings.dataVersion || 1;
    let migrationNeeded = false;

    if (currentVersion < 2) {
        // Migration for Goal types from translated string to key
        settings.goals.forEach((goal: any) => {
            if (goal.goalType === 'Economizar Dinheiro' || goal.goalType === 'Save Money') {
                goal.goalType = 'Saving';
                migrationNeeded = true;
            } else if (goal.goalType === 'Quitar Dívida' || goal.goalType === 'Pay Off Debt' || goal.goalType === 'Quitar DÃ­vida') {
                goal.goalType = 'Debt';
                migrationNeeded = true;
            }
        });
        settings.dataVersion = 2;
    }

    if (currentVersion < 3) {
        // Migration for invalid language values (pt-br was removed)
        const validLanguages = ['en'];
        if (!validLanguages.includes(settings.language)) {
            console.log(`Migrating language from '${settings.language}' to 'en'`);
            settings.language = 'en' as any;
            migrationNeeded = true;
        }
        settings.dataVersion = 3;
    }

    if (migrationNeeded) {
        await saveData(settings);
        new Notice(t('DATA_MIGRATION_NOTICE'));
    }
}