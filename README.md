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

## 🛠 Development

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Lint code
npm run lint
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/caio/obsidian-money-manager/issues).

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the full text.

## 👏 Credits

Originally based on [Nexus Hub](https://github.com/ONeithan/nexus-hub) by ONeithan, adapted and maintained by [Caio](https://github.com/caio).

---

*Built with ❤️ for the Obsidian community.*

---
---

# Money Manager - Seu Painel de Finanças Pessoais no Obsidian

Money Manager transforma seu cofre do Obsidian em um poderoso centro de controle financeiro completo. Acompanhe suas despesas, gerencie orçamentos, planeje seus objetivos e obtenha insights profundos sobre sua vida financeira, tudo sem sair do seu aplicativo de anotações favorito.

## ✨ Recursos Principais

- **📊 Painel Interativo:** Obtenha uma visão geral clara de sua renda mensal, despesas, pagamentos pendentes e saldo projetado.
- **💸 Gerenciamento de Transações:** Adicione facilmente transações únicas, recorrentes ou parceladas. Nosso sistema de sugestões inteligente até ajuda a categorizar seus gastos.
- **💳 Controle de Cartão de Crédito:** Registre seus cartões de crédito, acompanhe compras parceladas e nunca perca de vista a data de vencimento e o valor total da sua fatura.
- **🎯 Definição de Metas:** Crie e acompanhe metas de economia (como uma viagem) ou metas de pagamento de dívidas. Acompanhe seu progresso e mantenha-se motivado.
- **💰 Orçamento Simplificado:** Defina orçamentos mensais para diferentes categorias e acompanhe visualmente seus gastos para ficar dentro do planejado.
- **🚨 Fundo de Emergência:** Construa e gerencie sua rede de segurança financeira com recursos dedicados de contribuição e retirada.
- **📈 Relatórios Detalhados:** Analise seus gastos por categoria, visualize seu fluxo de caixa e acompanhe a evolução do seu patrimônio líquido ao longo do tempo com gráficos lindos e interativos.
- **🔮 Projeções Futuras:** Veja uma projeção de 30 dias do seu saldo com base nos próximos pagamentos recorrentes.
- **🏆 Gamificação:** Mantenha-se engajado com suas finanças ganhando pontos Nexus Score e desbloqueando conquistas por bons hábitos financeiros.

## 🚀 Começando

### Instalação

#### Do GitHub (Desenvolvimento)

1. Clone este repositório:
   ```bash
   git clone https://github.com/caio/obsidian-money-manager.git
   cd obsidian-money-manager
   ```

2. Instale as dependências e compile:
   ```bash
   npm install
   npm run build
   ```

3. Crie links simbólicos para desenvolvimento:
   ```bash
   # Crie o diretório do plugin
   mkdir -p <SeuCofre>/.obsidian/plugins/obsidian-money-manager

   # Crie os links simbólicos
   ln -sf $(pwd)/main.js <SeuCofre>/.obsidian/plugins/obsidian-money-manager/main.js
   ln -sf $(pwd)/manifest.json <SeuCofre>/.obsidian/plugins/obsidian-money-manager/manifest.json
   ln -sf $(pwd)/styles.css <SeuCofre>/.obsidian/plugins/obsidian-money-manager/styles.css
   ```

4. Recarregue o Obsidian e ative o plugin "Money Manager" em Configurações → Plugins da comunidade.

#### Instalação Manual

1. Baixe os arquivos `main.js`, `styles.css` e `manifest.json` da página de Releases mais recente.
2. Crie uma nova pasta chamada `obsidian-money-manager` dentro do diretório `.obsidian/plugins/` do seu cofre Obsidian.
3. Copie os arquivos baixados para a pasta `obsidian-money-manager`.
4. Recarregue o Obsidian e ative o plugin Money Manager nas suas configurações.

### Primeira Configuração

Uma vez instalado, o Money Manager irá cumprimentá-lo com um processo rápido de integração para configurar seu nome e renda mensal. Depois disso, você está pronto para explorar!

## 🛠 Desenvolvimento

```bash
# Modo de desenvolvimento com recarga automática
npm run dev

# Build de produção
npm run build

# Verificar código
npm run lint
```

## 🤝 Contribuindo

Contribuições, problemas e solicitações de recursos são bem-vindos! Sinta-se à vontade para verificar a [página de issues](https://github.com/caio/obsidian-money-manager/issues).

## 📜 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para o texto completo.

## 👏 Créditos

Originalmente baseado em [Nexus Hub](https://github.com/ONeithan/nexus-hub) por ONeithan, adaptado e mantido por [Caio](https://github.com/caio).

---

*Feito com ❤️ para a comunidade Obsidian.*