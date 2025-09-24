import { Transaction } from '../../types';
import {
    Pattern,
    CategoryProfile,
    CategorySuggestion,
    MerchantProfile,
    TimeDistribution
} from './types';

declare const moment: any;

export class SmartCategorizer {
    private categoryProfiles: Map<string, CategoryProfile> = new Map();
    private merchantProfiles: Map<string, MerchantProfile> = new Map();
    private readonly MIN_CONFIDENCE_THRESHOLD = 0.65;
    private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;

    constructor(existingProfiles?: { categories: Map<string, CategoryProfile>, merchants: Map<string, MerchantProfile> }) {
        if (existingProfiles) {
            this.categoryProfiles = existingProfiles.categories;
            this.merchantProfiles = existingProfiles.merchants;
        }
    }

    /**
     * Learn from a categorized transaction to improve future suggestions
     */
    public learnFromTransaction(transaction: Transaction): void {
        if (!transaction.category || transaction.type !== 'expense') return;

        // Extract patterns from the transaction
        const patterns = this.extractPatterns(transaction);

        // Update category profile
        this.updateCategoryProfile(transaction.category, transaction, patterns);

        // Update merchant profile
        this.updateMerchantProfile(transaction.description, transaction.category, transaction.amount);
    }

    /**
     * Suggest a category for a new transaction based on learned patterns
     */
    public suggestCategory(description: string, amount: number, date?: Date): CategorySuggestion | null {
        const suggestions: Array<{ category: string; score: number; reasons: string[] }> = [];

        // Check merchant profile first (highest confidence)
        const merchantMatch = this.findMerchantMatch(description);
        if (merchantMatch) {
            suggestions.push({
                category: merchantMatch.commonCategory,
                score: 0.9,
                reasons: [`Known merchant: ${merchantMatch.name}`]
            });
        }

        // Check each category profile for pattern matches
        this.categoryProfiles.forEach((profile, categoryName) => {
            const score = this.calculateCategoryScore(description, amount, date, profile);
            if (score.totalScore > this.MIN_CONFIDENCE_THRESHOLD) {
                suggestions.push({
                    category: categoryName,
                    score: score.totalScore,
                    reasons: score.reasons
                });
            }
        });

        // Sort by score and return top suggestion
        suggestions.sort((a, b) => b.score - a.score);

        if (suggestions.length === 0) {
            return null;
        }

        const topSuggestion = suggestions[0];
        const alternatives = suggestions.slice(1, 4).map(s => ({
            category: s.category,
            confidence: s.score
        }));

        return {
            category: topSuggestion.category,
            confidence: topSuggestion.score,
            reasons: topSuggestion.reasons,
            alternativeSuggestions: alternatives.length > 0 ? alternatives : undefined
        };
    }

    /**
     * Extract patterns from a transaction
     */
    private extractPatterns(transaction: Transaction): Pattern[] {
        const patterns: Pattern[] = [];
        const now = new Date();

        // Description patterns
        const descWords = this.tokenizeDescription(transaction.description);
        descWords.forEach(word => {
            patterns.push({
                type: 'description',
                value: word.toLowerCase(),
                frequency: 1,
                confidence: 0.7,
                lastSeen: now,
                firstSeen: now
            });
        });

        // Amount patterns
        const amountRange = this.getAmountRange(transaction.amount);
        patterns.push({
            type: 'amount',
            value: amountRange,
            frequency: 1,
            confidence: 0.6,
            lastSeen: now,
            firstSeen: now
        });

        // Temporal patterns
        const transactionDate = moment(transaction.date);
        patterns.push({
            type: 'temporal',
            value: {
                dayOfWeek: transactionDate.day(),
                dayOfMonth: transactionDate.date(),
                hour: transactionDate.hour()
            },
            frequency: 1,
            confidence: 0.5,
            lastSeen: now,
            firstSeen: now
        });

        return patterns;
    }

    /**
     * Update category profile with new transaction data
     */
    private updateCategoryProfile(category: string, transaction: Transaction, patterns: Pattern[]): void {
        let profile = this.categoryProfiles.get(category);

        if (!profile) {
            // Create new profile
            profile = this.createEmptyCategoryProfile(category);
            this.categoryProfiles.set(category, profile);
        }

        // Update statistics
        profile.totalTransactions++;
        profile.lastUpdated = new Date();

        // Update amount statistics
        const oldAvg = profile.avgAmount;
        profile.avgAmount = (oldAvg * (profile.totalTransactions - 1) + transaction.amount) / profile.totalTransactions;
        profile.minAmount = Math.min(profile.minAmount, transaction.amount);
        profile.maxAmount = Math.max(profile.maxAmount, transaction.amount);

        // Update standard deviation
        const diff = transaction.amount - profile.avgAmount;
        profile.stdDeviation = Math.sqrt(
            ((profile.stdDeviation * profile.stdDeviation * (profile.totalTransactions - 1)) + (diff * diff)) /
            profile.totalTransactions
        );

        // Update time distribution
        const hour = moment(transaction.date).hour();
        if (hour >= 6 && hour < 12) profile.timeDistribution.morning++;
        else if (hour >= 12 && hour < 18) profile.timeDistribution.afternoon++;
        else if (hour >= 18 && hour < 24) profile.timeDistribution.evening++;
        else profile.timeDistribution.night++;

        // Update day of week distribution
        const dayOfWeek = moment(transaction.date).day();
        profile.dayOfWeekDistribution[dayOfWeek]++;

        // Update monthly distribution
        const dayOfMonth = moment(transaction.date).date() - 1;
        if (dayOfMonth < 31) {
            profile.monthlyDistribution[dayOfMonth]++;
        }

        // Update merchant frequency
        const merchantKey = this.extractMerchantKey(transaction.description);
        const currentFreq = profile.merchantFrequency.get(merchantKey) || 0;
        profile.merchantFrequency.set(merchantKey, currentFreq + 1);

        // Merge new patterns with existing ones
        patterns.forEach(newPattern => {
            const existing = profile!.patterns.find(p =>
                p.type === newPattern.type &&
                JSON.stringify(p.value) === JSON.stringify(newPattern.value)
            );

            if (existing) {
                existing.frequency++;
                existing.lastSeen = new Date();
                existing.confidence = Math.min(0.95, existing.confidence + 0.02); // Increase confidence
            } else {
                profile!.patterns.push(newPattern);
            }
        });

        // Prune old patterns (older than 6 months with low frequency)
        const sixMonthsAgo = moment().subtract(6, 'months').toDate();
        profile.patterns = profile.patterns.filter(p =>
            p.frequency > 2 || p.lastSeen > sixMonthsAgo
        );
    }

    /**
     * Update merchant profile
     */
    private updateMerchantProfile(description: string, category: string, amount: number): void {
        const merchantKey = this.extractMerchantKey(description);
        let profile = this.merchantProfiles.get(merchantKey);

        if (!profile) {
            profile = {
                name: merchantKey,
                aliases: [description],
                commonCategory: category,
                avgAmount: amount,
                transactionCount: 1,
                lastSeen: new Date(),
                isRecurring: false
            };
            this.merchantProfiles.set(merchantKey, profile);
        } else {
            // Update existing profile
            profile.transactionCount++;
            profile.avgAmount = (profile.avgAmount * (profile.transactionCount - 1) + amount) / profile.transactionCount;
            profile.lastSeen = new Date();

            // Add new alias if different
            if (!profile.aliases.includes(description)) {
                profile.aliases.push(description);
            }

            // Update most common category (simplified - could be improved)
            if (category === profile.commonCategory) {
                // Reinforce current category
            } else {
                // Could track category frequency and update if new one becomes more common
            }
        }
    }

    /**
     * Calculate score for a category based on patterns
     */
    private calculateCategoryScore(
        description: string,
        amount: number,
        date: Date | undefined,
        profile: CategoryProfile
    ): { totalScore: number; reasons: string[] } {
        let score = 0;
        const reasons: string[] = [];
        const weights = {
            merchant: 0.4,
            amount: 0.3,
            description: 0.2,
            temporal: 0.1
        };

        // Merchant match
        const merchantKey = this.extractMerchantKey(description);
        const merchantFreq = profile.merchantFrequency.get(merchantKey);
        if (merchantFreq && merchantFreq > 0) {
            const merchantScore = Math.min(1, merchantFreq / 10);
            score += merchantScore * weights.merchant;
            if (merchantScore > 0.5) {
                reasons.push('Recognized merchant pattern');
            }
        }

        // Amount match
        const amountScore = this.calculateAmountScore(amount, profile);
        score += amountScore * weights.amount;
        if (amountScore > 0.7) {
            reasons.push(`Typical amount range (€${profile.minAmount.toFixed(0)}-€${profile.maxAmount.toFixed(0)})`);
        }

        // Description keywords match
        const descScore = this.calculateDescriptionScore(description, profile);
        score += descScore * weights.description;
        if (descScore > 0.6) {
            reasons.push('Matching description patterns');
        }

        // Temporal match (if date provided)
        if (date) {
            const temporalScore = this.calculateTemporalScore(date, profile);
            score += temporalScore * weights.temporal;
            if (temporalScore > 0.7) {
                reasons.push('Typical time pattern');
            }
        }

        return { totalScore: score, reasons };
    }

    /**
     * Calculate amount-based score
     */
    private calculateAmountScore(amount: number, profile: CategoryProfile): number {
        if (profile.totalTransactions < 3) return 0.3; // Not enough data

        // Check if amount is within typical range
        const withinOneStdDev = Math.abs(amount - profile.avgAmount) <= profile.stdDeviation;
        const withinTwoStdDev = Math.abs(amount - profile.avgAmount) <= (2 * profile.stdDeviation);

        if (withinOneStdDev) return 0.9;
        if (withinTwoStdDev) return 0.6;
        if (amount >= profile.minAmount && amount <= profile.maxAmount) return 0.4;

        return 0.1;
    }

    /**
     * Calculate description-based score
     */
    private calculateDescriptionScore(description: string, profile: CategoryProfile): number {
        const descWords = new Set(this.tokenizeDescription(description).map(w => w.toLowerCase()));
        let matchCount = 0;
        let totalRelevantPatterns = 0;

        profile.patterns
            .filter(p => p.type === 'description')
            .forEach(pattern => {
                totalRelevantPatterns += pattern.frequency;
                if (descWords.has(pattern.value)) {
                    matchCount += pattern.frequency;
                }
            });

        if (totalRelevantPatterns === 0) return 0;
        return Math.min(1, matchCount / Math.max(3, totalRelevantPatterns * 0.3));
    }

    /**
     * Calculate temporal-based score
     */
    private calculateTemporalScore(date: Date, profile: CategoryProfile): number {
        const transactionMoment = moment(date);
        const dayOfWeek = transactionMoment.day();
        const hour = transactionMoment.hour();

        // Check day of week pattern
        const dayFrequency = profile.dayOfWeekDistribution[dayOfWeek];
        const avgDayFrequency = profile.totalTransactions / 7;
        const dayScore = Math.min(1, dayFrequency / Math.max(1, avgDayFrequency));

        // Check time of day pattern
        let timeScore = 0;
        const totalTimeTransactions = Object.values(profile.timeDistribution).reduce((a, b) => a + b, 0);
        if (totalTimeTransactions > 0) {
            let timeFreq = 0;
            if (hour >= 6 && hour < 12) timeFreq = profile.timeDistribution.morning;
            else if (hour >= 12 && hour < 18) timeFreq = profile.timeDistribution.afternoon;
            else if (hour >= 18 && hour < 24) timeFreq = profile.timeDistribution.evening;
            else timeFreq = profile.timeDistribution.night;

            timeScore = timeFreq / totalTimeTransactions;
        }

        return (dayScore * 0.6 + timeScore * 0.4);
    }

    /**
     * Find merchant match in profiles
     */
    private findMerchantMatch(description: string): MerchantProfile | null {
        const merchantKey = this.extractMerchantKey(description);
        const directMatch = this.merchantProfiles.get(merchantKey);
        if (directMatch) return directMatch;

        // Check aliases
        for (const [key, profile] of this.merchantProfiles.entries()) {
            if (profile.aliases.some(alias =>
                alias.toLowerCase().includes(merchantKey.toLowerCase()) ||
                merchantKey.toLowerCase().includes(alias.toLowerCase())
            )) {
                return profile;
            }
        }

        return null;
    }

    /**
     * Extract merchant key from description
     */
    private extractMerchantKey(description: string): string {
        // Remove common transaction prefixes/suffixes
        let cleaned = description
            .replace(/^(payment to|purchase at|from|at)\s+/i, '')
            .replace(/\s+(debit|credit|card|payment|transaction)$/i, '')
            .replace(/\s+\d{4,}$/g, '') // Remove trailing numbers (transaction IDs)
            .replace(/\s+\d{2}\/\d{2}\/\d{2,4}$/g, '') // Remove dates
            .trim();

        // Take first significant part (usually merchant name)
        const parts = cleaned.split(/\s+/);
        if (parts.length > 3) {
            cleaned = parts.slice(0, 3).join(' ');
        }

        return cleaned.toLowerCase();
    }

    /**
     * Tokenize description into meaningful words
     */
    private tokenizeDescription(description: string): string[] {
        return description
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.isStopWord(word));
    }

    /**
     * Check if word is a stop word
     */
    private isStopWord(word: string): boolean {
        const stopWords = new Set([
            'the', 'and', 'for', 'with', 'from', 'payment', 'transaction',
            'card', 'debit', 'credit', 'purchase', 'ref', 'trans'
        ]);
        return stopWords.has(word);
    }

    /**
     * Get amount range category
     */
    private getAmountRange(amount: number): string {
        if (amount < 10) return 'micro';
        if (amount < 50) return 'small';
        if (amount < 200) return 'medium';
        if (amount < 1000) return 'large';
        return 'extra-large';
    }

    /**
     * Create empty category profile
     */
    private createEmptyCategoryProfile(category: string): CategoryProfile {
        return {
            categoryId: `cat_${Date.now()}`,
            categoryName: category,
            patterns: [],
            avgAmount: 0,
            stdDeviation: 0,
            minAmount: Infinity,
            maxAmount: 0,
            timeDistribution: {
                morning: 0,
                afternoon: 0,
                evening: 0,
                night: 0
            },
            merchantFrequency: new Map(),
            dayOfWeekDistribution: new Array(7).fill(0),
            monthlyDistribution: new Array(31).fill(0),
            totalTransactions: 0,
            lastUpdated: new Date()
        };
    }

    /**
     * Export profiles for persistence
     */
    public exportProfiles(): {
        categories: Record<string, CategoryProfile>;
        merchants: Record<string, MerchantProfile>;
    } {
        const categories: Record<string, CategoryProfile> = {};
        const merchants: Record<string, MerchantProfile> = {};

        this.categoryProfiles.forEach((profile, key) => {
            categories[key] = {
                ...profile,
                merchantFrequency: new Map(profile.merchantFrequency)
            };
        });

        this.merchantProfiles.forEach((profile, key) => {
            merchants[key] = profile;
        });

        return { categories, merchants };
    }

    /**
     * Get learning statistics
     */
    public getStatistics(): {
        categoriesLearned: number;
        merchantsRecognized: number;
        totalPatternsLearned: number;
        avgConfidence: number;
    } {
        let totalPatterns = 0;
        let totalConfidence = 0;
        let patternCount = 0;

        this.categoryProfiles.forEach(profile => {
            totalPatterns += profile.patterns.length;
            profile.patterns.forEach(p => {
                totalConfidence += p.confidence;
                patternCount++;
            });
        });

        return {
            categoriesLearned: this.categoryProfiles.size,
            merchantsRecognized: this.merchantProfiles.size,
            totalPatternsLearned: totalPatterns,
            avgConfidence: patternCount > 0 ? totalConfidence / patternCount : 0
        };
    }
}