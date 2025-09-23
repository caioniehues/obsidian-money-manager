import type MoneyManagerPlugin from '../main';
import { ImportCsvModal } from '../ui/modals/import/import-csv-modal';

export function importCsv(plugin: MoneyManagerPlugin) {
    new ImportCsvModal(plugin.app, plugin).open();
}