# React Dashboard Guide for Obsidian Plugins

This guide provides a comprehensive approach to implementing React-based dashboards in Obsidian plugins, based on lessons learned from the Nexus Hub plugin development.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [React Integration](#react-integration)
- [Creating the Dashboard View](#creating-the-dashboard-view)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Styling](#styling)
- [Common Pitfalls & Solutions](#common-pitfalls--solutions)
- [Performance Optimization](#performance-optimization)
- [Example Implementation](#example-implementation)

## Prerequisites

### Required Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

### Build Configuration
Ensure your `esbuild.config.mjs` doesn't externalize React:
```javascript
// Don't include react/react-dom in the external array
external: [
  "obsidian",
  "electron",
  // React is bundled, not external
  ...builtins
]
```

## Project Setup

### Directory Structure
```
src/
├── main.ts                      # Plugin entry point
├── constants.ts                 # Centralized constants
├── ui/
│   ├── views/
│   │   ├── index.ts            # View registration
│   │   └── react-dashboard.tsx # React dashboard view
│   └── components/
│       ├── Dashboard.tsx       # Main dashboard component
│       ├── widgets/            # Dashboard widgets
│       └── common/             # Reusable components
└── types.ts                    # TypeScript interfaces
```

## React Integration

### 1. Create the React View Class

```typescript
// src/ui/views/react-dashboard.tsx
import { ItemView, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Dashboard } from '../components/Dashboard';
import type YourPlugin from '../../main';

export const REACT_DASHBOARD_VIEW_TYPE = 'react-dashboard-view';

export class ReactDashboardView extends ItemView {
    private reactRoot: ReactDOM.Root | null = null;
    plugin: YourPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: YourPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return REACT_DASHBOARD_VIEW_TYPE;
    }

    getDisplayText() {
        return 'React Dashboard';
    }

    getIcon() {
        return 'gauge';
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // CRITICAL: Add view class for styling
        this.containerEl.addClass('react-dashboard-view');

        // Create root element for React
        const root = contentEl.createDiv({ cls: 'react-root' });

        // Initialize React root
        this.reactRoot = ReactDOM.createRoot(root);

        // Render React component
        this.reactRoot.render(
            <React.StrictMode>
                <Dashboard
                    plugin={this.plugin}
                    settings={this.plugin.settings}
                    onSettingsChange={(settings) => this.plugin.saveSettings(settings)}
                />
            </React.StrictMode>
        );
    }

    async onClose() {
        // Clean up React root
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
    }
}
```

### 2. Register the View

```typescript
// src/ui/views/index.ts
import type YourPlugin from '../../main';
import { ReactDashboardView, REACT_DASHBOARD_VIEW_TYPE } from './react-dashboard';

export function registerViews(plugin: YourPlugin) {
    // Register React Dashboard View
    plugin.registerView(
        REACT_DASHBOARD_VIEW_TYPE,
        (leaf) => new ReactDashboardView(leaf, plugin)
    );

    // Add ribbon icon
    plugin.addRibbonIcon('gauge', 'Open React Dashboard', () => {
        openReactDashboard(plugin);
    });
}

async function openReactDashboard(plugin: YourPlugin) {
    // Detach existing leaves for fresh instance
    plugin.app.workspace.detachLeavesOfType(REACT_DASHBOARD_VIEW_TYPE);

    // CRITICAL: Use getLeaf('tab') not getRightLeaf()!
    const leaf = plugin.app.workspace.getLeaf('tab');

    if (leaf) {
        await leaf.setViewState({
            type: REACT_DASHBOARD_VIEW_TYPE,
            active: true,
        });
        plugin.app.workspace.setActiveLeaf(leaf);
    }
}
```

## Component Architecture

### Main Dashboard Component

```typescript
// src/ui/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import type YourPlugin from '../../main';
import { Header } from './widgets/Header';
import { StatsGrid } from './widgets/StatsGrid';
import { TransactionList } from './widgets/TransactionList';
import { ChartWidget } from './widgets/ChartWidget';

interface DashboardProps {
    plugin: YourPlugin;
    settings: YourSettings;
    onSettingsChange: (settings: YourSettings) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    plugin,
    settings,
    onSettingsChange
}) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    // Load data on mount and when month changes
    useEffect(() => {
        loadDashboardData();
    }, [selectedMonth, settings]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Process your data here
            const processedData = processDataForMonth(settings, selectedMonth);
            setData(processedData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="dashboard-loading">Loading...</div>;
    }

    return (
        <div className="react-dashboard">
            <Header
                userName={settings.userName}
                score={settings.score}
                onMonthChange={setSelectedMonth}
                currentMonth={selectedMonth}
            />

            <StatsGrid
                stats={data?.stats || {}}
                month={selectedMonth}
            />

            <div className="dashboard-grid">
                <div className="main-content">
                    <TransactionList
                        transactions={data?.transactions || []}
                        onTransactionUpdate={(tx) => handleTransactionUpdate(tx)}
                    />
                </div>

                <div className="sidebar">
                    <ChartWidget
                        data={data?.chartData || []}
                        type="pie"
                    />
                </div>
            </div>
        </div>
    );
};
```

## State Management

### Using React Context for Global State

```typescript
// src/ui/components/context/AppContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface AppState {
    transactions: Transaction[];
    categories: Category[];
    selectedPeriod: DateRange;
}

type AppAction =
    | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'SET_PERIOD'; payload: DateRange };

const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};
```

### Integration with Obsidian Events

```typescript
// src/ui/components/hooks/useObsidianEvents.ts
import { useEffect } from 'react';
import { eventManager } from '../../../core/event-manager';

export const useObsidianEvents = (
    eventName: string,
    handler: (...args: any[]) => void
) => {
    useEffect(() => {
        eventManager.on(eventName, handler);

        return () => {
            eventManager.off(eventName, handler);
        };
    }, [eventName, handler]);
};

// Usage in component
const Dashboard: React.FC = () => {
    const [data, setData] = useState([]);

    useObsidianEvents('data-changed', () => {
        // Refresh dashboard when data changes
        loadDashboardData();
    });
};
```

## Styling

### CSS Modules Approach

```scss
// styles/dashboard.module.scss
.dashboard {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--size-4-4);
    padding: var(--size-4-4);
    height: 100%;
    overflow: auto;

    &.focusMode {
        grid-template-columns: 1fr;

        .sidebar {
            display: none;
        }
    }
}

.statsGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--size-4-2);
    margin-bottom: var(--size-4-4);
}

.statCard {
    background: var(--background-modifier-form-field);
    padding: var(--size-4-3);
    border-radius: var(--radius-s);

    &.positive {
        border-left: 3px solid var(--color-green);
    }

    &.negative {
        border-left: 3px solid var(--color-red);
    }
}
```

### Using Obsidian's CSS Variables

Always use Obsidian's CSS variables for consistency:
- `--background-primary`: Main background
- `--background-secondary`: Secondary background
- `--text-normal`: Normal text color
- `--text-muted`: Muted text color
- `--interactive-accent`: Accent color
- `--interactive-hover`: Hover color

## Common Pitfalls & Solutions

### 1. View Not Displaying (0x0 Dimensions)

**Problem**: View opens in collapsed sidebar with no dimensions.

**Solution**:
```typescript
// ❌ WRONG
const leaf = plugin.app.workspace.getRightLeaf(false);

// ✅ CORRECT
const leaf = plugin.app.workspace.getLeaf('tab');
```

### 2. React Root Memory Leaks

**Problem**: Not cleaning up React root on close.

**Solution**:
```typescript
async onClose() {
    if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
    }
}
```

### 3. State Not Persisting

**Problem**: State lost on view close.

**Solution**: Save to Obsidian settings:
```typescript
const handleStateChange = async (newState: AppState) => {
    plugin.settings.dashboardState = newState;
    await plugin.saveSettings();
};
```

### 4. Hot Reload Not Working

**Problem**: Changes don't reflect during development.

**Solution**: Use proper dev setup:
```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs"
  }
}
```

## Performance Optimization

### 1. Lazy Loading Components

```typescript
import React, { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./widgets/HeavyChart'));

export const Dashboard = () => (
    <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
    </Suspense>
);
```

### 2. Memoization

```typescript
import React, { useMemo, memo } from 'react';

export const ExpensiveComponent = memo(({ data }) => {
    const processedData = useMemo(() => {
        return heavyProcessing(data);
    }, [data]);

    return <div>{processedData}</div>;
});
```

### 3. Virtual Scrolling for Lists

```typescript
import { FixedSizeList } from 'react-window';

export const TransactionList = ({ transactions }) => (
    <FixedSizeList
        height={600}
        itemCount={transactions.length}
        itemSize={60}
        width="100%"
    >
        {({ index, style }) => (
            <div style={style}>
                <TransactionRow transaction={transactions[index]} />
            </div>
        )}
    </FixedSizeList>
);
```

## Example Implementation

### Complete Mini Dashboard

```typescript
// src/ui/components/MiniDashboard.tsx
import React, { useState, useEffect } from 'react';
import './MiniDashboard.css';

interface Props {
    plugin: any;
}

export const MiniDashboard: React.FC<Props> = ({ plugin }) => {
    const [stats, setStats] = useState({
        total: 0,
        income: 0,
        expenses: 0,
        balance: 0
    });

    useEffect(() => {
        calculateStats();
    }, [plugin.settings]);

    const calculateStats = () => {
        const transactions = plugin.settings.transactions || [];
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        setStats({
            total: transactions.length,
            income,
            expenses,
            balance: income - expenses
        });
    };

    return (
        <div className="mini-dashboard">
            <h2>Financial Overview</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Transactions</div>
                </div>

                <div className="stat-card positive">
                    <div className="stat-value">${stats.income}</div>
                    <div className="stat-label">Income</div>
                </div>

                <div className="stat-card negative">
                    <div className="stat-value">${stats.expenses}</div>
                    <div className="stat-label">Expenses</div>
                </div>

                <div className={`stat-card ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-value">${stats.balance}</div>
                    <div className="stat-label">Balance</div>
                </div>
            </div>

            <button
                className="mod-cta"
                onClick={() => plugin.openDetailedView()}
            >
                View Details
            </button>
        </div>
    );
};
```

## Testing Your React Dashboard

### 1. Development Workflow
```bash
# Start development with hot reload
npm run dev

# In another terminal, link to test vault
ln -sf "$(pwd)/main.js" ~/ObsidianVault/.obsidian/plugins/your-plugin/
ln -sf "$(pwd)/styles.css" ~/ObsidianVault/.obsidian/plugins/your-plugin/
ln -sf "$(pwd)/manifest.json" ~/ObsidianVault/.obsidian/plugins/your-plugin/
```

### 2. Debug in Obsidian Console
```javascript
// Check if view is registered
app.workspace.getLeavesOfType('react-dashboard-view')

// Manually open view
app.workspace.getLeaf('tab').setViewState({
    type: 'react-dashboard-view',
    active: true
})

// Check React DevTools
// Install React DevTools browser extension
// Open DevTools in Obsidian (Ctrl+Shift+I)
```

## Best Practices

1. **Always use TypeScript** for type safety
2. **Follow Obsidian's UI conventions** for consistency
3. **Implement error boundaries** to catch React errors
4. **Use React.memo** for expensive components
5. **Debounce user inputs** that trigger saves
6. **Test on both light and dark themes**
7. **Profile performance** with React DevTools
8. **Keep bundle size minimal** - lazy load when possible
9. **Document component props** with JSDoc or prop-types
10. **Use CSS variables** from Obsidian for theming

## Conclusion

Building React dashboards in Obsidian plugins provides powerful UI capabilities while maintaining integration with Obsidian's ecosystem. Key takeaways:

- Always open views in main workspace tabs to avoid dimension issues
- Clean up React roots properly to prevent memory leaks
- Use Obsidian's event system for plugin-React communication
- Follow Obsidian's styling conventions for consistency
- Test thoroughly in both development and production builds

For more examples and patterns, refer to the Nexus Hub plugin implementation.