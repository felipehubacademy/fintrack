import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const TIPS_BY_PAGE = {
  '/dashboard/transactions': {
    title: '💡 Controle de Transações',
    message: 'Registre suas despesas e receitas facilmente. Dica: use o WhatsApp para registrar gastos rapidamente!',
    action: 'Fazer Tour',
    tourAction: true
  },
  '/dashboard/cards': {
    title: '💳 Gestão de Cartões',
    message: 'Monitore seus cartões de crédito e acompanhe os gastos. Configure alertas para não passar do limite!',
    action: 'Fazer Tour',
    tourAction: true
  },
  '/dashboard/bills': {
    title: '📋 Contas a Pagar',
    message: 'Organize suas contas e nunca mais esqueça de pagar. Configure lembretes automáticos!',
    action: 'Configurar lembretes'
  },
  '/dashboard/budgets': {
    title: '📊 Orçamentos Inteligentes',
    message: 'Crie orçamentos realistas e acompanhe seus gastos. Vou te ajudar a definir limites adequados!',
    action: 'Criar orçamento'
  },
  '/dashboard/investments': {
    title: '📈 Investimentos',
    message: 'Acompanhe suas metas de investimento e veja seu progresso. Comece com pequenos valores!',
    action: 'Definir meta'
  },
  '/dashboard/bank-accounts': {
    title: '🏦 Contas Bancárias',
    message: 'Centralize suas contas bancárias em um só lugar. Monitore saldos e movimentações!',
    action: 'Adicionar conta'
  },
  '/dashboard/closing': {
    title: '📅 Fechamento Mensal',
    message: 'Revise seus gastos do mês e planeje o próximo. Análise detalhada para tomar melhores decisões!',
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
