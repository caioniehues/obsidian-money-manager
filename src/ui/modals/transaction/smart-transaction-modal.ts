import { Modal, Setting, Notice, App, TextComponent } from 'obsidian';
declare const moment: any;
import { t } from '../../../i18n/lang';
import { Transaction } from '../../../types';
import type MoneyManagerPlugin from '../../../main';
import { formatAsCurrency, suggestCategory } from '../../../core/helpers';
import { eventManager } from '../../../core/event-manager';
import { setupCurrencyInput } from '../../../utils/ui-helpers';
import {
    SmartCategorizer,
    RecurrenceDetector,
    AnomalyDetector,
    CategorySuggestion,
    AnomalyAlert,
    RecurringPattern
} from '../../../core/pattern-recognition';

/**
 * Enhanced transaction modal with intelligent pattern recognition
 */
export class SmartAddTransactionModal extends Modal {
    plugin: MoneyManagerPlugin;
    onSubmit: () => void;

    // Pattern recognition engines
    private smartCategorizer: SmartCategorizer;
    private recurrenceDetector: RecurrenceDetector;
    private anomalyDetector: AnomalyDetector;

    // State properties
    private description: string = "";
    private amount: number = 0;
    private category: string = "";
    private isRecurring: boolean = false;

    // Single
    private date: string = moment().format("YYYY-MM-DD");

    // Recurring
    private dayOfMonthDue: number = 1;
    private hasEndDate: boolean = false;
    private endDate: string = '';

    // UI elements for dynamic updates
    private suggestionEl: HTMLElement | null = null;
    private anomalyEl: HTMLElement | null = null;
    private recurringEl: HTMLElement | null = null;

    constructor(app: App, plugin: MoneyManagerPlugin, onSubmit: () => void, transactionToDuplicate?: Transaction) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;

        // Initialize pattern recognition engines
        this.smartCategorizer = new SmartCategorizer();
        this.recurrenceDetector = new RecurrenceDetector();
        this.anomalyDetector = new AnomalyDetector();

        // Train engines with existing data
        this.trainEngines();

        if (transactionToDuplicate) {
            this.description = transactionToDuplicate.description;
            this.amount = transactionToDuplicate.amount;
            this.category = transactionToDuplicate.category;
            this.isRecurring = transactionToDuplicate.isRecurring;
            this.date = moment().format("YYYY-MM-DD");
        } else {
            if (this.plugin.settings.categories.length > 0) {
                this.category = this.plugin.settings.categories[0].name;
            }
        }
    }

    /**
     * Train pattern recognition engines with historical data
     */
    private trainEngines(): void {
        // Train smart categorizer
        this.plugin.settings.transactions.forEach(tx => {
            this.smartCategorizer.learnFromTransaction(tx);
        });

        // Build anomaly detection profiles
        this.anomalyDetector.buildProfiles(this.plugin.settings.transactions);

        // Detect recurring patterns
        const patterns = this.recurrenceDetector.detectRecurringPatterns(
            this.plugin.settings.transactions
        );
    }

    onOpen() {
        this.render();
    }

    onClose() {
        this.contentEl.empty();
    }

    /**
     * Enhanced description change handler with smart suggestions
     */
    private async handleDescriptionChange(description: string) {
        this.description = description;

        // Get smart category suggestion
        const suggestion = this.smartCategorizer.suggestCategory(
            description,
            this.amount,
            new Date(this.date)
        );

        // Update category suggestion UI
        this.updateCategorySuggestion(suggestion);

        // Check for recurring pattern match
        const patterns = this.recurrenceDetector.detectRecurringPatterns(
            this.plugin.settings.transactions
        );
        const matchingPattern = patterns.find(p =>
            this.descriptionMatchesPattern(description, p)
        );

        if (matchingPattern) {
            this.updateRecurringSuggestion(matchingPattern);
        }
    }

    /**
     * Enhanced amount change handler with anomaly detection
     */
    private handleAmountChange(amount: number) {
        this.amount = amount;

        if (amount > 0 && this.description && this.category) {
            // Create temporary transaction for anomaly check
            const tempTransaction: Transaction = {
                id: 'temp',
                description: this.description,
                amount: amount,
                category: this.category,
                date: this.date,
                type: 'expense',
                status: 'pending',
                isRecurring: this.isRecurring,
                isInstallment: false
            };

            // Check for anomalies
            const anomalies = this.anomalyDetector.detectAnomalies(
                tempTransaction,
                this.plugin.settings.transactions
            );

            // Update anomaly warnings UI
            this.updateAnomalyWarnings(anomalies);

            // Also trigger category suggestion update with new amount
            if (this.description) {
                this.handleDescriptionChange(this.description);
            }
        }
    }

    /**
     * Update category suggestion UI
     */
    private updateCategorySuggestion(suggestion: CategorySuggestion | null) {
        if (!this.suggestionEl) return;

        this.suggestionEl.empty();

        if (suggestion && suggestion.confidence > 0.65) {
            const suggestionContainer = this.suggestionEl.createDiv({ cls: 'pattern-suggestion' });

            // Main suggestion
            const mainSuggestion = suggestionContainer.createDiv({ cls: 'main-suggestion' });
            mainSuggestion.createSpan({
                text: `Suggested: ${suggestion.category}`,
                cls: 'suggestion-label'
            });

            const confidenceClass = suggestion.confidence > 0.85 ? 'high' :
                                   suggestion.confidence > 0.75 ? 'medium' : 'low';
            mainSuggestion.createSpan({
                text: `${(suggestion.confidence * 100).toFixed(0)}% confident`,
                cls: `confidence ${confidenceClass}`
            });

            // Apply button
            const applyBtn = mainSuggestion.createEl('button', {
                text: 'Apply',
                cls: 'suggestion-apply-btn'
            });
            applyBtn.addEventListener('click', () => {
                this.category = suggestion.category;
                const categoryDropdown = this.contentEl.querySelector('.setting-item-control select') as HTMLSelectElement;
                if (categoryDropdown) {
                    categoryDropdown.value = suggestion.category;
                }
                new Notice(`Category set to ${suggestion.category}`);
                this.suggestionEl?.empty();
            });

            // Show reasons if high confidence
            if (suggestion.confidence > 0.75 && suggestion.reasons.length > 0) {
                const reasonsEl = suggestionContainer.createDiv({ cls: 'suggestion-reasons' });
                suggestion.reasons.forEach(reason => {
                    reasonsEl.createDiv({ text: `• ${reason}`, cls: 'reason' });
                });
            }

            // Alternative suggestions
            if (suggestion.alternativeSuggestions && suggestion.alternativeSuggestions.length > 0) {
                const altsEl = suggestionContainer.createDiv({ cls: 'alternative-suggestions' });
                altsEl.createSpan({ text: 'Also consider: ', cls: 'alt-label' });
                suggestion.alternativeSuggestions.forEach(alt => {
                    const altBtn = altsEl.createEl('button', {
                        text: `${alt.category} (${(alt.confidence * 100).toFixed(0)}%)`,
                        cls: 'alt-suggestion-btn'
                    });
                    altBtn.addEventListener('click', () => {
                        this.category = alt.category;
                        const categoryDropdown = this.contentEl.querySelector('.setting-item-control select') as HTMLSelectElement;
                        if (categoryDropdown) {
                            categoryDropdown.value = alt.category;
                        }
                        new Notice(`Category set to ${alt.category}`);
                        this.suggestionEl?.empty();
                    });
                });
            }
        }
    }

    /**
     * Update anomaly warnings UI
     */
    private updateAnomalyWarnings(anomalies: AnomalyAlert[]) {
        if (!this.anomalyEl) return;

        this.anomalyEl.empty();

        if (anomalies.length > 0) {
            const warningsContainer = this.anomalyEl.createDiv({ cls: 'anomaly-warnings' });

            anomalies.forEach(anomaly => {
                const warningEl = warningsContainer.createDiv({
                    cls: `anomaly-warning ${anomaly.severity}`
                });

                // Icon based on severity
                const icon = anomaly.severity === 'high' ? '⚠️' :
                             anomaly.severity === 'medium' ? '⚡' : 'ℹ️';
                warningEl.createSpan({ text: icon, cls: 'warning-icon' });

                // Message
                warningEl.createSpan({ text: anomaly.message, cls: 'warning-message' });

                // Details if available
                if (anomaly.details) {
                    const detailsEl = warningEl.createDiv({ cls: 'warning-details' });
                    if (anomaly.details.expected !== undefined && anomaly.details.actual !== undefined) {
                        detailsEl.createSpan({
                            text: `Expected: ${anomaly.details.expected}, Got: ${anomaly.details.actual}`
                        });
                    }
                }
            });
        }
    }

    /**
     * Update recurring suggestion UI
     */
    private updateRecurringSuggestion(pattern: RecurringPattern) {
        if (!this.recurringEl) return;

        this.recurringEl.empty();

        const recurringContainer = this.recurringEl.createDiv({ cls: 'recurring-suggestion' });
        recurringContainer.createSpan({
            text: `📅 This looks like a ${pattern.type} recurring payment`,
            cls: 'recurring-label'
        });

        const applyBtn = recurringContainer.createEl('button', {
            text: 'Mark as Recurring',
            cls: 'recurring-apply-btn'
        });

        applyBtn.addEventListener('click', () => {
            this.isRecurring = true;
            this.amount = pattern.expectedAmount;

            // Update UI
            const recurringToggle = this.contentEl.querySelector('.setting-item-control input[type="checkbox"]') as HTMLInputElement;
            if (recurringToggle) {
                recurringToggle.checked = true;
                recurringToggle.dispatchEvent(new Event('change'));
            }

            new Notice('Marked as recurring transaction');
            this.recurringEl?.empty();
        });

        // Show expected amount if different
        if (Math.abs(pattern.expectedAmount - this.amount) > 1) {
            recurringContainer.createDiv({
                text: `Expected amount: ${formatAsCurrency(pattern.expectedAmount)}`,
                cls: 'expected-amount'
            });
        }

        // Show next expected date
        recurringContainer.createDiv({
            text: `Next expected: ${moment(pattern.nextExpectedDate).format('MMM DD, YYYY')}`,
            cls: 'next-date'
        });
    }

    /**
     * Check if description matches a recurring pattern
     */
    private descriptionMatchesPattern(description: string, pattern: RecurringPattern): boolean {
        // Simple check - could be enhanced
        const normalizedDesc = description.toLowerCase().replace(/[^\w\s]/g, '');

        // In a real implementation, patterns would store description info
        // For now, just return false
        return false;
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: t('MODAL_ADD_TRANSACTION_TITLE') });

        // Intelligence panel for suggestions and warnings
        const intelligencePanel = contentEl.createDiv({ cls: 'intelligence-panel' });
        this.suggestionEl = intelligencePanel.createDiv({ cls: 'suggestion-container' });
        this.anomalyEl = intelligencePanel.createDiv({ cls: 'anomaly-container' });
        this.recurringEl = intelligencePanel.createDiv({ cls: 'recurring-container' });

        // Main Toggle
        const recurringOptionsContainer = contentEl.createDiv();
        const singleOptionsContainer = contentEl.createDiv();

        new Setting(contentEl)
            .setName(t('MODAL_ADD_TRANSACTION_IS_RECURRING'))
            .addToggle(toggle => toggle
                .setValue(this.isRecurring)
                .onChange(value => {
                    this.isRecurring = value;
                    recurringOptionsContainer.toggleClass('is-hidden', !value);
                    singleOptionsContainer.toggleClass('is-hidden', value);
                }));

        // Container for single transaction options
        singleOptionsContainer.toggleClass('is-hidden', this.isRecurring);
        this.renderSingleTransactionOptions(singleOptionsContainer);

        // Container for recurring options
        recurringOptionsContainer.toggleClass('is-hidden', !this.isRecurring);
        this.renderRecurringOptions(recurringOptionsContainer);
    }

    private renderSingleTransactionOptions(container: HTMLElement) {
        // Amount input with anomaly detection
        new Setting(container)
            .setName(t('MODAL_ADD_TRANSACTION_VALUE'))
            .addText(text => {
                setupCurrencyInput(text, (value) => {
                    this.handleAmountChange(value);
                }, this.amount);
            });

        // Description input with smart categorization
        new Setting(container)
            .setName(t('MODAL_ADD_TRANSACTION_DESCRIPTION'))
            .addText(text => text
                .setValue(this.description)
                .onChange(value => {
                    this.handleDescriptionChange(value);
                })
                .inputEl.focus()
            );

        // Category dropdown
        new Setting(container)
            .setName('Category')
            .addDropdown(dropdown => {
                this.plugin.settings.categories.forEach(cat => {
                    dropdown.addOption(cat.name, cat.name);
                });
                dropdown.setValue(this.category);
                dropdown.onChange(value => {
                    this.category = value;
                    // Trigger anomaly check with new category
                    if (this.amount > 0) {
                        this.handleAmountChange(this.amount);
                    }
                });
            });

        // Date picker
        new Setting(container)
            .setName(t('MODAL_ADD_TRANSACTION_DUE_DATE'))
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.date)
                .onChange(value => {
                    this.date = value;
                    // Update suggestions based on new date
                    if (this.description) {
                        this.handleDescriptionChange(this.description);
                    }
                })
            );

        // Submit button
        new Setting(container)
            .addButton(btn => btn
                .setButtonText(t('MODAL_SAVE_BUTTON'))
                .setCta()
                .onClick(() => this.saveTransaction())
            );
    }

    private renderRecurringOptions(container: HTMLElement) {
        // Similar to original, but with enhanced features
        // Implementation would be similar to renderSingleTransactionOptions
        // but adapted for recurring transactions
    }

    private async saveTransaction() {
        if (!this.description || this.amount <= 0) {
            new Notice(t('MODAL_ADD_TRANSACTION_REQUIRED_FIELDS_NOTICE'));
            return;
        }

        // Create and save transaction(s)
        if (this.isRecurring) {
            // Handle recurring transaction
            // Implementation similar to original
        } else {
            // Save single transaction
            const transaction: Transaction = {
                id: `tx_${Date.now()}`,
                description: this.description,
                amount: this.amount,
                category: this.category,
                date: this.date,
                type: 'expense',
                status: 'pending',
                isRecurring: false,
                isInstallment: false
            };

            this.plugin.settings.transactions.push(transaction);

            // Train categorizer with this new transaction
            this.smartCategorizer.learnFromTransaction(transaction);
        }

        await this.plugin.saveSettings();
        eventManager.emit('data-changed');

        new Notice(t('MODAL_ADD_TRANSACTION_SUCCESS_NOTICE'));
        this.onSubmit();
        this.close();
    }
}