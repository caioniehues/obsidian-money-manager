# Enhanced CSV Import Implementation Plan
## Money Manager Plugin - Comprehensive Technical Specification

**Document Date**: 2025-09-24 10:34:23
**Version**: 1.0
**Status**: Technical Specification - Ready for Implementation
**Estimated Timeline**: 4-5 weeks
**Risk Level**: LOW
**Priority**: HIGH

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Technical Architecture](#3-technical-architecture)
4. [Bank Template System](#4-bank-template-system)
5. [Smart Processing Pipeline](#5-smart-processing-pipeline)
6. [User Experience Design](#6-user-experience-design)
7. [Implementation Phases](#7-implementation-phases)
8. [Code Specifications](#8-code-specifications)
9. [Testing Strategy](#9-testing-strategy)
10. [Performance Considerations](#10-performance-considerations)
11. [Error Handling](#11-error-handling)
12. [Maintenance & Updates](#12-maintenance--updates)
13. [Success Metrics](#13-success-metrics)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Project Scope
Transform the current incomplete CSV import modal into a comprehensive, intelligent transaction import system that provides professional-grade banking data processing without security risks.

### 1.2 Key Deliverables
- **Smart Bank Detection**: Automatic recognition of 15+ European bank CSV formats
- **Intelligent Mapping**: Auto-detection of date, amount, and description columns
- **Advanced Processing**: Duplicate detection, category suggestion, data validation
- **Enhanced UX**: Multi-step wizard replacing basic modal interface
- **Robust Error Handling**: Comprehensive validation and recovery mechanisms

### 1.3 Success Criteria
- **Import Speed**: Process 1000+ transactions in <5 seconds
- **Accuracy**: >95% successful auto-mapping rate for supported banks
- **User Satisfaction**: Reduce import time from 30+ minutes to <2 minutes
- **Error Rate**: <1% data corruption or loss during import
- **Adoption**: 100% of users can successfully import their bank's CSV format

---

## 2. Current State Analysis

### 2.1 Existing Implementation
**File**: `src/ui/modals/import/import-csv-modal.ts` (47 lines)

**Current Capabilities**:
- Basic file selection dialog
- File content loading via `file.text()`
- Portuguese UI text (needs translation)
- No actual CSV processing

**Critical Issues**:
- No CSV parsing library integrated
- No column mapping functionality
- No transaction processing
- Incomplete implementation with placeholder comments

### 2.2 Dependencies Analysis
**Current Dependencies**: None for CSV processing
**Required Dependencies**:
```json
{
  "papaparse": "^5.4.1",        // Robust CSV parsing
  "@types/papaparse": "^5.3.7", // TypeScript definitions
  "date-fns": "^2.30.0",        // Date parsing and formatting
  "@types/date-fns": "^2.6.0"   // TypeScript definitions
}
```

### 2.3 Integration Points
**Existing Systems to Leverage**:
- `Transaction` interface in `src/types.ts`
- `suggestCategory()` function in `src/core/helpers.ts`
- `EventManager` for UI updates in `src/core/event-manager.ts`
- Settings system for template storage

---

## 3. Technical Architecture

### 3.1 Core Components Architecture

```
Enhanced CSV Import System
├── Import Wizard (UI Layer)
│   ├── FileDropZone
│   ├── BankSelector
│   ├── ColumnMapper
│   ├── PreviewTable
│   └── ImportProgress
├── Processing Engine (Service Layer)
│   ├── CSVParser
│   ├── BankDetector
│   ├── TransactionMapper
│   ├── DuplicateDetector
│   └── CategoryAssigner
├── Data Layer
│   ├── BankTemplateStore
│   ├── ImportHistoryStore
│   └── ValidationRules
└── Utilities
    ├── DateParser
    ├── AmountParser
    └── ErrorReporter
```

### 3.2 Data Flow Architecture

```
CSV File Input
    ↓
File Validation & Loading
    ↓
Bank Template Detection
    ↓
Column Mapping (Auto + Manual)
    ↓
Data Parsing & Validation
    ↓
Duplicate Detection
    ↓
Category Assignment
    ↓
Preview Generation
    ↓ (User Confirmation)
Transaction Creation
    ↓
Settings Update & Event Emit
```

### 3.3 File Structure Design

```
src/
├── services/
│   ├── csv/
│   │   ├── csv-parser.ts           // Core CSV parsing service
│   │   ├── bank-detector.ts        // Bank template detection
│   │   ├── transaction-mapper.ts   // CSV to Transaction conversion
│   │   ├── duplicate-detector.ts   // Duplicate transaction detection
│   │   ├── category-assigner.ts    // Enhanced category suggestion
│   │   └── validation-engine.ts    // Data validation and cleaning
│   └── import/
│       ├── import-service.ts       // Main import orchestration
│       └── import-history.ts       // Import tracking and rollback
├── ui/
│   ├── modals/import/
│   │   ├── import-wizard.ts        // Main import wizard modal
│   │   ├── steps/
│   │   │   ├── file-upload-step.ts
│   │   │   ├── bank-selection-step.ts
│   │   │   ├── column-mapping-step.ts
│   │   │   ├── preview-step.ts
│   │   │   └── import-progress-step.ts
│   │   └── components/
│   │       ├── preview-table.ts
│   │       ├── column-mapper.ts
│   │       └── progress-indicator.ts
│   └── components/
│       ├── file-drop-zone.ts       // Drag & drop file upload
│       └── bank-template-selector.ts
├── data/
│   ├── bank-templates/
│   │   ├── templates.ts            // All bank templates
│   │   ├── germany.ts              // German bank templates
│   │   ├── netherlands.ts          // Dutch bank templates
│   │   ├── france.ts               // French bank templates
│   │   └── generic.ts              // Generic templates
│   └── validation/
│       ├── validation-rules.ts     // Data validation rules
│       └── field-validators.ts     // Individual field validators
└── types/
    └── csv-import.ts               // Import-specific TypeScript interfaces
```

---

## 4. Bank Template System

### 4.1 Bank Template Data Structure

```typescript
interface BankTemplate {
    // Identification
    id: string;                     // Unique identifier
    bankName: string;               // Display name
    country: string;                // ISO country code
    currency: string;               // ISO currency code

    // Detection
    detectionPatterns: {
        headers: string[];          // Required column headers
        filename: string[];         // Common filename patterns
        uniqueIdentifiers: string[]; // Bank-specific indicators
    };

    // CSV Format
    format: {
        delimiter: string;          // Usually "," or ";"
        encoding: string;           // "utf-8", "iso-8859-1", etc.
        skipRows: number;           // Header rows to skip
        hasHeader: boolean;         // Whether first row is headers
    };

    // Column Mappings
    columnMappings: {
        date: ColumnMapping;
        description: ColumnMapping;
        amount: ColumnMapping;
        balance?: ColumnMapping;
        reference?: ColumnMapping;
        payee?: ColumnMapping;
        category?: ColumnMapping;
    };

    // Processing Rules
    processingRules: {
        dateFormat: string[];       // Possible date formats
        amountFormat: AmountFormat;
        negativeIndicators: string[]; // "-", "D", etc.
        ignoreRows?: RowFilter[];   // Rows to skip
        transformations?: FieldTransformation[];
    };

    // Metadata
    metadata: {
        lastUpdated: string;
        version: string;
        tested: boolean;
        notes?: string;
    };
}

interface ColumnMapping {
    columnNames: string[];          // Possible column names
    columnIndexes?: number[];       // Alternative: fixed positions
    required: boolean;              // Whether this field is mandatory
    fallbackLogic?: string;         // Custom logic if column not found
}

enum AmountFormat {
    POSITIVE_NEGATIVE = "positive_negative",  // Single column with +/-
    SEPARATE_COLUMNS = "separate_columns",    // Separate debit/credit columns
    ALWAYS_POSITIVE = "always_positive",      // Amount always positive, type in another column
    SIGNED_AMOUNT = "signed_amount"           // Negative for expenses, positive for income
}
```

### 4.2 Bank Template Database

#### 4.2.1 German Banks
```typescript
const GERMAN_BANKS: BankTemplate[] = [
    {
        id: "deutsche-bank-de",
        bankName: "Deutsche Bank",
        country: "DE",
        currency: "EUR",
        detectionPatterns: {
            headers: ["Buchungstag", "Wertstellung", "Verwendungszweck", "Betrag"],
            filename: ["umsaetze", "kontoumsaetze", "deutsche-bank"],
            uniqueIdentifiers: ["Deutsche Bank AG"]
        },
        format: {
            delimiter: ";",
            encoding: "iso-8859-1",
            skipRows: 4,
            hasHeader: true
        },
        columnMappings: {
            date: {
                columnNames: ["Buchungstag", "Datum"],
                required: true
            },
            description: {
                columnNames: ["Verwendungszweck", "Beschreibung"],
                required: true
            },
            amount: {
                columnNames: ["Betrag", "Betrag (EUR)"],
                required: true
            },
            balance: {
                columnNames: ["Saldo", "Kontostand"],
                required: false
            }
        },
        processingRules: {
            dateFormat: ["DD.MM.YYYY", "DD/MM/YYYY"],
            amountFormat: AmountFormat.SIGNED_AMOUNT,
            negativeIndicators: ["-"],
            ignoreRows: [
                { contains: "Kontostand vom" },
                { contains: "Summe Zugänge" }
            ]
        }
    },

    {
        id: "ing-de",
        bankName: "ING Deutschland",
        country: "DE",
        currency: "EUR",
        detectionPatterns: {
            headers: ["Datum", "Empfänger/Zahlungspflichtiger", "Verwendungszweck", "Betrag"],
            filename: ["ing", "umsaetze_"],
            uniqueIdentifiers: ["ING-DiBa AG"]
        },
        // ... similar structure
    },

    {
        id: "n26-de",
        bankName: "N26",
        country: "DE",
        currency: "EUR",
        detectionPatterns: {
            headers: ["Date", "Payee", "Account number", "Transaction type", "Reference", "Amount (EUR)"],
            filename: ["n26", "transactions"],
            uniqueIdentifiers: ["N26 Bank"]
        },
        format: {
            delimiter: ",",
            encoding: "utf-8",
            skipRows: 0,
            hasHeader: true
        },
        columnMappings: {
            date: {
                columnNames: ["Date"],
                required: true
            },
            description: {
                columnNames: ["Reference", "Payee"],
                required: true
            },
            amount: {
                columnNames: ["Amount (EUR)", "Amount"],
                required: true
            },
            payee: {
                columnNames: ["Payee", "Empfänger"],
                required: false
            }
        },
        processingRules: {
            dateFormat: ["YYYY-MM-DD"],
            amountFormat: AmountFormat.SIGNED_AMOUNT,
            negativeIndicators: ["-"]
        }
    }
];
```

#### 4.2.2 Dutch Banks
```typescript
const DUTCH_BANKS: BankTemplate[] = [
    {
        id: "ing-nl",
        bankName: "ING Nederland",
        country: "NL",
        currency: "EUR",
        detectionPatterns: {
            headers: ["Datum", "Naam / Omschrijving", "Rekening", "Tegenrekening", "Code", "Af Bij", "Bedrag"],
            filename: ["ing", "csv_"],
            uniqueIdentifiers: ["ING Bank N.V."]
        },
        // ... similar structure with Dutch-specific formatting
    },

    {
        id: "abn-amro-nl",
        bankName: "ABN AMRO",
        country: "NL",
        currency: "EUR",
        // ... ABN AMRO specific configuration
    },

    {
        id: "rabobank-nl",
        bankName: "Rabobank",
        country: "NL",
        currency: "EUR",
        // ... Rabobank specific configuration
    }
];
```

#### 4.2.3 Generic Templates
```typescript
const GENERIC_TEMPLATES: BankTemplate[] = [
    {
        id: "generic-european",
        bankName: "Generic European Bank",
        country: "EU",
        currency: "EUR",
        detectionPatterns: {
            headers: ["date", "description", "amount"],
            filename: ["export", "transactions", "statement"],
            uniqueIdentifiers: []
        },
        format: {
            delimiter: ",",
            encoding: "utf-8",
            skipRows: 0,
            hasHeader: true
        },
        // ... flexible mapping for common formats
    }
];
```

### 4.3 Template Detection Algorithm

```typescript
class BankDetector {
    private templates: BankTemplate[];

    detectBankTemplate(csvContent: string, filename: string): BankTemplate | null {
        const detectionResults = this.templates.map(template => ({
            template,
            score: this.calculateDetectionScore(template, csvContent, filename)
        }));

        // Sort by score and return best match if confidence > threshold
        detectionResults.sort((a, b) => b.score - a.score);
        const bestMatch = detectionResults[0];

        return bestMatch.score > 0.7 ? bestMatch.template : null;
    }

    private calculateDetectionScore(template: BankTemplate, csvContent: string, filename: string): number {
        let score = 0;

        // Filename matching (20% weight)
        const filenameScore = this.matchFilenamePatterns(template.detectionPatterns.filename, filename);
        score += filenameScore * 0.2;

        // Header matching (60% weight)
        const headerScore = this.matchHeaderPatterns(template.detectionPatterns.headers, csvContent);
        score += headerScore * 0.6;

        // Unique identifier matching (20% weight)
        const identifierScore = this.matchUniqueIdentifiers(template.detectionPatterns.uniqueIdentifiers, csvContent);
        score += identifierScore * 0.2;

        return score;
    }

    private matchHeaderPatterns(requiredHeaders: string[], csvContent: string): number {
        const lines = csvContent.split('\n');
        const firstFewLines = lines.slice(0, 10).join(' ').toLowerCase();

        const matchedHeaders = requiredHeaders.filter(header =>
            firstFewLines.includes(header.toLowerCase())
        );

        return matchedHeaders.length / requiredHeaders.length;
    }
}
```

---

## 5. Smart Processing Pipeline

### 5.1 CSV Parsing Service

```typescript
import Papa from 'papaparse';

interface CSVParseResult {
    data: string[][];
    headers: string[];
    meta: {
        linebreak: string;
        delimiter: string;
        encoding: string;
    };
    errors: Papa.ParseError[];
}

class CSVParser {
    parse(fileContent: string, template: BankTemplate): Promise<CSVParseResult> {
        return new Promise((resolve, reject) => {
            Papa.parse(fileContent, {
                delimiter: template.format.delimiter,
                skipEmptyLines: true,
                header: false, // We'll handle headers manually
                encoding: template.format.encoding,
                complete: (results) => {
                    try {
                        const processedResult = this.processParseResult(results, template);
                        resolve(processedResult);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => reject(error)
            });
        });
    }

    private processParseResult(results: Papa.ParseResult<string[]>, template: BankTemplate): CSVParseResult {
        const allRows = results.data;

        // Skip header rows as specified in template
        const dataRows = allRows.slice(template.format.skipRows);

        // Extract headers
        let headers: string[] = [];
        if (template.format.hasHeader && dataRows.length > 0) {
            headers = dataRows[0];
            dataRows.shift(); // Remove header row from data
        }

        // Filter out rows that should be ignored
        const filteredRows = this.filterIgnoredRows(dataRows, template.processingRules.ignoreRows || []);

        return {
            data: filteredRows,
            headers,
            meta: {
                linebreak: results.meta.linebreak || '\n',
                delimiter: results.meta.delimiter || template.format.delimiter,
                encoding: template.format.encoding
            },
            errors: results.errors
        };
    }

    private filterIgnoredRows(rows: string[][], ignoreRules: RowFilter[]): string[][] {
        return rows.filter(row => {
            return !ignoreRules.some(rule => {
                const rowText = row.join(' ');
                return rowText.includes(rule.contains);
            });
        });
    }
}
```

### 5.2 Transaction Mapping Service

```typescript
class TransactionMapper {
    mapCSVToTransactions(
        csvData: string[][],
        headers: string[],
        template: BankTemplate,
        userSettings: MoneyManagerSettings
    ): MappingResult {
        const transactions: Transaction[] = [];
        const errors: MappingError[] = [];

        // Determine column indexes based on template
        const columnIndexes = this.determineColumnIndexes(headers, template);

        csvData.forEach((row, index) => {
            try {
                const transaction = this.mapRowToTransaction(row, columnIndexes, template, userSettings);
                if (transaction) {
                    transactions.push(transaction);
                }
            } catch (error) {
                errors.push({
                    rowIndex: index,
                    error: error.message,
                    rowData: row
                });
            }
        });

        return { transactions, errors };
    }

    private determineColumnIndexes(headers: string[], template: BankTemplate): ColumnIndexes {
        const indexes: ColumnIndexes = {};

        // Map each required field to its column index
        Object.entries(template.columnMappings).forEach(([field, mapping]) => {
            const columnIndex = this.findColumnIndex(headers, mapping.columnNames);
            if (columnIndex === -1 && mapping.required) {
                throw new Error(`Required column not found for field: ${field}`);
            }
            if (columnIndex !== -1) {
                indexes[field] = columnIndex;
            }
        });

        return indexes;
    }

    private mapRowToTransaction(
        row: string[],
        columnIndexes: ColumnIndexes,
        template: BankTemplate,
        userSettings: MoneyManagerSettings
    ): Transaction {
        const transaction: Partial<Transaction> = {};

        // Map basic fields
        transaction.id = this.generateTransactionId();
        transaction.date = this.parseDate(row[columnIndexes.date], template.processingRules.dateFormat);
        transaction.description = this.parseDescription(row[columnIndexes.description]);
        transaction.amount = this.parseAmount(row[columnIndexes.amount], template.processingRules);

        // Determine transaction type
        transaction.type = transaction.amount > 0 ? 'income' : 'expense';
        transaction.amount = Math.abs(transaction.amount);

        // Auto-assign category
        transaction.category = this.assignCategory(transaction.description!, userSettings.categories);

        // Set default values
        transaction.status = 'paid'; // Imported transactions are typically already completed
        transaction.isRecurring = false;

        return transaction as Transaction;
    }

    private parseAmount(amountStr: string, processingRules: ProcessingRules): number {
        // Remove currency symbols and thousands separators
        let cleanAmount = amountStr
            .replace(/[€$£]/g, '') // Remove currency symbols
            .replace(/\s/g, '')     // Remove spaces
            .trim();

        // Handle different decimal separators (European vs US format)
        if (cleanAmount.includes(',') && cleanAmount.includes('.')) {
            // Format: 1.234,56 (European) or 1,234.56 (US)
            const lastComma = cleanAmount.lastIndexOf(',');
            const lastDot = cleanAmount.lastIndexOf('.');

            if (lastComma > lastDot) {
                // European format: 1.234,56
                cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
            } else {
                // US format: 1,234.56
                cleanAmount = cleanAmount.replace(/,/g, '');
            }
        } else if (cleanAmount.includes(',')) {
            // Assume comma is decimal separator
            cleanAmount = cleanAmount.replace(',', '.');
        }

        const amount = parseFloat(cleanAmount);
        if (isNaN(amount)) {
            throw new Error(`Cannot parse amount: ${amountStr}`);
        }

        return amount;
    }

    private parseDate(dateStr: string, possibleFormats: string[]): string {
        for (const format of possibleFormats) {
            try {
                const parsed = this.parseDateWithFormat(dateStr, format);
                if (parsed) {
                    return parsed.toISOString().split('T')[0]; // Return YYYY-MM-DD
                }
            } catch {
                continue; // Try next format
            }
        }
        throw new Error(`Cannot parse date: ${dateStr}`);
    }

    private assignCategory(description: string, categories: Category[]): string {
        // Use enhanced version of existing suggestCategory function
        const suggestedCategory = suggestCategory(description, categories);
        return suggestedCategory || 'Uncategorized';
    }
}
```

### 5.3 Duplicate Detection Service

```typescript
class DuplicateDetector {
    private duplicateStrategies = {
        DATE_AMOUNT: this.detectByDateAndAmount.bind(this),
        DATE_AMOUNT_DESCRIPTION: this.detectByDateAmountDescription.bind(this),
        EXACT_MATCH: this.detectByExactMatch.bind(this)
    };

    detectDuplicates(
        newTransactions: Transaction[],
        existingTransactions: Transaction[],
        strategy: DuplicateStrategy = 'DATE_AMOUNT'
    ): DuplicateDetectionResult {
        const duplicatePairs: DuplicatePair[] = [];
        const uniqueTransactions: Transaction[] = [];

        newTransactions.forEach(newTx => {
            const duplicates = this.duplicateStrategies[strategy](newTx, existingTransactions);

            if (duplicates.length > 0) {
                duplicatePairs.push({
                    newTransaction: newTx,
                    existingDuplicates: duplicates,
                    confidence: this.calculateConfidence(newTx, duplicates[0])
                });
            } else {
                uniqueTransactions.push(newTx);
            }
        });

        return {
            uniqueTransactions,
            duplicatePairs,
            summary: {
                totalNew: newTransactions.length,
                duplicatesFound: duplicatePairs.length,
                uniqueToImport: uniqueTransactions.length
            }
        };
    }

    private detectByDateAndAmount(newTx: Transaction, existing: Transaction[]): Transaction[] {
        return existing.filter(existingTx => {
            const dateMatch = existingTx.date === newTx.date;
            const amountMatch = Math.abs(existingTx.amount - newTx.amount) < 0.01; // 1 cent tolerance

            return dateMatch && amountMatch;
        });
    }

    private detectByDateAmountDescription(newTx: Transaction, existing: Transaction[]): Transaction[] {
        return existing.filter(existingTx => {
            const dateMatch = existingTx.date === newTx.date;
            const amountMatch = Math.abs(existingTx.amount - newTx.amount) < 0.01;
            const descMatch = this.calculateStringSimilarity(
                existingTx.description.toLowerCase(),
                newTx.description.toLowerCase()
            ) > 0.8;

            return dateMatch && amountMatch && descMatch;
        });
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        // Implement Levenshtein distance or similar algorithm
        // Return value between 0 and 1 where 1 is identical
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
}
```

---

## 6. User Experience Design

### 6.1 Import Wizard Flow

```typescript
enum ImportWizardStep {
    FILE_UPLOAD = "file_upload",
    BANK_SELECTION = "bank_selection",
    COLUMN_MAPPING = "column_mapping",
    DATA_PREVIEW = "data_preview",
    DUPLICATE_RESOLUTION = "duplicate_resolution",
    CATEGORY_ASSIGNMENT = "category_assignment",
    IMPORT_PROGRESS = "import_progress",
    COMPLETION_SUMMARY = "completion_summary"
}

interface WizardStepData {
    isValid: boolean;
    canSkip: boolean;
    data: any;
    errors?: string[];
}

class ImportWizard extends Modal {
    private currentStep: ImportWizardStep = ImportWizardStep.FILE_UPLOAD;
    private stepData: Map<ImportWizardStep, WizardStepData> = new Map();
    private csvFile: File | null = null;
    private selectedTemplate: BankTemplate | null = null;
    private mappedTransactions: Transaction[] = [];

    onOpen() {
        this.containerEl.addClass('csv-import-wizard');
        this.renderWizard();
    }

    private renderWizard() {
        const { contentEl } = this;
        contentEl.empty();

        // Render progress indicator
        this.renderProgressIndicator();

        // Render current step
        this.renderCurrentStep();

        // Render navigation buttons
        this.renderNavigation();
    }

    private renderProgressIndicator() {
        const progressContainer = this.contentEl.createDiv('wizard-progress');

        Object.values(ImportWizardStep).forEach((step, index) => {
            const stepEl = progressContainer.createDiv('progress-step');
            stepEl.addClass(this.getStepClass(step));
            stepEl.textContent = this.getStepLabel(step);

            if (index < Object.values(ImportWizardStep).length - 1) {
                progressContainer.createDiv('progress-connector');
            }
        });
    }
}
```

### 6.2 Step-by-Step User Interface

#### Step 1: File Upload
```typescript
class FileUploadStep {
    render(container: HTMLElement, wizard: ImportWizard) {
        container.createEl('h3', { text: 'Upload Your Bank Statement' });

        // Drag & Drop Zone
        const dropZone = container.createDiv('file-drop-zone');
        dropZone.createEl('div', {
            cls: 'drop-zone-icon',
            text: '📁'
        });
        dropZone.createEl('div', {
            cls: 'drop-zone-text',
            text: 'Drag your CSV file here or click to browse'
        });

        // File Input
        const fileInput = createEl('input', {
            type: 'file',
            attr: {
                accept: '.csv,.txt',
                multiple: false
            },
            cls: 'hidden'
        });

        // Event Handlers
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', this.handleDragOver);
        dropZone.addEventListener('drop', (e) => this.handleFileDrop(e, wizard));
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e, wizard));

        container.appendChild(fileInput);

        // File Requirements
        const requirements = container.createDiv('file-requirements');
        requirements.createEl('h4', { text: 'Supported File Formats' });
        const reqList = requirements.createEl('ul');
        reqList.createEl('li', { text: 'CSV files from European banks' });
        reqList.createEl('li', { text: 'Maximum file size: 10MB' });
        reqList.createEl('li', { text: 'UTF-8 or ISO-8859-1 encoding' });
    }

    private async handleFileDrop(event: DragEvent, wizard: ImportWizard) {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            await this.processFile(files[0], wizard);
        }
    }

    private async processFile(file: File, wizard: ImportWizard) {
        // Validate file
        if (!this.validateFile(file)) return;

        // Read file content
        const content = await file.text();

        // Store in wizard state
        wizard.setFileData(file, content);

        // Auto-advance to bank detection
        wizard.nextStep();
    }
}
```

#### Step 2: Bank Selection
```typescript
class BankSelectionStep {
    render(container: HTMLElement, wizard: ImportWizard) {
        container.createEl('h3', { text: 'Bank Detection' });

        const detectedBank = wizard.getDetectedBank();

        if (detectedBank) {
            // Show detected bank
            const detectionResult = container.createDiv('bank-detected');
            detectionResult.createEl('div', {
                cls: 'detection-icon success',
                text: '✅'
            });
            detectionResult.createEl('h4', {
                text: `Detected: ${detectedBank.bankName}`
            });
            detectionResult.createEl('p', {
                text: `${detectedBank.country} • ${detectedBank.currency}`
            });

            // Confidence indicator
            const confidence = wizard.getDetectionConfidence();
            const confidenceBar = detectionResult.createDiv('confidence-bar');
            confidenceBar.style.setProperty('--confidence', `${confidence * 100}%`);

            // Option to change selection
            const changeBtn = detectionResult.createEl('button', {
                text: 'Use Different Bank Template',
                cls: 'secondary-button'
            });
            changeBtn.addEventListener('click', () => this.showBankSelector(container, wizard));

        } else {
            // Show manual selection
            container.createEl('p', {
                text: 'Could not automatically detect your bank. Please select manually:'
            });
            this.showBankSelector(container, wizard);
        }
    }

    private showBankSelector(container: HTMLElement, wizard: ImportWizard) {
        const selector = container.createDiv('bank-selector');

        // Group banks by country
        const banksByCountry = this.groupBanksByCountry(wizard.getAvailableBanks());

        Object.entries(banksByCountry).forEach(([country, banks]) => {
            const countryGroup = selector.createDiv('country-group');
            countryGroup.createEl('h4', { text: this.getCountryName(country) });

            const bankList = countryGroup.createDiv('bank-list');
            banks.forEach(bank => {
                const bankOption = bankList.createDiv('bank-option');
                bankOption.createEl('div', {
                    cls: 'bank-name',
                    text: bank.bankName
                });
                bankOption.createEl('div', {
                    cls: 'bank-details',
                    text: `${bank.currency} • Last updated: ${bank.metadata.lastUpdated}`
                });

                bankOption.addEventListener('click', () => {
                    wizard.selectBank(bank);
                    this.highlightSelection(bankOption);
                });
            });
        });

        // Generic template option
        const genericOption = selector.createDiv('bank-option generic');
        genericOption.createEl('div', {
            cls: 'bank-name',
            text: 'Generic CSV Template'
        });
        genericOption.createEl('div', {
            cls: 'bank-details',
            text: 'For banks not listed above'
        });
    }
}
```

#### Step 3: Column Mapping
```typescript
class ColumnMappingStep {
    render(container: HTMLElement, wizard: ImportWizard) {
        container.createEl('h3', { text: 'Column Mapping' });

        const csvHeaders = wizard.getCSVHeaders();
        const template = wizard.getSelectedTemplate();
        const autoMappings = wizard.getAutoColumnMappings();

        // Show mapping interface
        const mappingContainer = container.createDiv('column-mapping-container');

        // Preview of CSV data
        this.renderCSVPreview(mappingContainer, wizard);

        // Mapping controls
        this.renderMappingControls(mappingContainer, wizard);

        // Validation status
        this.renderValidationStatus(mappingContainer, wizard);
    }

    private renderCSVPreview(container: HTMLElement, wizard: ImportWizard) {
        const previewSection = container.createDiv('csv-preview');
        previewSection.createEl('h4', { text: 'CSV Data Preview' });

        const table = previewSection.createEl('table', { cls: 'csv-preview-table' });
        const thead = table.createEl('thead');
        const tbody = table.createEl('tbody');

        // Headers
        const headerRow = thead.createEl('tr');
        wizard.getCSVHeaders().forEach(header => {
            headerRow.createEl('th', { text: header });
        });

        // Sample data rows (first 5 rows)
        const sampleData = wizard.getCSVSampleData(5);
        sampleData.forEach(row => {
            const dataRow = tbody.createEl('tr');
            row.forEach(cell => {
                dataRow.createEl('td', { text: cell || '—' });
            });
        });
    }

    private renderMappingControls(container: HTMLElement, wizard: ImportWizard) {
        const mappingSection = container.createDiv('mapping-controls');
        mappingSection.createEl('h4', { text: 'Map Columns to Transaction Fields' });

        const requiredFields = ['date', 'description', 'amount'];
        const optionalFields = ['balance', 'reference', 'payee', 'category'];

        requiredFields.forEach(field => {
            this.renderFieldMapping(mappingSection, field, true, wizard);
        });

        const optionalSection = mappingSection.createDiv('optional-fields');
        optionalSection.createEl('h5', { text: 'Optional Fields' });
        optionalFields.forEach(field => {
            this.renderFieldMapping(optionalSection, field, false, wizard);
        });
    }

    private renderFieldMapping(container: HTMLElement, field: string, required: boolean, wizard: ImportWizard) {
        const fieldContainer = container.createDiv('field-mapping');
        fieldContainer.addClass(required ? 'required' : 'optional');

        const label = fieldContainer.createEl('label', {
            text: `${this.capitalizeField(field)}${required ? ' *' : ''}`
        });

        const select = fieldContainer.createEl('select', { cls: 'column-select' });

        // Add empty option for optional fields
        if (!required) {
            select.createEl('option', {
                value: '',
                text: '— Not mapped —'
            });
        }

        // Add CSV columns as options
        wizard.getCSVHeaders().forEach((header, index) => {
            const option = select.createEl('option', {
                value: index.toString(),
                text: header
            });

            // Auto-select if mapping was detected
            const autoMapping = wizard.getAutoMapping(field);
            if (autoMapping === index) {
                option.selected = true;
            }
        });

        select.addEventListener('change', () => {
            wizard.updateColumnMapping(field, select.value ? parseInt(select.value) : null);
            this.updateValidationStatus();
        });
    }
}
```

#### Step 4: Data Preview & Validation
```typescript
class DataPreviewStep {
    render(container: HTMLElement, wizard: ImportWizard) {
        container.createEl('h3', { text: 'Import Preview' });

        // Processing status
        const processingStatus = container.createDiv('processing-status');
        const mappedTransactions = wizard.getMappedTransactions();
        const errors = wizard.getMappingErrors();

        // Summary statistics
        this.renderImportSummary(container, mappedTransactions, errors);

        // Error handling
        if (errors.length > 0) {
            this.renderErrors(container, errors, wizard);
        }

        // Transaction preview table
        this.renderTransactionPreview(container, mappedTransactions, wizard);

        // Category assignment summary
        this.renderCategoryAssignment(container, mappedTransactions);
    }

    private renderImportSummary(container: HTMLElement, transactions: Transaction[], errors: MappingError[]) {
        const summary = container.createDiv('import-summary');

        const stats = [
            { label: 'Total Transactions', value: transactions.length + errors.length, icon: '📊' },
            { label: 'Successfully Mapped', value: transactions.length, icon: '✅' },
            { label: 'Errors', value: errors.length, icon: '❌' },
            { label: 'Date Range', value: this.getDateRange(transactions), icon: '📅' }
        ];

        stats.forEach(stat => {
            const statEl = summary.createDiv('summary-stat');
            statEl.createEl('div', { cls: 'stat-icon', text: stat.icon });
            statEl.createEl('div', { cls: 'stat-value', text: stat.value.toString() });
            statEl.createEl('div', { cls: 'stat-label', text: stat.label });
        });
    }

    private renderTransactionPreview(container: HTMLElement, transactions: Transaction[], wizard: ImportWizard) {
        const previewSection = container.createDiv('transaction-preview');
        previewSection.createEl('h4', { text: `Transaction Preview (${Math.min(transactions.length, 10)} of ${transactions.length})` });

        const table = previewSection.createEl('table', { cls: 'transaction-preview-table' });
        const thead = table.createEl('thead');
        const tbody = table.createEl('tbody');

        // Table headers
        const headerRow = thead.createEl('tr');
        ['Date', 'Description', 'Amount', 'Category', 'Type'].forEach(header => {
            headerRow.createEl('th', { text: header });
        });

        // Table rows (first 10 transactions)
        transactions.slice(0, 10).forEach(transaction => {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: transaction.date });
            row.createEl('td', { text: transaction.description });
            row.createEl('td', {
                text: formatAsCurrency(transaction.amount),
                cls: transaction.type
            });
            row.createEl('td', { text: transaction.category });
            row.createEl('td', {
                text: transaction.type,
                cls: transaction.type
            });
        });

        // Show all button if there are more transactions
        if (transactions.length > 10) {
            const showAllBtn = previewSection.createEl('button', {
                text: `Show All ${transactions.length} Transactions`,
                cls: 'secondary-button'
            });
            showAllBtn.addEventListener('click', () => {
                this.renderAllTransactions(previewSection, transactions);
            });
        }
    }
}
```

---

## 7. Implementation Phases

### 7.1 Phase 1: Foundation & Core Processing (Week 1)

**Objectives**:
- Set up basic infrastructure
- Implement CSV parsing with PapaParse
- Create basic transaction mapping
- Handle European date/amount formats

**Deliverables**:
```typescript
// Core services
- CSVParser class with European format support
- TransactionMapper with date/amount parsing
- Basic BankTemplate interface and detection
- Field validation and error handling

// Dependencies added
- papaparse: ^5.4.1
- @types/papaparse: ^5.3.7
- date-fns: ^2.30.0
```

**Tasks**:
- [ ] Install and configure PapaParse dependency
- [ ] Create `src/services/csv/` directory structure
- [ ] Implement `CSVParser` class with European format handling
- [ ] Create `TransactionMapper` with robust date/amount parsing
- [ ] Implement basic field validation
- [ ] Create unit tests for core parsing functions
- [ ] Update existing import modal to use new parser

**Success Criteria**:
- Successfully parse CSV files from 3 different European banks
- Handle comma/dot decimal separators correctly
- Parse European date formats (DD/MM/YYYY, DD.MM.YYYY)
- Process 1000+ transactions in <5 seconds

### 7.2 Phase 2: Bank Template System (Week 2)

**Objectives**:
- Create comprehensive bank template database
- Implement automatic bank detection
- Support 15+ European banks
- Handle bank-specific CSV quirks

**Deliverables**:
```typescript
// Bank Templates
- German banks: Deutsche Bank, ING, N26, DKB, Commerzbank
- Dutch banks: ING, ABN AMRO, Rabobank
- French banks: BNP Paribas, Crédit Agricole
- Generic European template
- Bank detection algorithm with 95%+ accuracy
```

**Tasks**:
- [ ] Research and document CSV formats for 15+ European banks
- [ ] Create bank template database with detection patterns
- [ ] Implement `BankDetector` class with scoring algorithm
- [ ] Create country-specific template files
- [ ] Add template validation and testing
- [ ] Implement fallback to generic template
- [ ] Create bank template management interface

**Success Criteria**:
- Correctly identify 95% of CSV files from supported banks
- Handle edge cases (custom headers, multiple formats per bank)
- Graceful fallback for unsupported banks
- Easy addition of new bank templates

### 7.3 Phase 3: Enhanced Processing Features (Week 3)

**Objectives**:
- Implement duplicate detection
- Add advanced category assignment
- Create data validation and cleaning
- Handle error recovery

**Deliverables**:
```typescript
// Advanced Processing
- DuplicateDetector with multiple strategies
- Enhanced CategoryAssigner with bank-specific rules
- ValidationEngine with comprehensive checks
- Error recovery and user guidance
```

**Tasks**:
- [ ] Implement duplicate detection algorithms
- [ ] Enhance category suggestion with bank-specific merchant mappings
- [ ] Create comprehensive data validation system
- [ ] Add transaction cleaning and normalization
- [ ] Implement import rollback functionality
- [ ] Create error reporting and recovery workflows
- [ ] Add import history tracking

**Success Criteria**:
- Detect 98% of duplicate transactions
- Assign correct categories to 80% of transactions automatically
- Handle malformed data gracefully
- Provide clear error messages and recovery options

### 7.4 Phase 4: User Interface & Experience (Week 4)

**Objectives**:
- Replace basic modal with comprehensive wizard
- Add drag-and-drop file upload
- Create interactive preview and editing
- Implement progress tracking

**Deliverables**:
```typescript
// UI Components
- Multi-step ImportWizard
- Drag-and-drop FileUploadStep
- Interactive ColumnMappingStep
- Comprehensive DataPreviewStep
- Real-time ImportProgressStep
```

**Tasks**:
- [ ] Create wizard framework with step management
- [ ] Implement drag-and-drop file upload interface
- [ ] Build column mapping interface with live preview
- [ ] Create transaction preview table with editing capabilities
- [ ] Add import progress indicator with real-time updates
- [ ] Implement import summary and results display
- [ ] Add keyboard shortcuts and accessibility features
- [ ] Polish UI/UX with consistent styling

**Success Criteria**:
- Intuitive user flow with <5 clicks to complete import
- Real-time validation feedback
- Responsive interface supporting files with 10,000+ transactions
- Accessible design supporting keyboard navigation

### 7.5 Phase 5: Testing, Optimization & Documentation (Week 5)

**Objectives**:
- Comprehensive testing across European banks
- Performance optimization for large files
- Complete documentation and user guides
- Production readiness

**Deliverables**:
```typescript
// Testing & Documentation
- Unit tests with 95%+ coverage
- Integration tests with real bank CSV files
- Performance benchmarks and optimizations
- User documentation and troubleshooting guides
```

**Tasks**:
- [ ] Create comprehensive test suite with real bank CSV samples
- [ ] Performance testing with large files (10,000+ transactions)
- [ ] Cross-platform testing (Windows, Mac, Linux)
- [ ] Create user documentation with screenshots
- [ ] Add troubleshooting guide for common issues
- [ ] Implement telemetry for tracking success rates
- [ ] Final security review and validation

**Success Criteria**:
- Process 10,000 transactions in <10 seconds
- Support files up to 50MB
- Zero data loss or corruption
- User satisfaction rating >90%

---

## 8. Code Specifications

### 8.1 TypeScript Interface Definitions

```typescript
// src/types/csv-import.ts

export interface BankTemplate {
    id: string;
    bankName: string;
    country: string;
    currency: string;
    detectionPatterns: DetectionPatterns;
    format: CSVFormat;
    columnMappings: ColumnMappings;
    processingRules: ProcessingRules;
    metadata: TemplateMetadata;
}

export interface DetectionPatterns {
    headers: string[];              // Required headers for detection
    filename: string[];             // Filename patterns
    uniqueIdentifiers: string[];    // Bank-specific content patterns
}

export interface CSVFormat {
    delimiter: string;              // "," or ";" typically
    encoding: string;               // "utf-8", "iso-8859-1"
    skipRows: number;               // Rows to skip at beginning
    hasHeader: boolean;             // Whether CSV has header row
}

export interface ColumnMappings {
    date: ColumnMapping;
    description: ColumnMapping;
    amount: ColumnMapping;
    balance?: ColumnMapping;
    reference?: ColumnMapping;
    payee?: ColumnMapping;
    category?: ColumnMapping;
}

export interface ColumnMapping {
    columnNames: string[];          // Possible column names
    columnIndexes?: number[];       // Fixed column positions
    required: boolean;              // Whether field is mandatory
    fallbackLogic?: string;         // Custom mapping logic
}

export interface ProcessingRules {
    dateFormat: string[];           // Supported date formats
    amountFormat: AmountFormat;     // How amounts are formatted
    negativeIndicators: string[];   // How negative amounts are indicated
    ignoreRows?: RowFilter[];       // Rows to skip
    transformations?: FieldTransformation[];
}

export enum AmountFormat {
    POSITIVE_NEGATIVE = "positive_negative",
    SEPARATE_COLUMNS = "separate_columns",
    ALWAYS_POSITIVE = "always_positive",
    SIGNED_AMOUNT = "signed_amount"
}

export interface RowFilter {
    contains: string;               // Skip rows containing this text
    regex?: string;                 // Advanced regex matching
    columnIndex?: number;           // Apply filter to specific column
}

export interface FieldTransformation {
    field: string;                  // Field to transform
    type: 'replace' | 'format' | 'calculate';
    rule: string;                   // Transformation rule
}

export interface ImportResult {
    success: boolean;
    transactions: Transaction[];
    errors: ImportError[];
    summary: ImportSummary;
    duplicates?: DuplicateDetectionResult;
}

export interface ImportSummary {
    totalRows: number;
    successfullyMapped: number;
    errors: number;
    duplicatesFound: number;
    categoriesAssigned: number;
    dateRange: {
        from: string;
        to: string;
    };
    processingTime: number;
}

export interface DuplicateDetectionResult {
    uniqueTransactions: Transaction[];
    duplicatePairs: DuplicatePair[];
    summary: {
        totalNew: number;
        duplicatesFound: number;
        uniqueToImport: number;
    };
}

export interface DuplicatePair {
    newTransaction: Transaction;
    existingDuplicates: Transaction[];
    confidence: number;             // 0-1 confidence score
}

export type DuplicateStrategy = 'DATE_AMOUNT' | 'DATE_AMOUNT_DESCRIPTION' | 'EXACT_MATCH';

export interface ImportError {
    type: 'PARSING' | 'MAPPING' | 'VALIDATION' | 'PROCESSING';
    rowIndex: number;
    columnIndex?: number;
    field?: string;
    message: string;
    rawData?: string[];
    suggestion?: string;
}

export interface ValidationRule {
    field: string;
    type: 'required' | 'format' | 'range' | 'custom';
    rule: any;
    message: string;
}
```

### 8.2 Core Service Implementation

```typescript
// src/services/import/import-service.ts

export class ImportService {
    private csvParser: CSVParser;
    private bankDetector: BankDetector;
    private transactionMapper: TransactionMapper;
    private duplicateDetector: DuplicateDetector;
    private validationEngine: ValidationEngine;

    constructor(private plugin: MoneyManagerPlugin) {
        this.csvParser = new CSVParser();
        this.bankDetector = new BankDetector();
        this.transactionMapper = new TransactionMapper();
        this.duplicateDetector = new DuplicateDetector();
        this.validationEngine = new ValidationEngine();
    }

    async importCSV(
        fileContent: string,
        filename: string,
        userTemplate?: BankTemplate
    ): Promise<ImportResult> {
        const startTime = performance.now();

        try {
            // Step 1: Detect or use provided bank template
            const template = userTemplate ||
                this.bankDetector.detectBankTemplate(fileContent, filename) ||
                this.bankDetector.getGenericTemplate();

            // Step 2: Parse CSV content
            const parseResult = await this.csvParser.parse(fileContent, template);

            if (parseResult.errors.length > 0) {
                throw new Error(`CSV parsing failed: ${parseResult.errors[0].message}`);
            }

            // Step 3: Map CSV data to transactions
            const mappingResult = this.transactionMapper.mapCSVToTransactions(
                parseResult.data,
                parseResult.headers,
                template,
                this.plugin.settings
            );

            // Step 4: Validate mapped transactions
            const validationResult = this.validationEngine.validate(mappingResult.transactions);

            // Step 5: Detect duplicates
            const existingTransactions = this.plugin.settings.transactions;
            const duplicateResult = this.duplicateDetector.detectDuplicates(
                validationResult.validTransactions,
                existingTransactions
            );

            // Step 6: Create import result
            const processingTime = performance.now() - startTime;

            return {
                success: true,
                transactions: duplicateResult.uniqueTransactions,
                errors: [...mappingResult.errors, ...validationResult.errors],
                duplicates: duplicateResult,
                summary: {
                    totalRows: parseResult.data.length,
                    successfullyMapped: mappingResult.transactions.length,
                    errors: mappingResult.errors.length,
                    duplicatesFound: duplicateResult.duplicatePairs.length,
                    categoriesAssigned: this.countCategorizedTransactions(duplicateResult.uniqueTransactions),
                    dateRange: this.getDateRange(duplicateResult.uniqueTransactions),
                    processingTime
                }
            };

        } catch (error) {
            return {
                success: false,
                transactions: [],
                errors: [{
                    type: 'PROCESSING',
                    rowIndex: -1,
                    message: error.message,
                    suggestion: 'Please check your CSV file format and try again'
                }],
                summary: {
                    totalRows: 0,
                    successfullyMapped: 0,
                    errors: 1,
                    duplicatesFound: 0,
                    categoriesAssigned: 0,
                    dateRange: { from: '', to: '' },
                    processingTime: performance.now() - startTime
                }
            };
        }
    }

    async saveImportedTransactions(transactions: Transaction[]): Promise<void> {
        // Add transactions to settings
        this.plugin.settings.transactions.push(...transactions);

        // Save settings
        await this.plugin.saveSettings();

        // Emit events for UI updates
        eventManager.emit('transactionsUpdated', transactions);
        eventManager.emit('importCompleted', {
            count: transactions.length,
            timestamp: new Date().toISOString()
        });
    }
}
```

### 8.3 Error Handling System

```typescript
// src/services/csv/error-handler.ts

export class ImportErrorHandler {
    handleCSVParsingError(error: Papa.ParseError, rowIndex: number): ImportError {
        return {
            type: 'PARSING',
            rowIndex,
            message: `CSV parsing error: ${error.message}`,
            suggestion: this.getParsingErrorSuggestion(error.code)
        };
    }

    handleMappingError(error: Error, rowIndex: number, rowData: string[]): ImportError {
        return {
            type: 'MAPPING',
            rowIndex,
            message: error.message,
            rawData: rowData,
            suggestion: this.getMappingErrorSuggestion(error.message)
        };
    }

    handleValidationError(error: ValidationError): ImportError {
        return {
            type: 'VALIDATION',
            rowIndex: error.rowIndex,
            field: error.field,
            message: error.message,
            suggestion: error.suggestion
        };
    }

    private getParsingErrorSuggestion(errorCode: string): string {
        const suggestions = {
            'UndetectedDelimiter': 'Try using semicolon (;) as delimiter for European banks',
            'TooFewFields': 'Check if your CSV has the correct number of columns',
            'TooManyFields': 'Some rows have extra columns - this might be okay',
            'InvalidQuotes': 'Check for unescaped quotes in your CSV data'
        };

        return suggestions[errorCode] || 'Please verify your CSV file format';
    }

    private getMappingErrorSuggestion(errorMessage: string): string {
        if (errorMessage.includes('date')) {
            return 'Check date format - European banks typically use DD/MM/YYYY or DD.MM.YYYY';
        }
        if (errorMessage.includes('amount')) {
            return 'Check amount format - European banks typically use comma as decimal separator';
        }
        if (errorMessage.includes('Required column')) {
            return 'Verify that your CSV has the required columns or adjust the column mapping';
        }

        return 'Please check your data format and try again';
    }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Testing Approach

```typescript
// src/tests/services/csv-parser.test.ts

describe('CSVParser', () => {
    let csvParser: CSVParser;

    beforeEach(() => {
        csvParser = new CSVParser();
    });

    describe('European Bank Formats', () => {
        it('should parse German Deutsche Bank CSV', async () => {
            const csvContent = `
"Buchungstag";"Wertstellung";"Verwendungszweck";"Betrag (EUR)";"Saldo (EUR)"
"05.12.2023";"05.12.2023";"REWE Markt";"−25,50";"1.234,50"
"04.12.2023";"04.12.2023";"Gehalt Dezember";"2.500,00";"1.260,00"
            `.trim();

            const template = GERMAN_BANKS.find(b => b.id === 'deutsche-bank-de')!;
            const result = await csvParser.parse(csvContent, template);

            expect(result.errors).toHaveLength(0);
            expect(result.data).toHaveLength(2);
            expect(result.headers).toContain('Betrag (EUR)');
        });

        it('should handle Dutch ING CSV format', async () => {
            const csvContent = `
"Datum","Naam / Omschrijving","Rekening","Tegenrekening","Code","Af Bij","Bedrag (EUR)"
"20231205","ALBERT HEIJN","NL90INGB0001234567","","BA","Af","23,45"
"20231204","Salaris","NL90INGB0001234567","","GT","Bij","2500,00"
            `.trim();

            const template = DUTCH_BANKS.find(b => b.id === 'ing-nl')!;
            const result = await csvParser.parse(csvContent, template);

            expect(result.errors).toHaveLength(0);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('Amount Parsing', () => {
        it('should handle European decimal format (comma separator)', () => {
            const amounts = ['1.234,56', '−25,50', '2.500,00'];
            const expected = [1234.56, -25.50, 2500.00];

            amounts.forEach((amount, index) => {
                const parsed = csvParser.parseAmount(amount, { amountFormat: AmountFormat.SIGNED_AMOUNT });
                expect(parsed).toBe(expected[index]);
            });
        });

        it('should handle separate debit/credit columns', () => {
            const row = ['05.12.2023', 'Purchase', '', '25,50', ''];  // Debit column
            const template = createMockTemplate({ amountFormat: AmountFormat.SEPARATE_COLUMNS });

            const result = csvParser.parseRowAmount(row, template);
            expect(result).toBe(-25.50);
        });
    });

    describe('Date Parsing', () => {
        it('should parse European date formats', () => {
            const dates = [
                '05.12.2023',   // German format
                '05/12/2023',   // Alternative European
                '2023-12-05',   // ISO format
                '5.12.23'       // Short format
            ];

            dates.forEach(dateStr => {
                const parsed = csvParser.parseDate(dateStr, ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'D.M.YY']);
                expect(parsed).toBe('2023-12-05');
            });
        });
    });
});
```

### 9.2 Integration Testing

```typescript
// src/tests/integration/import-workflow.test.ts

describe('CSV Import Workflow Integration', () => {
    let importService: ImportService;
    let mockPlugin: jest.Mocked<MoneyManagerPlugin>;

    beforeEach(() => {
        mockPlugin = createMockPlugin();
        importService = new ImportService(mockPlugin);
    });

    describe('End-to-End Import', () => {
        it('should complete full import workflow for Deutsche Bank CSV', async () => {
            const csvContent = await readTestFile('deutsche-bank-sample.csv');
            const filename = 'deutsche-bank-umsaetze-202312.csv';

            const result = await importService.importCSV(csvContent, filename);

            expect(result.success).toBe(true);
            expect(result.transactions.length).toBeGreaterThan(0);
            expect(result.summary.successfullyMapped).toBe(result.transactions.length);
            expect(result.errors.filter(e => e.type === 'PARSING')).toHaveLength(0);
        });

        it('should detect and handle duplicate transactions', async () => {
            // Setup existing transactions
            mockPlugin.settings.transactions = [
                createMockTransaction({
                    date: '2023-12-05',
                    amount: 25.50,
                    description: 'REWE Markt'
                })
            ];

            const csvContent = createCSVWithDuplicates();
            const result = await importService.importCSV(csvContent, 'test.csv');

            expect(result.duplicates?.duplicatePairs.length).toBeGreaterThan(0);
            expect(result.duplicates?.uniqueTransactions.length).toBeLessThan(result.summary.totalRows);
        });

        it('should assign categories automatically based on merchant names', async () => {
            const csvContent = createCSVWithKnownMerchants();
            const result = await importService.importCSV(csvContent, 'test.csv');

            const categorizedCount = result.transactions.filter(t => t.category !== 'Uncategorized').length;
            expect(categorizedCount).toBeGreaterThan(result.transactions.length * 0.7); // 70% categorization rate
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed CSV gracefully', async () => {
            const malformedCSV = 'invalid,csv,format\n"unclosed quote field';
            const result = await importService.importCSV(malformedCSV, 'bad.csv');

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('PARSING');
        });

        it('should provide helpful error messages for common issues', async () => {
            const csvWithMissingAmounts = 'Date,Description,Amount\n2023-12-05,Purchase,\n';
            const result = await importService.importCSV(csvWithMissingAmounts, 'test.csv');

            expect(result.errors.some(e => e.message.includes('amount'))).toBe(true);
            expect(result.errors[0].suggestion).toContain('Check amount format');
        });
    });
});
```

### 9.3 Performance Testing

```typescript
// src/tests/performance/import-performance.test.ts

describe('Import Performance', () => {
    let importService: ImportService;

    beforeEach(() => {
        importService = new ImportService(createMockPlugin());
    });

    it('should process 1000 transactions in under 5 seconds', async () => {
        const largeCSV = generateLargeCSV(1000);

        const startTime = performance.now();
        const result = await importService.importCSV(largeCSV, 'large.csv');
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
        expect(result.success).toBe(true);
        expect(result.transactions.length).toBe(1000);
    });

    it('should handle memory efficiently with 10,000 transactions', async () => {
        const veryLargeCSV = generateLargeCSV(10000);

        const memoryBefore = process.memoryUsage().heapUsed;
        const result = await importService.importCSV(veryLargeCSV, 'very-large.csv');
        const memoryAfter = process.memoryUsage().heapUsed;

        const memoryIncrease = (memoryAfter - memoryBefore) / 1024 / 1024; // MB

        expect(memoryIncrease).toBeLessThan(50); // Should use less than 50MB additional memory
        expect(result.success).toBe(true);
    });

    it('should maintain response time with complex duplicate detection', async () => {
        const csvWithManyDuplicates = generateCSVWithDuplicates(1000, 0.3); // 30% duplicates

        const startTime = performance.now();
        const result = await importService.importCSV(csvWithManyDuplicates, 'duplicates.csv');
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds for complex duplicate detection
        expect(result.duplicates?.duplicatePairs.length).toBeGreaterThan(0);
    });
});
```

---

## 10. Performance Considerations

### 10.1 Memory Management

**Streaming Processing for Large Files**:
```typescript
class StreamingCSVParser {
    async parseInChunks(
        fileContent: string,
        template: BankTemplate,
        chunkSize: number = 1000
    ): Promise<CSVParseResult> {
        const lines = fileContent.split('\n');
        const results: string[][] = [];

        // Process in chunks to avoid memory overload
        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);
            const chunkResult = await this.parseChunk(chunk.join('\n'), template);
            results.push(...chunkResult.data);

            // Allow garbage collection between chunks
            await this.sleep(0);
        }

        return { data: results, headers: [], meta: {}, errors: [] };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

**Memory Usage Optimization**:
- Process transactions in batches of 1000
- Release intermediate results from memory
- Use streaming where possible
- Implement garbage collection hints

### 10.2 Processing Speed Optimization

**Parallel Processing**:
```typescript
class ParallelTransactionMapper {
    async mapTransactionsParallel(
        csvRows: string[][],
        template: BankTemplate,
        concurrency: number = 4
    ): Promise<Transaction[]> {
        const chunks = this.chunkArray(csvRows, Math.ceil(csvRows.length / concurrency));

        const promises = chunks.map(chunk =>
            this.mapChunk(chunk, template)
        );

        const results = await Promise.all(promises);
        return results.flat();
    }
}
```

**Caching Strategy**:
- Cache parsed bank templates
- Memoize category suggestions
- Cache duplicate detection results
- Store processing metadata

### 10.3 UI Responsiveness

**Progressive Loading**:
```typescript
class ProgressiveImportWizard {
    async processFileWithProgress(file: File): Promise<void> {
        const totalSteps = 6;
        let currentStep = 0;

        // Step 1: File reading
        this.updateProgress(++currentStep, totalSteps, 'Reading file...');
        const content = await file.text();

        // Step 2: Bank detection
        this.updateProgress(++currentStep, totalSteps, 'Detecting bank format...');
        const template = await this.detectBank(content, file.name);

        // Continue with other steps...
    }

    private updateProgress(current: number, total: number, message: string): void {
        const percentage = (current / total) * 100;
        eventManager.emit('importProgress', { percentage, message });
    }
}
```

**Non-blocking Processing**:
- Use `requestIdleCallback` for heavy computation
- Implement progressive rendering
- Show real-time feedback during processing
- Allow cancellation of long-running operations

---

## 11. Error Handling

### 11.1 Error Classification System

```typescript
enum ImportErrorLevel {
    WARNING = 'warning',    // Non-critical, import can continue
    ERROR = 'error',       // Critical, affects specific rows
    FATAL = 'fatal'        // Stops entire import process
}

interface DetailedImportError extends ImportError {
    level: ImportErrorLevel;
    recoverable: boolean;
    autoFix?: () => boolean;
    userAction?: string;
}
```

### 11.2 Recovery Mechanisms

**Auto-fix Common Issues**:
```typescript
class DataCleaningService {
    cleanTransactionData(transaction: Partial<Transaction>): { cleaned: Transaction, warnings: string[] } {
        const warnings: string[] = [];
        const cleaned = { ...transaction } as Transaction;

        // Fix common date format issues
        if (cleaned.date && !this.isValidDate(cleaned.date)) {
            const fixed = this.attemptDateFix(cleaned.date);
            if (fixed) {
                cleaned.date = fixed;
                warnings.push(`Date format corrected: ${transaction.date} → ${fixed}`);
            }
        }

        // Fix amount formatting
        if (cleaned.amount === 0 && transaction.amount) {
            const fixed = this.attemptAmountFix(transaction.amount.toString());
            if (fixed !== null) {
                cleaned.amount = fixed;
                warnings.push(`Amount format corrected`);
            }
        }

        // Clean description
        if (cleaned.description) {
            cleaned.description = this.cleanDescription(cleaned.description);
        }

        return { cleaned, warnings };
    }
}
```

### 11.3 User Guidance System

**Contextual Help**:
```typescript
class ImportGuidanceProvider {
    getGuidanceForError(error: ImportError): ImportGuidance {
        const guidance: ImportGuidance = {
            title: this.getErrorTitle(error),
            explanation: this.getErrorExplanation(error),
            solutions: this.getSolutions(error),
            examples: this.getExamples(error)
        };

        return guidance;
    }

    private getSolutions(error: ImportError): Solution[] {
        if (error.type === 'PARSING' && error.message.includes('delimiter')) {
            return [
                {
                    text: 'Try semicolon (;) as delimiter',
                    action: () => this.retryWithDelimiter(';')
                },
                {
                    text: 'Try comma (,) as delimiter',
                    action: () => this.retryWithDelimiter(',')
                }
            ];
        }

        // Add more error-specific solutions...
        return [];
    }
}
```

---

## 12. Maintenance & Updates

### 12.1 Bank Template Maintenance

**Template Version Management**:
```typescript
interface TemplateVersion {
    version: string;
    releaseDate: string;
    changes: string[];
    compatibilityNotes: string[];
}

class BankTemplateManager {
    async checkForUpdates(): Promise<TemplateUpdate[]> {
        // Check for new bank template versions
        const currentVersions = this.getCurrentVersions();
        const latestVersions = await this.fetchLatestVersions();

        return this.compareVersions(currentVersions, latestVersions);
    }

    async updateTemplate(bankId: string, newVersion: TemplateVersion): Promise<void> {
        const template = this.getTemplate(bankId);
        const backup = this.createBackup(template);

        try {
            await this.applyUpdate(template, newVersion);
            await this.validateUpdate(template);
        } catch (error) {
            await this.restoreFromBackup(backup);
            throw error;
        }
    }
}
```

### 12.2 Monitoring & Telemetry

**Success Rate Tracking**:
```typescript
interface ImportTelemetry {
    bankId: string;
    templateVersion: string;
    fileSize: number;
    transactionCount: number;
    successRate: number;
    processingTime: number;
    errorTypes: string[];
    timestamp: string;
}

class TelemetryCollector {
    recordImport(result: ImportResult, metadata: ImportMetadata): void {
        const telemetry: ImportTelemetry = {
            bankId: metadata.template.id,
            templateVersion: metadata.template.metadata.version,
            fileSize: metadata.fileSize,
            transactionCount: result.summary.totalRows,
            successRate: result.summary.successfullyMapped / result.summary.totalRows,
            processingTime: result.summary.processingTime,
            errorTypes: result.errors.map(e => e.type),
            timestamp: new Date().toISOString()
        };

        this.sendTelemetry(telemetry);
    }
}
```

### 12.3 Update Strategy

**Automated Template Updates**:
- Monthly check for template updates
- Automatic download of new bank templates
- User notification for breaking changes
- Rollback capability for failed updates

**Community Contributions**:
- Template submission system
- Validation and testing pipeline
- Version control for templates
- User feedback integration

---

## 13. Success Metrics

### 13.1 Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Import Speed | <5 seconds for 1000 transactions | Performance.now() timing |
| Memory Usage | <50MB for 10,000 transactions | Process.memoryUsage() |
| Bank Detection Accuracy | >95% for supported banks | Manual testing with samples |
| Category Assignment Rate | >80% automatic assignment | Validation against manual categorization |
| Duplicate Detection Rate | >98% accuracy | Testing with known duplicate sets |

### 13.2 User Experience Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| User Task Completion | >90% success rate | User testing sessions |
| Time to Complete Import | <2 minutes average | Time tracking in UI |
| Error Recovery Rate | >80% of errors auto-resolved | Error handling telemetry |
| User Satisfaction | >4.5/5 rating | User feedback surveys |
| Feature Adoption | >70% of users try CSV import | Usage analytics |

### 13.3 Quality Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Data Accuracy | 99.9% correct imports | Validation against source files |
| Zero Data Loss | 100% data preservation | Comprehensive testing |
| Error Rate | <1% transaction failures | Error tracking |
| Test Coverage | >95% code coverage | Automated testing reports |
| Bug Reports | <5 per month | Issue tracking |

---

## 14. Appendices

### 14.1 European Bank CSV Format Examples

#### Deutsche Bank (Germany)
```csv
"Kontoinhaber";"Kontobeschreibung";"Kontonummer";"IBAN";"Betrachtungszeitraum"
"Max Mustermann";"Girokonto";"1234567890";"DE12345678901234567890";"01.12.2023 - 31.12.2023"

"Buchungstag";"Wertstellung";"Verwendungszweck";"Betrag (EUR)";"Saldo (EUR)"
"05.12.2023";"05.12.2023";"REWE MARKT SAGT DANKE. 1234";"−25,50";"1.234,50"
"04.12.2023";"04.12.2023";"LOHN/GEHALT Firma XYZ";"2.500,00";"1.260,00"
"03.12.2023";"03.12.2023";"AMAZON.DE 123-4567890";"−89,99";"−1.240,00"
```

#### ING Netherlands
```csv
"Datum","Naam / Omschrijving","Rekening","Tegenrekening","Code","Af Bij","Bedrag (EUR)","MutatieSoort","Mededelingen"
"20231205","ALBERT HEIJN 1234 AMSTERDAM","NL90INGB0001234567","","BA","Af","23,45","Betaalautomaat","ALBERT HEIJN 1234>AMSTERDAM 05.12.23 12:34"
"20231204","J. DOE","NL90INGB0001234567","NL91ABNA0417164300","GT","Bij","500,00","Online bankieren","Bedankt voor de lunch"
```

#### N26 (Germany/Europe)
```csv
"Date","Payee","Account number","Transaction type","Payment reference","Category","Amount (EUR)","Amount (Foreign Currency)","Type Foreign Currency","Exchange Rate"
"2023-12-05","Rewe","DE123456789","MasterCard Payment","REWE MARKT","Groceries","-25.50","","","1.0"
"2023-12-04","Company XYZ","DE123456789","Direct Debit","Salary December 2023","Income","2500.00","","","1.0"
```

### 14.2 Implementation Checklist

**Phase 1 Checklist**:
- [ ] Add PapaParse dependency to package.json
- [ ] Create service directory structure
- [ ] Implement CSVParser class
- [ ] Add European date format parsing
- [ ] Add European amount format parsing
- [ ] Create basic TransactionMapper
- [ ] Add validation for required fields
- [ ] Update existing import modal
- [ ] Create unit tests for core functions
- [ ] Test with 3 different bank formats

**Phase 2 Checklist**:
- [ ] Research 15+ European bank CSV formats
- [ ] Create BankTemplate interface
- [ ] Implement BankDetector with scoring
- [ ] Create German bank templates (5 banks)
- [ ] Create Dutch bank templates (3 banks)
- [ ] Create French bank templates (2 banks)
- [ ] Create generic European template
- [ ] Add template validation
- [ ] Create template management system
- [ ] Test detection accuracy with real files

**Phase 3 Checklist**:
- [ ] Implement DuplicateDetector class
- [ ] Add multiple duplicate detection strategies
- [ ] Enhance CategoryAssigner with merchant mappings
- [ ] Create ValidationEngine with comprehensive checks
- [ ] Add data cleaning and normalization
- [ ] Implement import rollback functionality
- [ ] Create error reporting system
- [ ] Add import history tracking
- [ ] Test error recovery scenarios
- [ ] Validate duplicate detection accuracy

**Phase 4 Checklist**:
- [ ] Create ImportWizard modal framework
- [ ] Implement FileUploadStep with drag-and-drop
- [ ] Create BankSelectionStep with auto-detection
- [ ] Build ColumnMappingStep with live preview
- [ ] Implement DataPreviewStep with editing
- [ ] Add DuplicateResolutionStep
- [ ] Create ImportProgressStep with real-time updates
- [ ] Add CompletionSummaryStep
- [ ] Implement wizard navigation
- [ ] Add keyboard shortcuts and accessibility
- [ ] Polish UI with consistent styling
- [ ] Test user workflow end-to-end

**Phase 5 Checklist**:
- [ ] Create comprehensive test suite
- [ ] Add integration tests with real bank files
- [ ] Performance testing with large files
- [ ] Cross-platform compatibility testing
- [ ] Security review and validation
- [ ] Create user documentation
- [ ] Add troubleshooting guide
- [ ] Implement telemetry collection
- [ ] Final UI/UX polish
- [ ] Prepare for production release

### 14.3 Risk Mitigation Strategies

**Technical Risks**:
- **Bank Format Changes**: Implement version-controlled templates with update mechanisms
- **Performance Issues**: Use streaming and chunked processing for large files
- **Memory Problems**: Implement garbage collection hints and memory monitoring
- **Cross-platform Issues**: Extensive testing on Windows, Mac, Linux

**User Experience Risks**:
- **Complex Interface**: Progressive disclosure and contextual help
- **User Errors**: Comprehensive validation and auto-correction
- **Learning Curve**: Interactive onboarding and documentation

**Data Integrity Risks**:
- **Data Loss**: Implement comprehensive backup and rollback mechanisms
- **Corruption**: Multiple validation layers and checksums
- **Privacy**: Local processing only, no external data transmission

---

**Document Status**: Complete Technical Specification
**Next Action**: Begin Phase 1 Implementation
**Expected Completion**: 5 weeks from start date
**Success Probability**: HIGH (Low risk, well-defined scope)

---

*This comprehensive plan provides a complete roadmap for implementing Enhanced CSV Import functionality that will transform the Money Manager plugin's import capabilities while maintaining security and usability.*