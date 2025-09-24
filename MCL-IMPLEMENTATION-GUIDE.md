# Modular CSS Layout (MCL) Implementation Guide for Obsidian Plugin Development

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Implementation Strategy](#implementation-strategy)
4. [Pattern Library](#pattern-library)
5. [Integration Guide](#integration-guide)
6. [Advanced Techniques](#advanced-techniques)
7. [Performance Optimization](#performance-optimization)
8. [Real-World Examples](#real-world-examples)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Introduction

### What is MCL?

Modular CSS Layout (MCL) is a comprehensive CSS framework inspired by the Obsidian Modular CSS Layout community snippets. It provides a collection of flexible, responsive layout patterns that seamlessly integrate with Obsidian's native styling while offering enhanced visual organization and user experience.

### Why Use MCL in Your Plugin?

- **Native Feel**: Maintains Obsidian's aesthetic while adding professional polish
- **Responsive**: Automatically adapts to different screen sizes and themes
- **User Control**: Integrates with Style Settings for user customization
- **Performance**: Lightweight CSS-only approach with minimal JavaScript overhead
- **Accessibility**: Respects user theme preferences and accessibility settings

### Core Benefits

1. **Rapid UI Development**: Pre-built patterns accelerate development
2. **Consistent Design Language**: Unified visual system across your plugin
3. **Theme Compatibility**: Works with all Obsidian themes
4. **Progressive Enhancement**: Can be toggled on/off without breaking functionality
5. **Mobile-Ready**: Responsive patterns work on all devices

---

## Core Concepts

### 1. CSS Variable Architecture

MCL uses CSS custom properties (variables) for dynamic theming and customization:

```css
/* Define defaults with fallbacks */
:root {
    --mcl-card-min-width: 250px;
    --mcl-card-gap: 1rem;
    --mcl-card-radius: 8px;
    /* Always provide fallbacks for Obsidian variables */
    --mcl-border-color: var(--background-modifier-border);
}
```

### 2. Progressive Enhancement Pattern

Always design with graceful degradation in mind:

```typescript
// TypeScript implementation
const containerClasses = mclEnabled
    ? 'base-container mcl-enhanced'
    : 'base-container';
```

### 3. Conditional Class Application

Apply MCL classes conditionally based on user settings:

```typescript
interface MCLSettings {
    enabled: boolean;
    dashboardEnhanced: boolean;
    transactionCards: boolean;
    // ... other feature flags
}
```

### 4. Theme-Aware Styling

Use Obsidian's CSS variables for theme compatibility:

```css
.mcl-card {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
}
```

---

## Implementation Strategy

### Step 1: Project Structure

```
your-plugin/
├── src/
│   ├── ui/
│   │   ├── styles/
│   │   │   ├── mcl-core.css         # Core MCL patterns
│   │   │   ├── mcl-components.css   # Component-specific styles
│   │   │   └── mcl-animations.css   # Animation library
│   │   └── views/
│   │       └── your-view.ts         # View implementation
│   ├── types.ts                     # TypeScript interfaces
│   └── settings.ts                  # Settings configuration
├── styles.css                       # Main stylesheet
└── main.ts                          # Plugin entry point
```

### Step 2: Type Definitions

```typescript
// types.ts
export interface MCLSettings {
    enabled: boolean;
    // Layout settings
    columnMinWidth: number;
    cardMinWidth: number;
    cardGap: number;
    cardPadding: number;
    cardRadius: number;

    // Feature flags
    enhancedDashboard: boolean;
    cardLayout: boolean;
    wideView: boolean;
    floatingPanels: boolean;

    // Advanced options
    animations: boolean;
    shadowEffects: boolean;
}

export interface YourPluginSettings {
    // Your existing settings
    mclSettings?: MCLSettings;
}
```

### Step 3: Settings Integration

```typescript
// settings.ts
import { App, PluginSettingTab, Setting } from 'obsidian';

export const DEFAULT_MCL_SETTINGS: MCLSettings = {
    enabled: false,
    columnMinWidth: 250,
    cardMinWidth: 250,
    cardGap: 16,
    cardPadding: 16,
    cardRadius: 8,
    enhancedDashboard: false,
    cardLayout: false,
    wideView: false,
    floatingPanels: false,
    animations: true,
    shadowEffects: true
};

export class YourPluginSettingsTab extends PluginSettingTab {
    plugin: YourPlugin;

    display(): void {
        const { containerEl } = this;

        // MCL Section
        containerEl.createEl('h2', { text: 'Layout Enhancements (MCL)' });

        new Setting(containerEl)
            .setName('Enable MCL Enhancements')
            .setDesc('Enable Modular CSS Layout for enhanced UI')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mclSettings?.enabled ?? false)
                .onChange(async (value) => {
                    if (!this.plugin.settings.mclSettings) {
                        this.plugin.settings.mclSettings = DEFAULT_MCL_SETTINGS;
                    }
                    this.plugin.settings.mclSettings.enabled = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide options
                }));

        if (this.plugin.settings.mclSettings?.enabled) {
            // Feature toggles
            new Setting(containerEl)
                .setName('Card Layout')
                .setDesc('Display items as cards instead of lists')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.mclSettings?.cardLayout ?? false)
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.cardLayout = value;
                            await this.plugin.saveSettings();
                        }
                    }));

            // Dimension controls
            new Setting(containerEl)
                .setName('Card Width')
                .setDesc('Minimum width for cards (pixels)')
                .addSlider(slider => slider
                    .setLimits(200, 400, 10)
                    .setValue(this.plugin.settings.mclSettings?.cardMinWidth ?? 250)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        if (this.plugin.settings.mclSettings) {
                            this.plugin.settings.mclSettings.cardMinWidth = value;
                            // Update CSS variable immediately
                            document.body.style.setProperty('--mcl-card-min-width', `${value}px`);
                            await this.plugin.saveSettings();
                        }
                    }));
        }
    }
}
```

### Step 4: CSS Variable Management

```typescript
// main.ts
export default class YourPlugin extends Plugin {
    settings: YourPluginSettings;

    async onload() {
        await this.loadSettings();
        this.applyMCLStyles();
        // ... rest of initialization
    }

    private applyMCLStyles() {
        const root = document.documentElement;

        if (!this.settings.mclSettings?.enabled) {
            // Clean up CSS variables when disabled
            this.removeMCLStyles();
            return;
        }

        const mcl = this.settings.mclSettings;

        // Apply CSS variables
        root.style.setProperty('--mcl-card-min-width', `${mcl.cardMinWidth}px`);
        root.style.setProperty('--mcl-card-gap', `${mcl.cardGap}px`);
        root.style.setProperty('--mcl-card-padding', `${mcl.cardPadding}px`);
        root.style.setProperty('--mcl-card-radius', `${mcl.cardRadius}px`);
        root.style.setProperty('--mcl-column-min-width', `${mcl.columnMinWidth}px`);

        // Apply feature classes to body
        document.body.classList.toggle('mcl-animations', mcl.animations);
        document.body.classList.toggle('mcl-shadows', mcl.shadowEffects);
    }

    private removeMCLStyles() {
        const root = document.documentElement;
        const mclVars = [
            '--mcl-card-min-width',
            '--mcl-card-gap',
            '--mcl-card-padding',
            '--mcl-card-radius',
            '--mcl-column-min-width'
        ];

        mclVars.forEach(varName => root.style.removeProperty(varName));

        // Remove feature classes
        document.body.classList.remove('mcl-animations', 'mcl-shadows');
    }
}
```

---

## Pattern Library

### 1. Multi-Column Layout

**Use Case**: Dashboard grids, stat cards, feature panels

```css
.mcl-multi-column {
    display: flex;
    flex-flow: row wrap;
    gap: var(--mcl-column-gap, 1rem);
    margin: 1rem 0;
}

.mcl-multi-column > * {
    flex: 1 1 var(--mcl-column-min-width, 250px);
    margin: 0;
}

/* Fixed width variant */
.mcl-multi-column.center-fixed {
    justify-content: center;
}

.mcl-multi-column.center-fixed > * {
    flex: 0 1 var(--mcl-column-fixed-width, 200px);
}
```

**TypeScript Implementation**:

```typescript
// In your view
const createStatCards = (container: HTMLElement) => {
    const mcl = this.plugin.settings.mclSettings;
    const columnClass = mcl?.enabled ? 'mcl-multi-column' : '';

    const statsContainer = container.createDiv({
        cls: `stats-container ${columnClass}`
    });

    // Create individual stat cards
    const cards = [
        { label: 'Total', value: 1000 },
        { label: 'Pending', value: 250 },
        { label: 'Completed', value: 750 }
    ];

    cards.forEach(card => {
        const cardEl = statsContainer.createDiv({
            cls: mcl?.enabled ? 'stat-card mcl-enhanced' : 'stat-card'
        });
        cardEl.createDiv({ cls: 'stat-value', text: String(card.value) });
        cardEl.createDiv({ cls: 'stat-label', text: card.label });
    });
};
```

### 2. Card Layout

**Use Case**: Item lists, transactions, records

```css
.mcl-list-card {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--mcl-card-min-width, 250px), 1fr));
    gap: var(--mcl-card-gap, 1rem);
    margin: 1rem 0;
}

.mcl-card {
    background-color: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--mcl-card-radius, 8px);
    padding: var(--mcl-card-padding, 1rem);
    transition: transform 0.2s, box-shadow 0.2s;
}

.mcl-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Card with header */
.mcl-card-header {
    margin: -1rem -1rem 1rem -1rem;
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: var(--mcl-card-radius, 8px) var(--mcl-card-radius, 8px) 0 0;
    border-bottom: 1px solid var(--background-modifier-border);
}
```

**TypeScript Implementation**:

```typescript
interface CardItem {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'inactive';
    value: number;
}

const renderCardGrid = (items: CardItem[], container: HTMLElement) => {
    const mcl = this.plugin.settings.mclSettings;

    // Clear existing content
    container.empty();

    // Apply grid container class
    const gridClass = mcl?.cardLayout && mcl?.enabled
        ? 'item-container mcl-list-card'
        : 'item-container';

    container.addClass(gridClass);

    items.forEach(item => {
        const cardClass = mcl?.cardLayout && mcl?.enabled
            ? 'item-card mcl-card'
            : 'item-card';

        const card = container.createDiv({ cls: cardClass });

        // Card header
        if (mcl?.cardLayout) {
            const header = card.createDiv({ cls: 'mcl-card-header' });
            header.createEl('h3', { text: item.title });
        } else {
            card.createEl('h3', { text: item.title });
        }

        // Card body
        const body = card.createDiv({ cls: 'card-body' });
        body.createEl('p', { text: item.description });

        // Card footer
        const footer = card.createDiv({ cls: 'card-footer' });
        footer.createSpan({
            cls: `status status-${item.status}`,
            text: item.status
        });
        footer.createSpan({
            cls: 'value',
            text: `$${item.value}`
        });
    });
};
```

### 3. Float Panels

**Use Case**: Sidebars, help panels, contextual information

```css
.mcl-float-left {
    float: left;
    margin: 0 1rem 1rem 0;
    max-width: var(--mcl-float-max-width, 40%);
}

.mcl-float-right {
    float: right;
    margin: 0 0 1rem 1rem;
    max-width: var(--mcl-float-max-width, 40%);
}

/* Fixed width variants */
.mcl-float-small { width: 250px; }
.mcl-float-medium { width: 350px; }
.mcl-float-large { width: 450px; }

/* Floating panel with shadow */
.mcl-float-panel {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mcl-clear-float {
    clear: both;
}
```

**TypeScript Implementation**:

```typescript
const createFloatingHelpPanel = (container: HTMLElement, content: string) => {
    const mcl = this.plugin.settings.mclSettings;

    if (mcl?.floatingPanels && mcl?.enabled) {
        const panel = container.createDiv({
            cls: 'mcl-float-right mcl-float-small mcl-float-panel help-panel'
        });

        panel.createEl('h4', { text: 'Quick Help' });
        panel.createEl('p', { text: content });

        // Add close button
        const closeBtn = panel.createEl('button', {
            cls: 'close-btn',
            text: '×'
        });
        closeBtn.addEventListener('click', () => panel.remove());
    }
};
```

### 4. Wide View

**Use Case**: Reports, data tables, charts

```css
.mcl-wide-page {
    --file-line-width: 100%;
    --file-margins: 0;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 2rem;
}

.mcl-wide-table table {
    width: 100%;
    max-width: 100%;
}

.mcl-wide-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
}
```

### 5. Progress Indicators

**Use Case**: Loading states, completion tracking, budgets

```css
.mcl-progress-wrapper {
    height: 10px;
    background: var(--background-secondary);
    border-radius: 5px;
    overflow: hidden;
    position: relative;
}

.mcl-progress-fill {
    height: 100%;
    background: linear-gradient(90deg,
        var(--interactive-accent),
        var(--interactive-accent-hover));
    border-radius: 5px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

/* Shimmer animation */
.mcl-progress-fill.animated::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
    );
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* Status variants */
.mcl-progress-fill.warning {
    background: var(--text-warning);
}

.mcl-progress-fill.danger {
    background: var(--text-error);
}

.mcl-progress-fill.success {
    background: var(--text-success);
}
```

**TypeScript Implementation**:

```typescript
const createProgressBar = (
    container: HTMLElement,
    value: number,
    max: number,
    options?: {
        label?: string;
        showPercentage?: boolean;
        animated?: boolean;
        status?: 'normal' | 'warning' | 'danger' | 'success';
    }
) => {
    const mcl = this.plugin.settings.mclSettings;
    const percentage = (value / max) * 100;

    const wrapper = container.createDiv({
        cls: mcl?.enabled ? 'mcl-progress-wrapper' : 'progress-wrapper'
    });

    const fill = wrapper.createDiv({
        cls: mcl?.enabled
            ? `mcl-progress-fill ${options?.animated ? 'animated' : ''} ${options?.status || ''}`
            : 'progress-fill'
    });

    // Set width dynamically
    fill.style.width = `${Math.min(percentage, 100)}%`;

    if (options?.label || options?.showPercentage) {
        const info = container.createDiv({ cls: 'progress-info' });
        if (options.label) {
            info.createSpan({ text: options.label });
        }
        if (options.showPercentage) {
            info.createSpan({
                cls: 'progress-percentage',
                text: `${percentage.toFixed(1)}%`
            });
        }
    }

    return {
        update: (newValue: number) => {
            const newPercentage = (newValue / max) * 100;
            fill.style.width = `${Math.min(newPercentage, 100)}%`;
        }
    };
};
```

### 6. Gallery Layout

**Use Case**: Image grids, chart collections, visual dashboards

```css
.mcl-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: var(--mcl-gallery-gap, 0.5rem);
    justify-content: center;
    margin: 1rem 0;
}

.mcl-gallery-item {
    flex: 0 1 auto;
    max-width: var(--mcl-gallery-item-max-width, 300px);
    border-radius: var(--mcl-gallery-item-radius, 4px);
    overflow: hidden;
    transition: transform 0.2s;
}

.mcl-gallery-item:hover {
    transform: scale(1.05);
}

/* Masonry variant */
.mcl-gallery-masonry {
    columns: var(--mcl-gallery-columns, 3);
    column-gap: var(--mcl-gallery-gap, 0.5rem);
}

.mcl-gallery-masonry > * {
    break-inside: avoid;
    margin-bottom: var(--mcl-gallery-gap, 0.5rem);
}
```

---

## Integration Guide

### Basic Integration Steps

1. **Install Dependencies**
   ```bash
   # No external dependencies required - pure CSS solution
   ```

2. **Copy CSS Files**
   ```bash
   # Copy the MCL CSS to your plugin
   cp mcl-integration.css your-plugin/src/ui/styles/
   ```

3. **Import in Main Stylesheet**
   ```css
   /* styles.css */
   @import 'src/ui/styles/mcl-integration.css';
   ```

4. **Add Type Definitions**
   ```typescript
   // Add to your types.ts
   export interface MCLSettings {
       enabled: boolean;
       // ... settings from earlier
   }
   ```

5. **Initialize in Plugin**
   ```typescript
   async onload() {
       await this.loadSettings();
       this.applyMCLStyles();
       // ... rest of plugin init
   }
   ```

### Advanced Integration

#### Dynamic Theme Detection

```typescript
class ThemeAwareMCL {
    private isDarkMode(): boolean {
        return document.body.classList.contains('theme-dark');
    }

    applyThemeSpecificStyles() {
        const root = document.documentElement;

        if (this.isDarkMode()) {
            root.style.setProperty('--mcl-shadow-color', 'rgba(0, 0, 0, 0.5)');
            root.style.setProperty('--mcl-glow-color', 'rgba(255, 255, 255, 0.1)');
        } else {
            root.style.setProperty('--mcl-shadow-color', 'rgba(0, 0, 0, 0.1)');
            root.style.setProperty('--mcl-glow-color', 'rgba(0, 0, 0, 0.05)');
        }
    }

    constructor() {
        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    this.applyThemeSpecificStyles();
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
}
```

#### Responsive Breakpoints

```css
/* Mobile-first approach */
.mcl-responsive-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
    .mcl-responsive-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .mcl-responsive-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* Large screens */
@media (min-width: 1440px) {
    .mcl-responsive-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}
```

#### Animation System

```css
/* Base animations */
@keyframes mcl-fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes mcl-slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes mcl-scaleIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Apply with classes */
.mcl-animate-fadeIn { animation: mcl-fadeIn 0.3s ease; }
.mcl-animate-slideIn { animation: mcl-slideIn 0.3s ease; }
.mcl-animate-scaleIn { animation: mcl-scaleIn 0.3s ease; }

/* Conditional animations based on settings */
body.mcl-animations .mcl-card {
    animation: mcl-fadeIn 0.3s ease;
}

body:not(.mcl-animations) .mcl-card {
    animation: none;
}
```

---

## Advanced Techniques

### 1. Component Composition

Create reusable UI components that leverage MCL:

```typescript
class MCLDashboard {
    private plugin: YourPlugin;
    private container: HTMLElement;

    constructor(plugin: YourPlugin, container: HTMLElement) {
        this.plugin = plugin;
        this.container = container;
    }

    render() {
        const mcl = this.plugin.settings.mclSettings;

        // Create layout structure
        const layout = this.createLayout();

        // Add components
        this.addHeader(layout.header);
        this.addSidebar(layout.sidebar);
        this.addMainContent(layout.main);
        this.addFooter(layout.footer);
    }

    private createLayout() {
        const mcl = this.plugin.settings.mclSettings;

        // Clear container
        this.container.empty();

        // Apply base class
        this.container.addClass(
            mcl?.enabled ? 'dashboard mcl-enhanced' : 'dashboard'
        );

        // Create layout regions
        const header = this.container.createDiv({ cls: 'dashboard-header' });
        const body = this.container.createDiv({ cls: 'dashboard-body' });
        const sidebar = body.createDiv({ cls: 'dashboard-sidebar' });
        const main = body.createDiv({ cls: 'dashboard-main' });
        const footer = this.container.createDiv({ cls: 'dashboard-footer' });

        return { header, sidebar, main, footer };
    }

    private addHeader(container: HTMLElement) {
        const mcl = this.plugin.settings.mclSettings;

        // Logo and title
        const brand = container.createDiv({ cls: 'brand' });
        brand.createEl('h1', { text: 'Dashboard' });

        // Navigation
        const nav = container.createEl('nav', {
            cls: mcl?.enabled ? 'nav mcl-nav' : 'nav'
        });

        ['Overview', 'Reports', 'Settings'].forEach(item => {
            const link = nav.createEl('a', {
                text: item,
                cls: mcl?.enabled ? 'nav-link mcl-nav-link' : 'nav-link'
            });
        });
    }

    private addSidebar(container: HTMLElement) {
        const mcl = this.plugin.settings.mclSettings;

        if (mcl?.floatingPanels) {
            container.addClass('mcl-float-left mcl-float-medium');
        }

        // Quick stats panel
        const statsPanel = this.createStatsPanel();
        container.appendChild(statsPanel);

        // Recent activity
        const activityPanel = this.createActivityPanel();
        container.appendChild(activityPanel);
    }

    private createStatsPanel(): HTMLElement {
        const panel = createDiv({ cls: 'stats-panel mcl-card' });
        panel.createEl('h3', { text: 'Quick Stats' });

        const stats = [
            { label: 'Total Items', value: 42 },
            { label: 'Active', value: 35 },
            { label: 'Completed', value: 7 }
        ];

        const list = panel.createEl('ul', { cls: 'stats-list' });
        stats.forEach(stat => {
            const item = list.createEl('li');
            item.createSpan({ text: stat.label });
            item.createSpan({
                cls: 'stat-value',
                text: String(stat.value)
            });
        });

        return panel;
    }
}
```

### 2. State Management

Manage MCL state effectively:

```typescript
class MCLStateManager {
    private state: Map<string, any> = new Map();
    private listeners: Map<string, Function[]> = new Map();

    setState(key: string, value: any) {
        this.state.set(key, value);
        this.notifyListeners(key, value);
    }

    getState(key: string) {
        return this.state.get(key);
    }

    subscribe(key: string, callback: Function) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    private notifyListeners(key: string, value: any) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(cb => cb(value));
        }
    }
}

// Usage
const mclState = new MCLStateManager();

// Subscribe to layout changes
mclState.subscribe('layout', (layout: string) => {
    document.body.setAttribute('data-mcl-layout', layout);
});

// Change layout
mclState.setState('layout', 'cards'); // triggers update
```

### 3. Performance Optimization

```typescript
class MCLPerformance {
    private debounce(func: Function, wait: number) {
        let timeout: NodeJS.Timeout;
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    private throttle(func: Function, limit: number) {
        let inThrottle: boolean;
        return function(...args: any[]) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Optimize resize handling
    optimizeResize() {
        const handleResize = this.debounce(() => {
            this.recalculateLayout();
        }, 250);

        window.addEventListener('resize', handleResize);
    }

    // Optimize scroll handling
    optimizeScroll() {
        const handleScroll = this.throttle(() => {
            this.updateScrollPosition();
        }, 100);

        window.addEventListener('scroll', handleScroll);
    }

    // Lazy load components
    lazyLoadComponent(selector: string, callback: Function) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        document.querySelectorAll(selector).forEach(el => {
            observer.observe(el);
        });
    }
}
```

---

## Real-World Examples

### Example 1: Task Management Plugin

```typescript
// Complete implementation of a task board with MCL
class TaskBoard {
    private plugin: YourPlugin;
    private container: HTMLElement;
    private tasks: Task[] = [];

    render() {
        const mcl = this.plugin.settings.mclSettings;

        // Clear and setup container
        this.container.empty();
        this.container.addClass(
            mcl?.enabled ? 'task-board mcl-enhanced' : 'task-board'
        );

        // Create column layout for different task states
        const columns = ['To Do', 'In Progress', 'Done'];
        const boardContainer = this.container.createDiv({
            cls: mcl?.enabled ? 'board-columns mcl-multi-column' : 'board-columns'
        });

        columns.forEach(columnName => {
            const column = this.createColumn(columnName);
            boardContainer.appendChild(column);
        });
    }

    private createColumn(name: string): HTMLElement {
        const mcl = this.plugin.settings.mclSettings;
        const column = createDiv({
            cls: mcl?.enabled ? 'task-column mcl-card' : 'task-column'
        });

        // Column header
        const header = column.createDiv({
            cls: mcl?.enabled ? 'column-header mcl-card-header' : 'column-header'
        });
        header.createEl('h3', { text: name });

        const count = this.tasks.filter(t => t.status === name).length;
        header.createSpan({ cls: 'task-count', text: `${count}` });

        // Task container
        const taskContainer = column.createDiv({ cls: 'task-container' });

        // Add tasks
        this.tasks
            .filter(task => task.status === name)
            .forEach(task => {
                const taskCard = this.createTaskCard(task);
                taskContainer.appendChild(taskCard);
            });

        // Make droppable if enabled
        if (mcl?.enabled) {
            this.makeDroppable(taskContainer, name);
        }

        return column;
    }

    private createTaskCard(task: Task): HTMLElement {
        const mcl = this.plugin.settings.mclSettings;
        const card = createDiv({
            cls: mcl?.enabled ? 'task-card mcl-card mcl-animate-fadeIn' : 'task-card',
            attr: { 'data-task-id': task.id }
        });

        // Priority indicator
        const priority = card.createDiv({
            cls: `task-priority priority-${task.priority}`
        });

        // Task content
        const content = card.createDiv({ cls: 'task-content' });
        content.createEl('h4', { text: task.title });
        content.createEl('p', { text: task.description });

        // Task meta
        const meta = card.createDiv({ cls: 'task-meta' });
        meta.createSpan({ cls: 'task-date', text: task.dueDate });
        meta.createSpan({ cls: 'task-assignee', text: task.assignee });

        // Progress bar if task is in progress
        if (task.status === 'In Progress' && task.progress !== undefined) {
            const progress = this.createProgressBar(task.progress);
            card.appendChild(progress);
        }

        // Make draggable if enabled
        if (mcl?.enabled) {
            this.makeDraggable(card, task);
        }

        return card;
    }

    private createProgressBar(value: number): HTMLElement {
        const wrapper = createDiv({ cls: 'mcl-progress-wrapper' });
        const fill = wrapper.createDiv({ cls: 'mcl-progress-fill animated' });
        fill.style.width = `${value}%`;

        // Add status class based on progress
        if (value < 30) fill.addClass('danger');
        else if (value < 70) fill.addClass('warning');
        else fill.addClass('success');

        return wrapper;
    }
}
```

### Example 2: Financial Dashboard

```typescript
class FinancialDashboard {
    renderBudgetCards(budgets: Budget[], container: HTMLElement) {
        const mcl = this.plugin.settings.mclSettings;

        // Create grid container
        const gridClass = mcl?.enabled
            ? 'budget-grid mcl-list-card'
            : 'budget-grid';

        const grid = container.createDiv({ cls: gridClass });

        budgets.forEach(budget => {
            const spent = this.calculateSpent(budget.category);
            const percentage = (spent / budget.limit) * 100;

            // Create budget card
            const cardClass = mcl?.enabled
                ? 'budget-card mcl-card mcl-animate-scaleIn'
                : 'budget-card';

            const card = grid.createDiv({ cls: cardClass });

            // Header with category and percentage
            const header = card.createDiv({ cls: 'budget-header' });
            header.createSpan({
                cls: 'budget-category',
                text: budget.category
            });
            header.createSpan({
                cls: 'budget-percentage',
                text: `${percentage.toFixed(0)}%`
            });

            // Progress bar
            const progressWrapper = card.createDiv({
                cls: 'mcl-progress-wrapper'
            });
            const progressFill = progressWrapper.createDiv({
                cls: 'mcl-progress-fill animated'
            });

            // Apply status based on percentage
            if (percentage > 100) {
                progressFill.addClass('danger');
                card.addClass('over-budget');
            } else if (percentage > 80) {
                progressFill.addClass('warning');
            }

            progressFill.style.width = `${Math.min(percentage, 100)}%`;

            // Details
            const details = card.createDiv({ cls: 'budget-details' });
            details.createDiv({
                text: `Spent: ${this.formatCurrency(spent)} / ${this.formatCurrency(budget.limit)}`
            });

            const remaining = budget.limit - spent;
            const remainingEl = details.createDiv({
                cls: remaining < 0 ? 'text-danger' : 'text-muted',
                text: `Remaining: ${this.formatCurrency(Math.abs(remaining))}`
            });

            // Add hover interaction
            if (mcl?.enabled) {
                card.addEventListener('click', () => {
                    this.showBudgetDetails(budget);
                });
            }
        });
    }

    renderTransactionList(transactions: Transaction[], container: HTMLElement) {
        const mcl = this.plugin.settings.mclSettings;

        if (mcl?.cardLayout && mcl?.enabled) {
            // Render as cards
            this.renderTransactionCards(transactions, container);
        } else {
            // Render as list
            this.renderTransactionTable(transactions, container);
        }
    }

    private renderTransactionCards(transactions: Transaction[], container: HTMLElement) {
        const grid = container.createDiv({ cls: 'transaction-grid mcl-list-card' });

        transactions.forEach(tx => {
            const card = grid.createDiv({
                cls: 'transaction-card mcl-card'
            });

            // Transaction date badge
            const dateBadge = card.createDiv({ cls: 'date-badge' });
            dateBadge.createDiv({ cls: 'day', text: tx.date.format('DD') });
            dateBadge.createDiv({ cls: 'month', text: tx.date.format('MMM') });

            // Transaction info
            const info = card.createDiv({ cls: 'transaction-info' });
            info.createEl('h4', { text: tx.description });
            info.createDiv({ cls: 'category', text: tx.category });

            // Amount with color coding
            const amountClass = tx.type === 'income'
                ? 'amount income'
                : 'amount expense';

            const amount = card.createDiv({ cls: amountClass });
            amount.setText(this.formatCurrency(tx.amount));

            // Status indicator
            const status = card.createDiv({
                cls: `status status-${tx.status}`
            });
            status.setText(tx.status);
        });
    }
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Styles Not Applying

**Problem**: MCL classes are added but styles don't appear.

**Solution**:
```typescript
// Check if CSS is loaded
const checkCSSLoaded = () => {
    const testEl = document.createElement('div');
    testEl.className = 'mcl-test';
    document.body.appendChild(testEl);

    const styles = window.getComputedStyle(testEl);
    const isLoaded = styles.getPropertyValue('--mcl-test') !== '';

    document.body.removeChild(testEl);

    if (!isLoaded) {
        console.error('MCL CSS not loaded. Check import in styles.css');
    }

    return isLoaded;
};
```

#### 2. Theme Conflicts

**Problem**: MCL styles conflict with theme.

**Solution**:
```css
/* Increase specificity for MCL styles */
.theme-dark .mcl-card {
    /* Your overrides */
}

.theme-light .mcl-card {
    /* Your overrides */
}

/* Or use CSS custom properties for theme-aware styling */
.mcl-card {
    background: var(--mcl-card-bg, var(--background-primary));
}
```

#### 3. Performance Issues

**Problem**: Too many DOM manipulations causing lag.

**Solution**:
```typescript
// Use document fragment for batch operations
const fragment = document.createDocumentFragment();

items.forEach(item => {
    const element = createItemElement(item);
    fragment.appendChild(element);
});

container.appendChild(fragment); // Single DOM update
```

#### 4. Responsive Layout Breaking

**Problem**: Layout breaks on certain screen sizes.

**Solution**:
```css
/* Add container queries for better responsive behavior */
@container (max-width: 768px) {
    .mcl-list-card {
        grid-template-columns: 1fr;
    }
}

/* Fallback for browsers without container query support */
@media (max-width: 768px) {
    .mcl-list-card {
        grid-template-columns: 1fr;
    }
}
```

---

## Best Practices

### 1. Progressive Enhancement

Always provide fallbacks:

```typescript
const applyLayout = (container: HTMLElement) => {
    const mcl = this.settings.mclSettings;

    // Base functionality works without MCL
    container.addClass('base-layout');

    // Enhance if MCL is enabled
    if (mcl?.enabled) {
        container.addClass('mcl-enhanced');

        // Add MCL-specific features
        if (mcl.animations) {
            container.addClass('mcl-animations');
        }

        if (mcl.cardLayout) {
            container.removeClass('list-layout');
            container.addClass('mcl-list-card');
        }
    }
};
```

### 2. Semantic HTML

Use proper HTML elements:

```typescript
// Good
const article = container.createEl('article', { cls: 'mcl-card' });
const header = article.createEl('header', { cls: 'mcl-card-header' });
const heading = header.createEl('h2', { text: title });

// Avoid
const div1 = container.createDiv({ cls: 'mcl-card' });
const div2 = div1.createDiv({ cls: 'mcl-card-header' });
const div3 = div2.createDiv({ text: title });
```

### 3. Accessibility

Ensure keyboard navigation and screen reader support:

```typescript
const createAccessibleCard = (data: CardData): HTMLElement => {
    const card = createEl('article', {
        cls: 'mcl-card',
        attr: {
            'role': 'article',
            'aria-label': data.title,
            'tabindex': '0'
        }
    });

    // Add keyboard interaction
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleCardClick(data);
        }
    });

    return card;
};
```

### 4. Performance Monitoring

Track and optimize performance:

```typescript
class PerformanceMonitor {
    measure(name: string, fn: Function) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();

        console.debug(`MCL: ${name} took ${end - start}ms`);

        // Track slow operations
        if (end - start > 100) {
            console.warn(`MCL: Slow operation detected in ${name}`);
        }

        return result;
    }

    // Usage
    renderCards(items: any[]) {
        this.measure('renderCards', () => {
            // Rendering logic
        });
    }
}
```

### 5. Testing Strategy

```typescript
// Test MCL functionality
class MCLTester {
    runTests() {
        this.testCSSVariables();
        this.testResponsiveLayouts();
        this.testThemeCompatibility();
        this.testAccessibility();
    }

    private testCSSVariables() {
        const root = document.documentElement;
        const testValue = '999px';

        root.style.setProperty('--mcl-test-var', testValue);
        const retrieved = getComputedStyle(root)
            .getPropertyValue('--mcl-test-var');

        console.assert(
            retrieved.trim() === testValue,
            'CSS variables not working correctly'
        );

        root.style.removeProperty('--mcl-test-var');
    }

    private testResponsiveLayouts() {
        const container = createDiv({ cls: 'mcl-test-container' });
        document.body.appendChild(container);

        // Test at different viewport widths
        const widths = [320, 768, 1024, 1920];
        widths.forEach(width => {
            container.style.width = `${width}px`;
            // Verify layout adjusts correctly
        });

        document.body.removeChild(container);
    }
}
```

---

## Conclusion

The Modular CSS Layout system provides a powerful, flexible foundation for building professional Obsidian plugin interfaces. By following this guide and implementing MCL patterns thoughtfully, you can create plugins that:

- Look native to Obsidian
- Work across all themes
- Provide excellent user experience
- Maintain high performance
- Offer customization options

Remember to always prioritize user experience, accessibility, and performance when implementing MCL patterns. Start with basic patterns and progressively enhance as needed.

### Resources

- [Obsidian API Documentation](https://github.com/obsidianmd/obsidian-api)
- [Original MCL Snippets](https://github.com/efemkay/obsidian-modular-css-layout)
- [Style Settings Plugin](https://github.com/mgmeyers/obsidian-style-settings)

### Contributing

If you develop new MCL patterns or improvements, consider contributing them back to the community. The MCL system grows stronger with each contribution.

---

*Last Updated: 2024*
*Version: 1.0.0*
*License: MIT*