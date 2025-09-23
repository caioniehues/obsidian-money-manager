import React, { useState } from 'react';
import { translations } from '../../i18n/translations-template';
import LanguageSwitcher from './LanguageSwitcher';

type AppLanguage = 'pt' | 'en';

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>('pt');
  return (
    <div>
      <LanguageSwitcher language={language} onChange={(lang: string) => setLanguage(lang as AppLanguage)} />
      <h1>{translations[language].greeting}</h1>
      <button>{translations[language].botao}</button>
      {/* ...existing code... */}
    </div>
  );
}