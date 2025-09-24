# Pattern Recognition Feature Guide
## Money Manager Plugin - Intelligent Financial Insights

---

## Overview

The Money Manager plugin now includes powerful local pattern recognition capabilities that learn from your financial behavior to provide intelligent suggestions, detect anomalies, and predict future transactions - all while keeping your data completely private on your device.

## Features

### 1. Smart Category Suggestions

The **SmartCategorizer** learns from your transaction history to automatically suggest the most appropriate category for new transactions.

#### How It Works:
- Analyzes description patterns, amounts, and timing
- Learns from every transaction you categorize
- Provides confidence scores for suggestions
- Offers alternative categories when uncertain

#### What It Learns:
- **Merchant Recognition**: Remembers where you shop and their typical categories
- **Amount Patterns**: Understands typical spending ranges per category
- **Time Patterns**: Learns when you typically make certain purchases
- **Description Keywords**: Associates words with specific categories

### 2. Recurring Transaction Detection

The **RecurrenceDetector** automatically identifies recurring payments and subscriptions.

#### Detection Capabilities:
- **Pattern Types**: Daily, weekly, bi-weekly, monthly, quarterly, annual
- **Smart Matching**: Handles variations in descriptions and amounts
- **Prediction**: Forecasts when the next payment is expected
- **Confidence Scoring**: Shows how certain the detection is

#### Use Cases:
- Automatically identify subscriptions (Netflix, Spotify, etc.)
- Detect regular bills (utilities, rent, insurance)
- Find hidden recurring charges
- Plan for upcoming expenses

### 3. Spending Anomaly Detection

The **AnomalyDetector** alerts you to unusual spending patterns that might need attention.

#### Types of Anomalies Detected:

**Amount Anomalies**:
- Transactions significantly higher than usual for a category
- Spending that exceeds historical maximums
- Statistical outliers (>2.5 standard deviations)

**Merchant Anomalies**:
- New merchants in sensitive categories
- Potentially suspicious merchant names
- Unusual merchant for a specific category

**Time Anomalies**:
- Purchases at unusual hours
- Spending on atypical days
- Category-specific timing violations

**Duplicate Detection**:
- Possible double charges within 24 hours
- Similar amounts to the same merchant
- Accidental re-submissions

**Velocity Anomalies**:
- Too many transactions in a short period
- Daily spending limit exceeded
- Rapid category-specific spending

### 4. Intelligent Transaction Entry

The enhanced transaction modal provides real-time intelligence while you enter transactions.

#### Smart Features:
- **Live Category Suggestions**: As you type the description
- **Confidence Indicators**: High/Medium/Low confidence visual cues
- **Anomaly Warnings**: Real-time alerts for unusual patterns
- **Recurring Detection**: Automatic identification of recurring payments
- **Alternative Suggestions**: Multiple category options when uncertain

## How to Use

### Initial Setup

1. **Let It Learn**: The system needs at least 10-20 transactions to start making accurate suggestions
2. **Categorize Accurately**: The more consistent you are, the better it learns
3. **Review Suggestions**: Accept or correct suggestions to improve accuracy

### Using Smart Transaction Entry

1. **Open Add Transaction**: Click the "Add Transaction" button
2. **Enter Description**: Start typing and watch for category suggestions
3. **Review Suggestions**:
   - Green = High confidence (>85%)
   - Yellow = Medium confidence (75-85%)
   - Gray = Low confidence (65-75%)
4. **Check for Warnings**: Red/yellow alerts indicate potential issues
5. **Apply Suggestions**: Click "Apply" to use suggested category

### Understanding Confidence Scores

- **85-100%**: Very confident - likely correct
- **75-85%**: Moderately confident - probably correct
- **65-75%**: Low confidence - might be correct
- **<65%**: No suggestion shown - insufficient confidence

### Privacy & Security

**100% Local Processing**:
- All pattern recognition happens on your device
- No data is sent to external servers
- No cloud AI or API calls required
- Your financial data stays completely private

**Data Storage**:
- Patterns stored in your Obsidian vault
- Exportable and portable
- No external dependencies

## Technical Details

### Learning Algorithm

The system uses multiple signals to learn patterns:

1. **Frequency Analysis**: How often patterns occur
2. **Statistical Modeling**: Mean, standard deviation, percentiles
3. **Temporal Patterns**: Time-of-day and day-of-week distributions
4. **Merchant Mapping**: Description to category associations
5. **Confidence Decay**: Older patterns gradually lose weight

### Performance

- **Training Speed**: <50ms for processing new transactions
- **Suggestion Speed**: <10ms for real-time suggestions
- **Memory Usage**: <10MB for pattern storage
- **Accuracy**: >85% after 100 transactions

### Limitations

- **Minimum Data**: Needs at least 5 transactions per category for profiling
- **Learning Curve**: Accuracy improves over time with more data
- **No External Data**: Cannot learn from other users or external sources
- **Language**: Currently optimized for English descriptions

## Troubleshooting

### No Suggestions Appearing
- **Solution**: Need more transactions in that category (minimum 5)

### Wrong Category Suggested
- **Solution**: Correct it manually - the system will learn from the correction

### Too Many Warnings
- **Solution**: Adjust sensitivity in settings or review spending patterns

### Performance Issues
- **Solution**: Clear old patterns (>1 year) in settings

## Future Enhancements

Planned improvements for future versions:

1. **Cash Flow Predictor**: 30/60/90 day forecasting
2. **Budget Optimizer**: Dynamic budget recommendations
3. **Goal Integration**: Smart saving suggestions
4. **Export/Import**: Share patterns between devices
5. **Custom Rules**: User-defined pattern matching

## Feedback

The pattern recognition system improves with each transaction. The more you use it, the smarter it becomes. Your transaction patterns are unique to you, and the system adapts to your specific financial behavior.

For best results:
- Be consistent with descriptions
- Categorize transactions promptly
- Review and correct suggestions
- Report any issues or suggestions

---

*Note: This feature is in active development. Accuracy and performance will continue to improve with updates.*