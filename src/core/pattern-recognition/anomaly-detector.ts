import { Transaction } from '../../types';
import { AnomalyAlert, CategoryProfile } from './types';

declare const moment: any;

interface SpendingProfile {
    category: string;
    mean: number;
    stdDev: number;
    median: number;
    percentile95: number;
    minAmount: number;
    maxAmount: number;
    typicalTimeOfDay: number[]; // Hour distribution
    typicalDayOfWeek: number[]; // Day distribution
    knownMerchants: Set<string>;
    lastUpdated: Date;
}

interface VelocityProfile {
    maxDailyTransactions: number;
    maxHourlyTransactions: number;
    maxDailyAmount: number;
    typicalDailyTransactions: number;
    typicalDailyAmount: number;
}

export class AnomalyDetector {
    private spendingProfiles: Map<string, SpendingProfile> = new Map();
    private velocityProfile: VelocityProfile;
    private recentTransactions: Transaction[] = [];
    private readonly ZSCORE_THRESHOLD = 2.5; // 2.5 standard deviations
    private readonly DUPLICATE_TIME_WINDOW = 24; // hours
    private readonly VELOCITY_TIME_WINDOW = 1; // hours
    private readonly MAX_RECENT_TRANSACTIONS = 100;

    constructor() {
        this.velocityProfile = {
            maxDailyTransactions: 20,
            maxHourlyTransactions: 5,
            maxDailyAmount: 1000,
            typicalDailyTransactions: 5,
            typicalDailyAmount: 200
        };
    }

    /**
     * Build spending profiles from historical data
     */
    public buildProfiles(transactions: Transaction[]): void {
        // Group by category
        const categoryGroups = new Map<string, Transaction[]>();

        transactions.forEach(tx => {
            if (tx.type === 'expense' && tx.status === 'paid') {
                const group = categoryGroups.get(tx.category) || [];
                group.push(tx);
                categoryGroups.set(tx.category, group);
            }
        });

        // Build profile for each category
        categoryGroups.forEach((txs, category) => {
            if (txs.length >= 5) { // Need minimum data
                this.spendingProfiles.set(category, this.buildCategoryProfile(category, txs));
            }
        });

        // Build velocity profile
        this.buildVelocityProfile(transactions);

        // Store recent transactions for duplicate detection
        this.recentTransactions = transactions
            .filter(tx => moment(tx.date).isAfter(moment().subtract(7, 'days')))
            .sort((a, b) => moment(b.date).diff(moment(a.date)))
            .slice(0, this.MAX_RECENT_TRANSACTIONS);
    }

    /**
     * Detect anomalies in a new transaction
     */
    public detectAnomalies(transaction: Transaction, allTransactions?: Transaction[]): AnomalyAlert[] {
        const alerts: AnomalyAlert[] = [];

        // Skip income transactions for most checks
        if (transaction.type === 'income') {
            // Could add specific income anomaly checks here
            return alerts;
        }

        // 1. Amount anomaly detection
        const amountAlert = this.detectAmountAnomaly(transaction);
        if (amountAlert) alerts.push(amountAlert);

        // 2. Merchant anomaly detection
        const merchantAlert = this.detectMerchantAnomaly(transaction);
        if (merchantAlert) alerts.push(merchantAlert);

        // 3. Time-based anomaly detection
        const timeAlert = this.detectTimeAnomaly(transaction);
        if (timeAlert) alerts.push(timeAlert);

        // 4. Duplicate transaction detection
        const duplicateAlert = this.detectDuplicate(transaction);
        if (duplicateAlert) alerts.push(duplicateAlert);

        // 5. Velocity anomaly detection (too many transactions)
        if (allTransactions) {
            const velocityAlert = this.detectVelocityAnomaly(transaction, allTransactions);
            if (velocityAlert) alerts.push(velocityAlert);
        }

        // 6. Category-specific anomalies
        const categoryAlert = this.detectCategorySpecificAnomaly(transaction);
        if (categoryAlert) alerts.push(categoryAlert);

        return alerts;
    }

    /**
     * Detect amount anomalies
     */
    private detectAmountAnomaly(transaction: Transaction): AnomalyAlert | null {
        const profile = this.spendingProfiles.get(transaction.category);
        if (!profile || profile.stdDev === 0) return null;

        // Calculate z-score
        const zScore = Math.abs((transaction.amount - profile.mean) / profile.stdDev);

        if (zScore > this.ZSCORE_THRESHOLD) {
            const severity = zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low';

            return {
                type: 'amount',
                severity,
                message: `Unusual amount for ${transaction.category}`,
                details: {
                    expected: profile.mean,
                    actual: transaction.amount,
                    deviation: zScore
                }
            };
        }

        // Check if amount is way above historical max
        if (transaction.amount > profile.maxAmount * 1.5) {
            return {
                type: 'amount',
                severity: 'high',
                message: `Amount exceeds historical maximum for ${transaction.category}`,
                details: {
                    expected: profile.maxAmount,
                    actual: transaction.amount,
                    deviation: (transaction.amount / profile.maxAmount)
                }
            };
        }

        return null;
    }

    /**
     * Detect merchant anomalies
     */
    private detectMerchantAnomaly(transaction: Transaction): AnomalyAlert | null {
        const profile = this.spendingProfiles.get(transaction.category);
        if (!profile) return null;

        const merchantKey = this.extractMerchantKey(transaction.description);

        // Check if this is a new merchant for this category
        if (!profile.knownMerchants.has(merchantKey)) {
            // Only alert for significant amounts
            if (transaction.amount > profile.mean * 2) {
                return {
                    type: 'merchant',
                    severity: 'medium',
                    message: `New merchant in ${transaction.category} category`,
                    details: {
                        expected: Array.from(profile.knownMerchants).slice(0, 3).join(', '),
                        actual: merchantKey
                    }
                };
            }
        }

        // Check for suspicious merchant patterns
        if (this.isSuspiciousMerchant(merchantKey, transaction.category)) {
            return {
                type: 'merchant',
                severity: 'high',
                message: 'Potentially suspicious merchant',
                details: {
                    actual: merchantKey
                }
            };
        }

        return null;
    }

    /**
     * Detect time-based anomalies
     */
    private detectTimeAnomaly(transaction: Transaction): AnomalyAlert | null {
        const profile = this.spendingProfiles.get(transaction.category);
        if (!profile) return null;

        const txMoment = moment(transaction.date);
        const hour = txMoment.hour();
        const dayOfWeek = txMoment.day();

        // Check unusual time of day
        const hourFrequency = profile.typicalTimeOfDay[hour] || 0;
        const totalHourTransactions = profile.typicalTimeOfDay.reduce((a, b) => a + b, 0);

        if (totalHourTransactions > 10 && hourFrequency === 0) {
            // Transaction at completely unusual hour
            return {
                type: 'time',
                severity: 'low',
                message: `Unusual time for ${transaction.category} transaction`,
                details: {
                    actual: `${hour}:00`
                }
            };
        }

        // Check unusual day of week for large amounts
        const dayFrequency = profile.typicalDayOfWeek[dayOfWeek] || 0;
        const totalDayTransactions = profile.typicalDayOfWeek.reduce((a, b) => a + b, 0);

        if (totalDayTransactions > 10 && dayFrequency === 0 && transaction.amount > profile.mean * 2) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return {
                type: 'time',
                severity: 'low',
                message: `Unusual day for large ${transaction.category} transaction`,
                details: {
                    actual: days[dayOfWeek]
                }
            };
        }

        return null;
    }

    /**
     * Detect duplicate transactions
     */
    private detectDuplicate(transaction: Transaction): AnomalyAlert | null {
        const txMoment = moment(transaction.date);

        for (const recent of this.recentTransactions) {
            const recentMoment = moment(recent.date);
            const hoursDiff = Math.abs(txMoment.diff(recentMoment, 'hours'));

            if (hoursDiff <= this.DUPLICATE_TIME_WINDOW) {
                // Check for exact or near match
                const amountMatch = Math.abs(transaction.amount - recent.amount) < 0.01;
                const descMatch = this.descriptionsAreSimilar(
                    transaction.description,
                    recent.description
                );

                if (amountMatch && descMatch) {
                    return {
                        type: 'duplicate',
                        severity: 'high',
                        message: 'Possible duplicate transaction detected',
                        details: {
                            expected: `Previous: ${recent.description} on ${recentMoment.format('MMM DD')}`,
                            actual: `Current: ${transaction.description}`
                        }
                    };
                }
            }
        }

        return null;
    }

    /**
     * Detect velocity anomalies (rapid spending)
     */
    private detectVelocityAnomaly(
        transaction: Transaction,
        allTransactions: Transaction[]
    ): AnomalyAlert | null {
        const now = moment(transaction.date);
        const hourAgo = moment(now).subtract(1, 'hours');
        const dayAgo = moment(now).subtract(24, 'hours');

        // Get recent transactions
        const lastHourTx = allTransactions.filter(tx =>
            moment(tx.date).isBetween(hourAgo, now) &&
            tx.type === 'expense'
        );

        const lastDayTx = allTransactions.filter(tx =>
            moment(tx.date).isBetween(dayAgo, now) &&
            tx.type === 'expense'
        );

        // Check hourly velocity
        if (lastHourTx.length > this.velocityProfile.maxHourlyTransactions) {
            return {
                type: 'frequency',
                severity: 'high',
                message: 'Unusually high transaction frequency',
                details: {
                    expected: this.velocityProfile.maxHourlyTransactions,
                    actual: lastHourTx.length
                }
            };
        }

        // Check daily amount
        const dailyTotal = lastDayTx.reduce((sum, tx) => sum + tx.amount, 0);
        if (dailyTotal > this.velocityProfile.maxDailyAmount) {
            return {
                type: 'frequency',
                severity: 'high',
                message: 'Daily spending limit exceeded',
                details: {
                    expected: this.velocityProfile.maxDailyAmount,
                    actual: dailyTotal
                }
            };
        }

        // Check for sudden burst (multiple transactions in same category)
        const sameCategoryCount = lastHourTx.filter(tx =>
            tx.category === transaction.category
        ).length;

        if (sameCategoryCount >= 3) {
            return {
                type: 'frequency',
                severity: 'medium',
                message: `Multiple ${transaction.category} transactions in short time`,
                details: {
                    actual: sameCategoryCount
                }
            };
        }

        return null;
    }

    /**
     * Detect category-specific anomalies
     */
    private detectCategorySpecificAnomaly(transaction: Transaction): AnomalyAlert | null {
        // Example: Utilities shouldn't have multiple payments per month
        if (transaction.category === 'Housing' || transaction.category === 'Utilities') {
            const monthStart = moment(transaction.date).startOf('month');
            const monthEnd = moment(transaction.date).endOf('month');

            const similarThisMonth = this.recentTransactions.filter(tx =>
                tx.category === transaction.category &&
                moment(tx.date).isBetween(monthStart, monthEnd) &&
                this.descriptionsAreSimilar(tx.description, transaction.description)
            );

            if (similarThisMonth.length > 0) {
                return {
                    type: 'frequency',
                    severity: 'medium',
                    message: `Possible duplicate ${transaction.category} payment this month`,
                    details: {
                        expected: 'One payment per month',
                        actual: `${similarThisMonth.length + 1} similar payments`
                    }
                };
            }
        }

        // Example: Entertainment spending spike on weekdays
        if (transaction.category === 'Entertainment') {
            const dayOfWeek = moment(transaction.date).day();
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && transaction.amount > 100) {
                return {
                    type: 'amount',
                    severity: 'low',
                    message: 'High entertainment spending on a weekday',
                    details: {
                        actual: transaction.amount
                    }
                };
            }
        }

        return null;
    }

    /**
     * Build a spending profile for a category
     */
    private buildCategoryProfile(category: string, transactions: Transaction[]): SpendingProfile {
        const amounts = transactions.map(tx => tx.amount).sort((a, b) => a - b);
        const mean = this.calculateMean(amounts);
        const stdDev = this.calculateStdDev(amounts, mean);
        const median = this.calculateMedian(amounts);
        const percentile95 = amounts[Math.floor(amounts.length * 0.95)] || amounts[amounts.length - 1];

        // Time distribution
        const timeOfDay = new Array(24).fill(0);
        const dayOfWeek = new Array(7).fill(0);
        const merchants = new Set<string>();

        transactions.forEach(tx => {
            const txMoment = moment(tx.date);
            timeOfDay[txMoment.hour()]++;
            dayOfWeek[txMoment.day()]++;
            merchants.add(this.extractMerchantKey(tx.description));
        });

        return {
            category,
            mean,
            stdDev,
            median,
            percentile95,
            minAmount: amounts[0],
            maxAmount: amounts[amounts.length - 1],
            typicalTimeOfDay: timeOfDay,
            typicalDayOfWeek: dayOfWeek,
            knownMerchants: merchants,
            lastUpdated: new Date()
        };
    }

    /**
     * Build velocity profile from historical data
     */
    private buildVelocityProfile(transactions: Transaction[]): void {
        // Group transactions by day
        const dailyGroups = new Map<string, Transaction[]>();

        transactions
            .filter(tx => tx.type === 'expense')
            .forEach(tx => {
                const dateKey = moment(tx.date).format('YYYY-MM-DD');
                const group = dailyGroups.get(dateKey) || [];
                group.push(tx);
                dailyGroups.set(dateKey, group);
            });

        // Calculate daily statistics
        const dailyCounts: number[] = [];
        const dailyAmounts: number[] = [];

        dailyGroups.forEach(group => {
            dailyCounts.push(group.length);
            dailyAmounts.push(group.reduce((sum, tx) => sum + tx.amount, 0));
        });

        if (dailyCounts.length > 0) {
            this.velocityProfile = {
                maxDailyTransactions: Math.max(...dailyCounts),
                maxHourlyTransactions: Math.ceil(Math.max(...dailyCounts) / 12), // Estimate
                maxDailyAmount: Math.max(...dailyAmounts),
                typicalDailyTransactions: this.calculateMean(dailyCounts),
                typicalDailyAmount: this.calculateMean(dailyAmounts)
            };
        }
    }

    /**
     * Check if merchant is suspicious for category
     */
    private isSuspiciousMerchant(merchant: string, category: string): boolean {
        const suspiciousPatterns = [
            'casino', 'gambling', 'lottery', 'betting',
            'payday', 'loan', 'advance',
            'crypto', 'bitcoin', 'binance'
        ];

        const merchantLower = merchant.toLowerCase();

        // Check for generally suspicious patterns
        for (const pattern of suspiciousPatterns) {
            if (merchantLower.includes(pattern)) {
                // Exception: crypto might be okay in Investment category
                if (pattern.includes('crypto') && category === 'Investments') {
                    return false;
                }
                return true;
            }
        }

        return false;
    }

    /**
     * Extract merchant key from description
     */
    private extractMerchantKey(description: string): string {
        return description
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .slice(0, 3)
            .join(' ')
            .trim();
    }

    /**
     * Check if descriptions are similar
     */
    private descriptionsAreSimilar(desc1: string, desc2: string): boolean {
        const key1 = this.extractMerchantKey(desc1);
        const key2 = this.extractMerchantKey(desc2);

        if (key1 === key2) return true;

        // Check word overlap
        const words1 = new Set(key1.split(' '));
        const words2 = new Set(key2.split(' '));

        let overlap = 0;
        words1.forEach(word => {
            if (words2.has(word) && word.length > 3) overlap++;
        });

        return overlap >= Math.min(words1.size, words2.size) * 0.7;
    }

    /**
     * Calculate mean of array
     */
    private calculateMean(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate standard deviation
     */
    private calculateStdDev(values: number[], mean?: number): number {
        if (values.length === 0) return 0;

        const avg = mean ?? this.calculateMean(values);
        const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
        const avgSquaredDiff = this.calculateMean(squaredDiffs);

        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Calculate median of sorted array
     */
    private calculateMedian(sortedValues: number[]): number {
        if (sortedValues.length === 0) return 0;

        const mid = Math.floor(sortedValues.length / 2);

        if (sortedValues.length % 2 === 0) {
            return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
        }

        return sortedValues[mid];
    }

    /**
     * Get statistics about anomaly detection
     */
    public getStatistics(): {
        profilesBuilt: number;
        categoriesCovered: string[];
        knownMerchants: number;
        velocityLimits: VelocityProfile;
    } {
        let totalMerchants = 0;
        this.spendingProfiles.forEach(profile => {
            totalMerchants += profile.knownMerchants.size;
        });

        return {
            profilesBuilt: this.spendingProfiles.size,
            categoriesCovered: Array.from(this.spendingProfiles.keys()),
            knownMerchants: totalMerchants,
            velocityLimits: this.velocityProfile
        };
    }
}