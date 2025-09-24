# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Manager (formerly Nexus Hub) is an Obsidian plugin for comprehensive personal finance management. It provides transaction tracking, budgeting, goal setting, credit card management, and financial reporting with gamification elements.

**Repository**: https://github.com/caio/obsidian-money-manager
**Author**: Caio
**Plugin ID**: obsidian-money-manager

## Essential Commands

```bash
# Install dependencies (required after cloning)
npm install

# Development mode with hot reload
npm run dev

# Production build (TypeScript check + bundling)
npm run build

# Linting
eslint src --ext .ts,.tsx
eslint src --ext .ts,.tsx --fix  # Auto-fix

# Version bump (updates manifest.json and versions.json)
npm run version

# Deploy to local Obsidian vault (Windows PowerShell)
npm run deploy
```

## Architecture Overview

### Plugin Structure
The plugin follows Obsidian's community plugin architecture with a recently refactored structure following AGENTS.md guidelines:

- **Entry Point**: `src/main.ts` (105 lines, minimal lifecycle code only)
- **Build Output**: `main.js` (bundled by esbuild, ~630KB)
- **Required Release Files**: `main.js`, `manifest.json`, `styles.css`

### Core Architecture Decisions

1. **Lazy Loading Pattern**: Heavy modules are dynamically imported to improve startup performance
2. **Event-Driven Updates**: Uses `EventManager` for decoupled component communication
3. **Type Safety**: All interfaces centralized in `src/types.ts` with Language type imported from i18n
4. **Modular Commands**: Commands extracted to `src/commands/` for better organization
5. **View Registration**: Three main views (Dashboard, Reports, Future Ledger) registered in `src/ui/views/index.ts`

### Key Component Relationships

```
main.ts
├── commands/index.ts → registerCommands()
├── ui/views/index.ts → registerViews()
├── core/data-migration.ts → migrateData()
├── core/settings.ts → Settings & Defaults
└── Dynamic imports for:
    ├── navigation methods
    ├── payment handlers
    ├── emergency fund operations
    └── goal management
```

### Data Flow
1. **Settings**: Persisted via Obsidian's `loadData()`/`saveData()` API
2. **State Updates**: Components emit events via `eventManager`, views listen and re-render
3. **Nexus Score**: Points system with history tracking for gamification
4. **Achievements**: Checked after settings save, unlocked achievements stored in settings

### Internationalization
- **Language**: English only
- **Translation System**: `src/i18n/lang.ts` with `t()` function (English-only)
- **Language Type**: Fixed as 'en' in `i18n/lang.ts`, re-exported from `types.ts`
- **Migration**: Data version 3 automatically migrates legacy Portuguese ('pt-br') settings to English
- **Note**: Portuguese language support has been removed; automatic fallback to English for any unsupported language values

### Currency System
- **Currency**: Euro (EUR)
- **Format**: €1,500.00
- **Locale**: en-EU
- **Parser**: Handles Euro symbol (€) for input parsing

### Moment.js Usage
Obsidian provides moment.js globally. Use `declare const moment: any;` instead of importing.

## Current Technical Debt

### modals.ts (2092 lines)
Located in root directory, needs splitting into ~10 files of 200-300 lines each:
- Transaction modals → `src/ui/modals/transaction/`
- Goal modals → `src/ui/modals/goals/`
- Card modals → `src/ui/modals/cards/`
- User modals → `src/ui/modals/user/`

This file currently contains all modal implementations and should be refactored following the existing folder structure.

### React Components
Two React components exist in `src/ui/components/` but aren't fully integrated. They demonstrate React capability for future UI enhancements.

## Testing Deployment

For local testing:
1. Build the plugin: `npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` to `<YourVault>/.obsidian/plugins/obsidian-money-manager/`
3. Reload Obsidian (Ctrl/Cmd + R)
4. Enable "Money Manager" plugin in Settings → Community plugins

**Development with Symlinks** (Recommended):
```bash
# Create plugin directory
mkdir -p <YourVault>/.obsidian/plugins/obsidian-money-manager
# Create symlinks for development
ln -sf $(pwd)/main.js <YourVault>/.obsidian/plugins/obsidian-money-manager/main.js
ln -sf $(pwd)/manifest.json <YourVault>/.obsidian/plugins/obsidian-money-manager/manifest.json
ln -sf $(pwd)/styles.css <YourVault>/.obsidian/plugins/obsidian-money-manager/styles.css
```

## Important Implementation Notes

### View Type Constants
**CRITICAL**: Constants are centralized in `src/constants.ts` to avoid duplication issues:
- `MONEY_MANAGER_VIEW_TYPE = "money-manager-view"`
- `MONEY_MANAGER_REPORT_VIEW_TYPE = "money-manager-report-view"`
- `FUTURE_LEDGER_VIEW_TYPE = "future-ledger-view"`

**Important**: Views must import from `../../constants`, NOT define their own constants!

### Payment Processing
Complex payment logic in `src/core/payment-handler.ts` handles:
- Bulk payments with Nexus Score calculations
- Emergency fund contributions
- Debt goal progress tracking
- Transaction status updates

### Data Migration
Version-based migration in `src/core/data-migration.ts`. Current version: 2.
Handles goal type migration from translated strings to keys ('Saving'/'Debt').

### Settings Management
- Default settings in `src/core/settings.ts`
- Settings tab implementation in same file
- All settings interfaces in `src/types.ts`
- Settings saved after critical operations trigger achievement checks

## Critical View Rendering Issues & Solutions

### Problem: Views Not Displaying
**Root Cause**: Views opening in collapsed right sidedock (0x0 dimensions)

**Solution**: Use `getLeaf('tab')` instead of `getRightLeaf(false)`:
```typescript
// ❌ WRONG - Opens in right panel which may be collapsed
const leaf = plugin.app.workspace.getRightLeaf(false);

// ✅ CORRECT - Opens as tab in main workspace
const leaf = plugin.app.workspace.getLeaf('tab');
```

### View Lifecycle
1. **Registration**: Views registered via `plugin.registerView()` in `src/ui/views/index.ts`
2. **Creation**: New instance created when `setViewState()` is called
3. **Opening**: Use `plugin.app.workspace.getLeaf('tab')` for main area
4. **Activation**: Call `plugin.app.workspace.setActiveLeaf(leaf)` to focus

### Debugging Tips
- Check parent element dimensions with `offsetWidth` and `offsetHeight`
- Verify view is in DOM with `document.contains(element)`
- Use `getComputedStyle()` to check display/visibility properties
- Force fresh instances by detaching existing leaves first