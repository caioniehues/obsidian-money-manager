// Pattern Recognition Types and Interfaces

export interface Pattern {
    type: 'merchant' | 'amount' | 'temporal' | 'description' | 'frequency';
    value: any;
    frequency: number;
    confidence: number;
    lastSeen: Date;
    firstSeen: Date;
}

export interface CategoryProfile {
    categoryId: string;
    categoryName: string;
    patterns: Pattern[];
    avgAmount: number;
    stdDeviation: number;
    minAmount: number;
    maxAmount: number;
    timeDistribution: TimeDistribution;
    merchantFrequency: Map<string, number>;
    dayOfWeekDistribution: number[]; // 0-6 (Sunday-Saturday)
    monthlyDistribution: number[]; // 1-31
    totalTransactions: number;
    lastUpdated: Date;
}

export interface TimeDistribution {
    morning: number;   // 6-12
    afternoon: number; // 12-18
    evening: number;   // 18-24
    night: number;     // 0-6
}

export interface MerchantProfile {
    name: string;
    aliases: string[];
    commonCategory: string;
    avgAmount: number;
    transactionCount: number;
    lastSeen: Date;
    isRecurring: boolean;
    recurringPattern?: RecurringPattern;
}

export interface RecurringPattern {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    interval: number;
    expectedAmount: number;
    amountVariance: number;
    nextExpectedDate: Date;
    confidence: number;
    occurrences: Date[];
}

export interface CategorySuggestion {
    category: string;
    confidence: number;
    reasons: string[];
    alternativeSuggestions?: Array<{
        category: string;
        confidence: number;
    }>;
}

export interface AnomalyAlert {
    type: 'amount' | 'merchant' | 'frequency' | 'duplicate' | 'time';
    severity: 'low' | 'medium' | 'high';
    message: string;
    details: {
        expected?: any;
        actual?: any;
        deviation?: number;
    };
}

export interface PredictedTransaction {
    description: string;
    amount: number;
    category: string;
    date: Date;
    confidence: number;
    isRecurring: boolean;
    basedOn?: string; // ID of pattern or recurring transaction
}

export interface CashFlowPrediction {
    date: Date;
    expectedIncome: number;
    expectedExpenses: number;
    predictedBalance: number;
    confidence: number;
    risks: string[];
}

export interface BudgetInsight {
    category: string;
    currentBudget: number;
    suggestedBudget: number;
    reason: string;
    averageSpending: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    seasonalFactors?: string[];
}

export interface PatternStorage {
    version: number;
    lastUpdated: string;
    patterns: {
        categories: Record<string, CategoryProfile>;
        merchants: Record<string, MerchantProfile>;
        recurring: RecurringPattern[];
    };
    statistics: {
        transactionsAnalyzed: number;
        categorySuggestionAccuracy: number;
        recurringDetectionAccuracy: number;
        lastTrainingDate: string;
    };
}

export interface LearningMetrics {
    totalPatternsLearned: number;
    accuracyRate: number;
    lastImprovement: Date;
    topPatterns: Pattern[];
}