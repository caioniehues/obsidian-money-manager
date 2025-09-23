import { Plugin } from 'obsidian';
import type MoneyManagerPlugin from '../main';
import { openMoneyManager, openReportView } from './navigation';
import { editUserInfo } from './user';
import { importCsv } from './import-export';
import { resetAllData } from './reset-data';
import { exportFullBackup, importFullBackup } from './backup';
import { t } from '../i18n/lang';

export function registerCommands(plugin: MoneyManagerPlugin) {
    // Navigation commands
    plugin.addCommand({
        id: 'open-nexus-hub-view',
        name: t('COMMAND_OPEN_NEXUS_HUB'),
        callback: () => openMoneyManager(plugin),
    });

    // User commands
    plugin.addCommand({
        id: 'edit-onboarding-info',
        name: t('COMMAND_EDIT_USER_INFO'),
        callback: () => editUserInfo(plugin),
    });

    // Import/Export commands
    plugin.addCommand({
        id: 'import-csv',
        name: t('COMMAND_IMPORT_CSV'),
        callback: () => importCsv(plugin),
    });

    // Data management commands
    plugin.addCommand({
        id: 'reset-all-data',
        name: t('COMMAND_RESET_DATA'),
        callback: () => resetAllData(plugin),
    });

    // Backup commands
    plugin.addCommand({
        id: 'export-full-backup',
        name: t('COMMAND_EXPORT_BACKUP'),
        callback: () => exportFullBackup(plugin),
    });

    plugin.addCommand({
        id: 'import-full-backup',
        name: t('COMMAND_IMPORT_BACKUP'),
        callback: () => importFullBackup(plugin),
    });
}