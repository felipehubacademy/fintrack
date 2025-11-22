import { MessageCircle, Lightbulb, HelpCircle, Sparkles, Zap, BookOpen } from 'lucide-react';

/**
 * Steps de Onboarding específicos para o Zul Web
 * Substituem os tour cards antigos por um onboarding unificado
 */
export const zulWebOnboardingSteps = [
  {
    icon: MessageCircle,
    title: 'Conheça o Zul! 👋',
    description: 'Eu sou o Zul, seu assistente financeiro inteligente! Estou aqui para te ajudar a navegar pela plataforma, responder dúvidas e dar dicas personalizadas sobre suas finanças.',
    tip: 'Clique no meu ícone (canto inferior direito) sempre que precisar de ajuda!'
  },
  {
    icon: Sparkles,
    title: 'Chat Inteligente 💬',
    description: 'Converse comigo em linguagem natural! Pergunte sobre suas transações, orçamentos, metas ou qualquer dúvida sobre a plataforma. Eu entendo contexto e te dou respostas personalizadas.',
    tip: 'Exemplos: "Quanto gastei com alimentação este mês?" ou "Como criar uma meta?"'
  },
  {
    icon: Lightbulb,
    title: 'Dicas Contextuais 💡',
    description: 'Eu analiso suas finanças e te envio dicas personalizadas! Vou te alertar sobre gastos altos, sugerir economias e te lembrar de tarefas importantes como pagar contas.',
    tip: 'Quando eu tiver uma dica nova, meu ícone vai piscar em amarelo!'
  },
  {
    icon: BookOpen,
    title: 'Tours Guiados 🗺️',
    description: 'Em cada página da plataforma, posso te guiar com um tour interativo! Vou destacar cada funcionalidade e explicar como usar. Perfeito para quando você está explorando algo novo.',
    tip: 'Clique em "Iniciar Tour" no chat para começar o tour da página atual!'
  },
  {
    icon: Zap,
    title: 'Ações Rápidas ⚡',
    description: 'Peça para eu executar ações por você! Posso criar transações, adicionar metas, filtrar dados e muito mais. Tudo sem você precisar navegar pelos menus.',
    tip: 'Experimente: "Adicione uma despesa de R$ 50 em alimentação"'
  },
  {
    icon: HelpCircle,
    title: 'Sempre Disponível 🤝',
    description: 'Estou sempre aqui, em todas as páginas! Se você se sentir perdido ou tiver dúvidas, é só me chamar. Meu objetivo é tornar sua experiência financeira mais fácil e eficiente.',
    tip: 'Você pode minimizar o chat e eu continuo monitorando para te ajudar!'
  }
];

/**
 * Função para verificar se o usuário já viu o onboarding do Zul
 */
export function hasSeenZulOnboarding() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('onboarding_zul_web') === 'completed';
}

/**
 * Função para marcar o onboarding do Zul como completo
 */
export function markZulOnboardingComplete() {
  if (typeof window === 'undefined') return;
  localStorage.setItem('onboarding_zul_web', 'completed');
}

/**
 * Função para resetar o onboarding do Zul (para testes)
 */
export function resetZulOnboarding() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('onboarding_zul_web');
}

