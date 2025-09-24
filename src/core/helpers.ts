import { CreditCard, Transaction } from './settings';
declare const moment: any;

/**
 * Converts a currency-formatted string (e.g., "€1,500.00") to a number.
 * @param value The string to be converted.
 * @returns The numeric value.
 */
export function parseCurrency(value: string): number {
	const sanitized = String(value).replace(/[€\s,]/g, '');
	return parseFloat(sanitized) || 0;
}

export function formatAsCurrency(value: number): string {
    return value.toLocaleString('en-EU', { style: 'currency', currency: 'EUR' });
}

export function calculateCardBill(card: CreditCard, allTransactions: Transaction[], currentMonth: moment.Moment): { total: number, dueDate: moment.Moment, transactions: Transaction[] } {
    // A month's bill contains all card transactions whose due date is in that month.
    // This is the source of truth, using the transaction's 'date' property.
    const transactionsForBill = allTransactions.filter(t =>
        t.cardId === card.id &&
        moment(t.date).isSame(currentMonth, 'month')
    );

    // The value saved in the transaction is already the installment amount, so we just sum them.
    const billTotal = transactionsForBill.reduce((sum, t) => sum + t.amount, 0);

    // The bill due date is the card's due day in the current month.
    // Failsafe date logic to prevent month rollover (e.g., day 31 in February).
    const targetMonth = currentMonth.clone();
    const daysInTargetMonth = targetMonth.daysInMonth();
    const dueDay = Math.min(card.dueDate, daysInTargetMonth);
    const billDueDate = targetMonth.date(dueDay);

    return {
        total: billTotal,
        dueDate: billDueDate,
        transactions: transactionsForBill
    };
}

const categoryKeywords: { [keyword: string]: string } = {
    // Housing
    'rent': 'Housing',
    'mortgage': 'Housing',
    'utilities': 'Housing',
    'electric': 'Housing',
    'electricity': 'Housing',
    'water': 'Housing',
    'gas bill': 'Housing',
    'internet': 'Housing',
    'cable': 'Housing',
    'property tax': 'Housing',
    'hoa': 'Housing',
    'maintenance': 'Housing',

    // Food
    'grocery': 'Food',
    'supermarket': 'Food',
    'restaurant': 'Food',
    'food delivery': 'Food',
    'doordash': 'Food',
    'ubereats': 'Food',
    'grubhub': 'Food',
    'takeout': 'Food',
    'dining': 'Food',
    'cafe': 'Food',
    'coffee': 'Food',
    'bakery': 'Food',

    // Transportation
    'uber': 'Transportation',
    'lyft': 'Transportation',
    'taxi': 'Transportation',
    'gas': 'Transportation',
    'gasoline': 'Transportation',
    'fuel': 'Transportation',
    'parking': 'Transportation',
    'toll': 'Transportation',
    'bus': 'Transportation',
    'subway': 'Transportation',
    'train': 'Transportation',
    'car payment': 'Transportation',
    'insurance': 'Transportation',

    // Entertainment & Subscriptions
    'netflix': 'Subscriptions',
    'spotify': 'Subscriptions',
    'disney+': 'Subscriptions',
    'hbo': 'Subscriptions',
    'prime video': 'Subscriptions',
    'apple music': 'Subscriptions',
    'youtube': 'Subscriptions',
    'gym': 'Subscriptions',
    'cinema': 'Entertainment',
    'movie': 'Entertainment',
    'theater': 'Entertainment',
    'concert': 'Entertainment',
    'show': 'Entertainment',

    // Healthcare
    'pharmacy': 'Healthcare',
    'doctor': 'Healthcare',
    'dentist': 'Healthcare',
    'hospital': 'Healthcare',
    'medical': 'Healthcare',
    'health insurance': 'Healthcare',
    'prescription': 'Healthcare',
};

export function suggestCategory(description: string, availableCategories: {id: string, name: string}[]): string | null {
    const lowerCaseDescription = description.toLowerCase();
    const availableCategoryNames = new Set(availableCategories.map(c => c.name));

    for (const keyword in categoryKeywords) {
        if (lowerCaseDescription.includes(keyword)) {
            const suggestedCategory = categoryKeywords[keyword];
            // Verifies that the suggested category actually exists in the user's settings
            if (availableCategoryNames.has(suggestedCategory)) {
                return suggestedCategory;
            }
        }
    }
    return null;
}