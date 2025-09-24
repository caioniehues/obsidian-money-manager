import { Transaction } from '../../types';
import { RecurringPattern, PredictedTransaction } from './types';

declare const moment: any;

interface TransactionGroup {
    baseDescription: string;
    transactions: Transaction[];
    amounts: number[];
    dates: Date[];
    intervals: number[];
}

export class RecurrenceDetector {
    private readonly MIN_OCCURRENCES = 2; // Minimum occurrences to consider as recurring
    private readonly INTERVAL_TOLERANCE = 0.2; // 20% tolerance for interval variation
    private readonly AMOUNT_TOLERANCE = 0.15; // 15% tolerance for amount variation
    private readonly CONFIDENCE_THRESHOLD = 0.7;

    /**
     * Detect recurring patterns from transaction history
     */
    public detectRecurringPatterns(transactions: Transaction[]): RecurringPattern[] {
        // Group transactions by similar descriptions
        const groups = this.groupTransactionsByDescription(transactions);

        // Analyze each group for recurring patterns
        const patterns: RecurringPattern[] = [];

        groups.forEach(group => {
            if (group.transactions.length >= this.MIN_OCCURRENCES) {
                const pattern = this.analyzeGroup(group);
                if (pattern && pattern.confidence >= this.CONFIDENCE_THRESHOLD) {
                    patterns.push(pattern);
                }
            }
        });

        // Sort by confidence
        patterns.sort((a, b) => b.confidence - a.confidence);

        return patterns;
    }

    /**
     * Predict upcoming recurring transactions
     */
    public predictUpcomingTransactions(
        patterns: RecurringPattern[],
        daysAhead: number = 30
    ): PredictedTransaction[] {
        const predictions: PredictedTransaction[] = [];
        const today = moment().startOf('day');
        const endDate = moment().add(daysAhead, 'days');

        patterns.forEach(pattern => {
            // Calculate next occurrences based on pattern
            const nextDates = this.calculateNextOccurrences(pattern, today.toDate(), endDate.toDate());

            nextDates.forEach(date => {
                predictions.push({
                    description: this.generateDescription(pattern),
                    amount: pattern.expectedAmount,
                    category: this.inferCategory(pattern),
                    date: date,
                    confidence: pattern.confidence,
                    isRecurring: true,
                    basedOn: `pattern_${pattern.type}_${pattern.interval}`
                });
            });
        });

        // Sort by date
        predictions.sort((a, b) => a.date.getTime() - b.date.getTime());

        return predictions;
    }

    /**
     * Check if a new transaction matches an existing recurring pattern
     */
    public matchesRecurringPattern(
        transaction: Transaction,
        patterns: RecurringPattern[]
    ): RecurringPattern | null {
        for (const pattern of patterns) {
            if (this.transactionMatchesPattern(transaction, pattern)) {
                return pattern;
            }
        }
        return null;
    }

    /**
     * Update a recurring pattern with a new occurrence
     */
    public updatePattern(
        pattern: RecurringPattern,
        transaction: Transaction
    ): RecurringPattern {
        const updatedPattern = { ...pattern };

        // Add new occurrence
        updatedPattern.occurrences.push(new Date(transaction.date));

        // Recalculate statistics
        const amounts = [...updatedPattern.occurrences.map(() => updatedPattern.expectedAmount), transaction.amount];
        updatedPattern.expectedAmount = this.calculateAverage(amounts);
        updatedPattern.amountVariance = this.calculateStandardDeviation(amounts);

        // Update next expected date
        updatedPattern.nextExpectedDate = this.calculateNextDate(updatedPattern);

        // Recalculate confidence based on consistency
        updatedPattern.confidence = this.recalculateConfidence(updatedPattern);

        return updatedPattern;
    }

    /**
     * Group transactions by similar descriptions
     */
    private groupTransactionsByDescription(transactions: Transaction[]): TransactionGroup[] {
        const groups = new Map<string, TransactionGroup>();

        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) =>
            moment(a.date).diff(moment(b.date))
        );

        sortedTransactions.forEach(transaction => {
            const baseDesc = this.normalizeDescription(transaction.description);

            // Try to find existing group
            let foundGroup = false;
            for (const [key, group] of groups.entries()) {
                if (this.descriptionsAreSimilar(baseDesc, key)) {
                    group.transactions.push(transaction);
                    group.amounts.push(transaction.amount);
                    group.dates.push(new Date(transaction.date));
                    foundGroup = true;
                    break;
                }
            }

            // Create new group if not found
            if (!foundGroup) {
                groups.set(baseDesc, {
                    baseDescription: baseDesc,
                    transactions: [transaction],
                    amounts: [transaction.amount],
                    dates: [new Date(transaction.date)],
                    intervals: []
                });
            }
        });

        // Calculate intervals for each group
        groups.forEach(group => {
            group.intervals = this.calculateIntervals(group.dates);
        });

        return Array.from(groups.values());
    }

    /**
     * Analyze a group of transactions for recurring pattern
     */
    private analyzeGroup(group: TransactionGroup): RecurringPattern | null {
        if (group.dates.length < this.MIN_OCCURRENCES) return null;

        // Calculate average interval
        const avgInterval = this.calculateAverage(group.intervals);
        if (avgInterval === 0) return null;

        // Determine pattern type
        const patternType = this.determinePatternType(avgInterval);
        if (!patternType) return null;

        // Check consistency
        const intervalConsistency = this.calculateConsistency(group.intervals, avgInterval);
        const amountConsistency = this.calculateAmountConsistency(group.amounts);

        // Calculate confidence
        const confidence = this.calculateConfidence(
            intervalConsistency,
            amountConsistency,
            group.dates.length
        );

        if (confidence < this.CONFIDENCE_THRESHOLD) return null;

        // Create recurring pattern
        return {
            type: patternType,
            interval: Math.round(avgInterval),
            expectedAmount: this.calculateAverage(group.amounts),
            amountVariance: this.calculateStandardDeviation(group.amounts),
            nextExpectedDate: this.predictNextDate(group.dates, avgInterval),
            confidence: confidence,
            occurrences: group.dates
        };
    }

    /**
     * Calculate intervals between dates (in days)
     */
    private calculateIntervals(dates: Date[]): number[] {
        const intervals: number[] = [];
        for (let i = 1; i < dates.length; i++) {
            const diff = moment(dates[i]).diff(moment(dates[i - 1]), 'days');
            intervals.push(diff);
        }
        return intervals;
    }

    /**
     * Determine pattern type based on average interval
     */
    private determinePatternType(avgInterval: number): RecurringPattern['type'] | null {
        // Allow some tolerance for each pattern type
        if (avgInterval >= 1 && avgInterval <= 2) return 'daily';
        if (avgInterval >= 6 && avgInterval <= 8) return 'weekly';
        if (avgInterval >= 13 && avgInterval <= 15) return 'biweekly';
        if (avgInterval >= 28 && avgInterval <= 32) return 'monthly';
        if (avgInterval >= 85 && avgInterval <= 95) return 'quarterly';
        if (avgInterval >= 360 && avgInterval <= 370) return 'annual';

        // Check for monthly patterns (considering month variations)
        if (avgInterval >= 25 && avgInterval <= 35) return 'monthly';

        return null;
    }

    /**
     * Calculate consistency of intervals
     */
    private calculateConsistency(intervals: number[], average: number): number {
        if (intervals.length === 0) return 0;

        let consistentCount = 0;
        intervals.forEach(interval => {
            const deviation = Math.abs(interval - average) / average;
            if (deviation <= this.INTERVAL_TOLERANCE) {
                consistentCount++;
            }
        });

        return consistentCount / intervals.length;
    }

    /**
     * Calculate amount consistency
     */
    private calculateAmountConsistency(amounts: number[]): number {
        if (amounts.length === 0) return 0;

        const avg = this.calculateAverage(amounts);
        let consistentCount = 0;

        amounts.forEach(amount => {
            const deviation = Math.abs(amount - avg) / avg;
            if (deviation <= this.AMOUNT_TOLERANCE) {
                consistentCount++;
            }
        });

        return consistentCount / amounts.length;
    }

    /**
     * Calculate overall confidence score
     */
    private calculateConfidence(
        intervalConsistency: number,
        amountConsistency: number,
        occurrences: number
    ): number {
        // Weight factors
        const intervalWeight = 0.4;
        const amountWeight = 0.3;
        const occurrenceWeight = 0.3;

        // Normalize occurrences (max value at 12 occurrences)
        const occurrenceScore = Math.min(1, occurrences / 12);

        return (
            intervalConsistency * intervalWeight +
            amountConsistency * amountWeight +
            occurrenceScore * occurrenceWeight
        );
    }

    /**
     * Predict next date based on pattern
     */
    private predictNextDate(dates: Date[], avgInterval: number): Date {
        const lastDate = dates[dates.length - 1];
        return moment(lastDate).add(Math.round(avgInterval), 'days').toDate();
    }

    /**
     * Calculate next occurrences within date range
     */
    private calculateNextOccurrences(
        pattern: RecurringPattern,
        startDate: Date,
        endDate: Date
    ): Date[] {
        const occurrences: Date[] = [];
        let currentDate = moment(pattern.nextExpectedDate);

        while (currentDate.isSameOrBefore(endDate)) {
            if (currentDate.isSameOrAfter(startDate)) {
                occurrences.push(currentDate.toDate());
            }

            // Add interval based on pattern type
            switch (pattern.type) {
                case 'daily':
                    currentDate.add(1, 'days');
                    break;
                case 'weekly':
                    currentDate.add(1, 'weeks');
                    break;
                case 'biweekly':
                    currentDate.add(2, 'weeks');
                    break;
                case 'monthly':
                    currentDate.add(1, 'months');
                    break;
                case 'quarterly':
                    currentDate.add(3, 'months');
                    break;
                case 'annual':
                    currentDate.add(1, 'years');
                    break;
            }
        }

        return occurrences;
    }

    /**
     * Check if transaction matches a pattern
     */
    private transactionMatchesPattern(
        transaction: Transaction,
        pattern: RecurringPattern
    ): boolean {
        // Check amount similarity
        const amountDeviation = Math.abs(transaction.amount - pattern.expectedAmount) / pattern.expectedAmount;
        if (amountDeviation > this.AMOUNT_TOLERANCE) return false;

        // Check date proximity to expected date
        const transDate = moment(transaction.date);
        const expectedDate = moment(pattern.nextExpectedDate);
        const daysDiff = Math.abs(transDate.diff(expectedDate, 'days'));

        // Allow 3 days tolerance for most patterns, 5 days for monthly+
        const dateTolerance = pattern.type === 'monthly' || pattern.type === 'quarterly' || pattern.type === 'annual' ? 5 : 3;

        return daysDiff <= dateTolerance;
    }

    /**
     * Calculate next expected date for a pattern
     */
    private calculateNextDate(pattern: RecurringPattern): Date {
        const lastOccurrence = pattern.occurrences[pattern.occurrences.length - 1];
        return this.predictNextDate([lastOccurrence], pattern.interval);
    }

    /**
     * Recalculate confidence after update
     */
    private recalculateConfidence(pattern: RecurringPattern): number {
        const intervals = this.calculateIntervals(pattern.occurrences);
        const amounts = pattern.occurrences.map(() => pattern.expectedAmount); // Simplified

        const intervalConsistency = this.calculateConsistency(intervals, pattern.interval);
        const amountConsistency = 1 - (pattern.amountVariance / pattern.expectedAmount);

        return this.calculateConfidence(
            intervalConsistency,
            Math.max(0, amountConsistency),
            pattern.occurrences.length
        );
    }

    /**
     * Normalize description for comparison
     */
    private normalizeDescription(description: string): string {
        return description
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\b\d{4,}\b/g, '') // Remove long numbers (IDs, references)
            .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '') // Remove dates
            .trim();
    }

    /**
     * Check if two descriptions are similar
     */
    private descriptionsAreSimilar(desc1: string, desc2: string): boolean {
        // Simple similarity check - could be enhanced with fuzzy matching
        if (desc1 === desc2) return true;

        // Check if one contains the other (for variations)
        if (desc1.includes(desc2) || desc2.includes(desc1)) return true;

        // Check word overlap
        const words1 = new Set(desc1.split(' '));
        const words2 = new Set(desc2.split(' '));

        let overlap = 0;
        words1.forEach(word => {
            if (words2.has(word) && word.length > 3) overlap++;
        });

        // Consider similar if significant word overlap
        return overlap >= Math.min(words1.size, words2.size) * 0.6;
    }

    /**
     * Generate description for predicted transaction
     */
    private generateDescription(pattern: RecurringPattern): string {
        const typeLabels = {
            'daily': 'Daily',
            'weekly': 'Weekly',
            'biweekly': 'Bi-weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'annual': 'Annual'
        };

        return `${typeLabels[pattern.type]} recurring payment`;
    }

    /**
     * Infer category from pattern (placeholder - could be enhanced)
     */
    private inferCategory(pattern: RecurringPattern): string {
        // In a real implementation, this would use the SmartCategorizer
        // or maintain category information with the pattern
        return 'Subscriptions';
    }

    /**
     * Utility: Calculate average
     */
    private calculateAverage(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Utility: Calculate standard deviation
     */
    private calculateStandardDeviation(values: number[]): number {
        if (values.length === 0) return 0;

        const avg = this.calculateAverage(values);
        const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
        const avgSquaredDiff = this.calculateAverage(squaredDiffs);

        return Math.sqrt(avgSquaredDiff);
    }
}