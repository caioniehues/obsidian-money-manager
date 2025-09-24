// All TypeScript interfaces and types for the Money Manager plugin

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string; // YYYY-MM-DD
    category: string;
    type: 'income' | 'expense';
    status: 'pending' | 'paid';
    isRecurring: boolean;
    recurrenceRule?: 'monthly';
    endDate?: string;
    isInstallment: boolean;
    installmentOf?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    cardId?: string;
    purchaseDate?: string;
    pausedUntil?: string;
}

export interface CreditCard {
    id: string;
    name: string;
    limit: number;
    closingDay: number;
    dueDate: number;
}

export interface Goal {
    id: string;
    name: string;
    goalType: 'Saving' | 'Debt';
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
    linkedAccountIds: string[];
    completed: boolean;
    history?: { date: string; amount: number; balanceAfter: number }[];
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedDate: string;
}

export interface Budget {
    categoryId: string;
    amount: number;
}

export interface EmergencyFund {
    currentBalance: number;
    monthlyContribution: number;
    isEnabled: boolean;
    history: { date: string; type: 'deposit' | 'withdrawal'; amount: number; balanceAfter: number; reason?: string }[];
}

export interface Category {
    id: string;
    name: string;
}

export interface MCLSettings {
    enabled: boolean;
    columnMinWidth: number;
    cardMinWidth: number;
    cardGap: number;
    cardPadding: number;
    cardRadius: number;
    floatMaxWidth: number;
    galleryColumns: number;
    dashboardEnhanced: boolean;
    transactionCards: boolean;
    budgetCardsEnhanced: boolean;
    wideReports: boolean;
}

export interface MoneyManagerSettings {
    language: Language;
    dataVersion: number;
    onboardingComplete: boolean;
    userName: string;
    nexusScore: number;
    scoreHistory: { date: string; points: number; reason: string; currentScore: number }[];
    achievements: Achievement[];
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    goals: Goal[];
    creditCards: CreditCard[];
    emergencyFund: EmergencyFund;
    notifiedTransactionIds: string[];
    mclSettings?: MCLSettings;
}

// Language type should be imported from i18n/lang
import { Language } from './i18n/lang';
export type { Language };