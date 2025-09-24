# Money Manager - Your Personal Finance Dashboard in Obsidian

Money Manager transforms your Obsidian vault into a powerful, all-in-one financial control center. Track your expenses, manage budgets, plan your goals, and gain deep insights into your financial life, all without leaving your favorite note-taking app.

## ✨ Key Features

- **📊 Interactive Dashboard:** Get a clear overview of your monthly income, expenses, pending payments, and projected balance.
- **💸 Transaction Management:** Easily add single, recurring, or installment-based transactions. Our smart suggestion system even helps categorize your spending.
- **💳 Credit Card Control:** Register your credit cards, track installment purchases, and never lose sight of your bill's due date and total amount.
- **🎯 Goal Setting:** Create and track savings goals (like a trip) or debt payoff goals. Watch your progress and stay motivated.
- **💰 Simplified Budgeting:** Set monthly budgets for different categories and visually track your spending to stay on target.
- **🚨 Emergency Fund:** Build and manage your financial safety net with dedicated contribution and withdrawal features.
- **📈 Detailed Reports:** Analyze your spending by category, visualize your cash flow, and watch your net worth evolve over time with beautiful, interactive charts.
- **🔮 Future Projections:** See a 30-day projection of your balance based on upcoming recurring payments.
- **🏆 Gamification:** Stay engaged with your finances by earning Nexus Score points and unlocking achievements for good financial habits.
- **🎨 Modular CSS Layout (MCL):** Enhanced visual experience with customizable card layouts, animations, and responsive design patterns that seamlessly integrate with any Obsidian theme.

## 🚀 Getting Started

### Installation

#### From GitHub (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/caio/obsidian-money-manager.git
   cd obsidian-money-manager
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Create symlinks for development:
   ```bash
   # Create plugin directory
   mkdir -p <YourVault>/.obsidian/plugins/obsidian-money-manager

   # Create symlinks
   ln -sf $(pwd)/main.js <YourVault>/.obsidian/plugins/obsidian-money-manager/main.js
   ln -sf $(pwd)/manifest.json <YourVault>/.obsidian/plugins/obsidian-money-manager/manifest.json
   ln -sf $(pwd)/styles.css <YourVault>/.obsidian/plugins/obsidian-money-manager/styles.css
   ```

4. Reload Obsidian and enable the "Money Manager" plugin in Settings → Community plugins.

#### Manual Installation

1. Download the `main.js`, `styles.css`, and `manifest.json` files from the latest Releases page.
2. Create a new folder named `obsidian-money-manager` inside your Obsidian vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into the `obsidian-money-manager` folder.
4. Reload Obsidian and enable the Money Manager plugin in your settings.

### First Setup

Once installed, Money Manager will greet you with a quick onboarding process to set up your name and monthly income. After that, you're ready to explore!

### Visual Customization (MCL)

Money Manager includes Modular CSS Layout (MCL) enhancements that provide:

- **Card Layouts:** Transform lists into beautiful card grids
- **Enhanced Dashboard:** Professional grid layouts with hover effects
- **Wide Reports:** Maximize screen space for charts and data
- **Smooth Animations:** Subtle animations for better user experience

To enable MCL features:
1. Go to Settings → Money Manager → Layout Enhancements (MCL)
2. Toggle "Enable MCL Enhancements"
3. Customize individual features and dimensions to your preference

All MCL features are optional and the plugin works perfectly without them enabled.

## 🛠 Development

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Lint code
npm run lint
```

### Developer Documentation

- **[MCL Implementation Guide](MCL-IMPLEMENTATION-GUIDE.md):** Comprehensive guide for implementing Modular CSS Layout patterns in Obsidian plugins. Includes pattern library, TypeScript examples, and best practices.
- **[CLAUDE.md](CLAUDE.md):** Instructions for AI-assisted development with Claude
- **[AGENTS.md](AGENTS.md):** Architecture and agent-based development patterns

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/caio/obsidian-money-manager/issues).

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the full text.

## 👏 Credits

Originally based on [Nexus Hub](https://github.com/ONeithan/nexus-hub) by ONeithan, adapted and maintained by [Caio](https://github.com/caio).

---

*Built with ❤️ for the Obsidian community.*
