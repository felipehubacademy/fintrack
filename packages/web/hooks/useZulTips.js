import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { t } from '@fintrack/shared/i18n';

const TIPS_BY_PAGE = {
  '/dashboard/transactions': {
    get title() { return t('web.useZulTips.transactions'); },
    get message() { return t('web.useZulTips.everythingYouSpendAndEarn'); },
    action: 'Fazer Tour',
    tourAction: true
  },
  '/dashboard/cards': {
    get title() { return t('web.useZulTips.cards'); },
    get message() { return t('web.useZulTips.keepAnEyeOnYour'); },
    action: 'Fazer Tour',
    tourAction: true
  },
  '/dashboard/bills': {
    get title() { return t('web.useZulTips.bills'); },
    get message() { return t('web.useZulTips.keepYourBillsInOrder'); },
    action: 'Configurar lembretes'
  },
  '/dashboard/budgets': {
    get title() { return t('web.useZulTips.budgets'); },
    get message() { return t('web.useZulTips.setRealisticBudgetsAndTrack'); },
    action: 'Criar orçamento'
  },
  '/dashboard/investments': {
    get title() { return t('web.useZulTips.investments'); },
    get message() { return t('web.useZulTips.trackYourInvestingGoalsAnd'); },
    action: 'Definir meta'
  },
  '/dashboard/bank-accounts': {
    get title() { return t('web.useZulTips.bankAccounts'); },
    get message() { return t('web.useZulTips.allYourBankAccountsIn'); },
    action: 'Adicionar conta'
  },
  '/dashboard/closing': {
    get title() { return t('web.useZulTips.monthClose'); },
    get message() { return t('web.useZulTips.lookBackAtYourMonth'); },
    action: 'Ver relatório'
  }
};

export function useZulTips(isTourActive = false) {
  const [currentTip, setCurrentTip] = useState(null);
  const [showTip, setShowTip] = useState(false);
  const [hasNewTip, setHasNewTip] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Limpar dica anterior quando mudar de página
    setShowTip(false);
    setHasNewTip(false);

    // Se o tour estiver ativo, não mostrar nenhuma dica
    if (isTourActive) {
      return;
    }

    // Definir nova dica baseada na página atual
    const path = router.asPath.split('?')[0]; // Remove query params
    const tip = TIPS_BY_PAGE[path];

    if (tip) {
      setCurrentTip(tip);
      
      // Mostrar dica após um delay
      const timer = setTimeout(() => {
        setShowTip(true);
        setHasNewTip(true);
      }, 3500); // 3.5 segundos

      return () => clearTimeout(timer);
    }
  }, [router.asPath, isTourActive]);

  // Limpar card quando tour iniciar
  useEffect(() => {
    if (isTourActive) {
      setShowTip(false);
      setHasNewTip(false);
    }
  }, [isTourActive]);

  const dismissTip = () => {
    setShowTip(false);
  };

  const showTipAgain = () => {
    setShowTip(true);
  };

  return {
    currentTip,
    showTip,
    hasNewTip,
    dismissTip,
    showTipAgain,
    setHasNewTip
  };
}
