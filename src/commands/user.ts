import type MoneyManagerPlugin from '../main';
import { EditUserModal } from '../ui/modals';

export function editUserInfo(plugin: MoneyManagerPlugin) {
    new EditUserModal(plugin.app, plugin).open();
}