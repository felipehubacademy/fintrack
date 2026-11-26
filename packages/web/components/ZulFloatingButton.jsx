import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { MessageCircle, X, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { useZulTips } from '../hooks/useZulTips';
import { useTour } from '../contexts/TourContext';
import { getTourForRoute, getTourTypeFromRoute, getDashboardTourSteps } from '../data/tourSteps';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';
import Avatar from './Avatar';
import { useI18n } from '../contexts/I18nContext';

// Função para formatar mensagens do Zul com markdown básico
const formatZulMessage = (message, isUser = false) => {
  if (!message) return '';
  
  let formatted = message;
  
  // Escapar HTML existente para segurança
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Títulos (### Título -> <h3>Título</h3>)
  formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-2 first:mt-0">$1</h3>');
  formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="font-bold text-lg mt-4 mb-2 first:mt-0">$1</h2>');
  formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-2 first:mt-0">$1</h1>');
  
  // Negrito (**texto** -> <strong>texto</strong>)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  
  // Itálico (*texto* -> <em>texto</em>)
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Listas numeradas (1. item -> <ol><li>item</li></ol>)
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$2</li>');
  formatted = formatted.replace(/(<li.*<\/li>)/s, '<ol class="list-decimal list-inside space-y-1 my-2">$1</ol>');
  
  // Listas com bullets (- item ou • item -> <ul><li>item</li></ul>)
  formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>');
  formatted = formatted.replace(/(<li class="ml-4 mb-1">.*?<\/li>(?:\s*<li class="ml-4 mb-1">.*?<\/li>)*)/gs, (match) => {
    if (!match.includes('</ol>')) {
      return `<ul class="list-disc list-inside space-y-1 my-2">${match}</ul>`;
    }
    return match;
  });
  
  // Parágrafos (quebras de linha duplas)
  formatted = formatted.replace(/\n\n/g, '</p><p class="mb-2">');
  formatted = '<p class="mb-2">' + formatted + '</p>';
  
  // Limpar parágrafos vazios
  formatted = formatted.replace(/<p class="mb-2"><\/p>/g, '');
  formatted = formatted.replace(/<p class="mb-2">\s*<\/p>/g, '');
  
  // Quebras de linha simples
  formatted = formatted.replace(/\n/g, '<br />');
  
  return formatted;
};

export default function ZulFloatingButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [showZul, setShowZul] = useState(false);
  const { organization, user, costCenters, loading: orgLoading } = useOrganization();
  
  // Buscar cor do cost center do usuário
  const userCostCenter = costCenters?.find(cc => cc.user_id === user?.id);
  const avatarColor = userCostCenter?.color || null;
  const previousPathRef = useRef(null);
  const highlightedElementsRef = useRef([]); // Track all highlighted elements
  const chatModalRef = useRef(null); // Ref para o container do chat
  const messagesEndRef = useRef(null); // Ref para scroll automático
  const { 
    isTourActive, 
    startTour, 
    nextStep, 
    prevStep, 
    skipTour, 
    completeTour,
    getCurrentStep, 
    isLastStep, 
    isFirstStep,
    isTourCompleted,
    currentStep,
    tourSteps
  } = useTour();
  
  // Debug: Log quando tour está ativo
  useEffect(() => {
    // Tour state tracking
  }, [isTourActive, currentStep, tourSteps, getCurrentStep]);
  const { currentTip, showTip, hasNewTip, dismissTip, setHasNewTip } = useZulTips(isTourActive);

  // Controlar quando mostrar o Zul (SOMENTE após loading terminar)
  useEffect(() => {
    // Fechar chat ao mudar de página
    setShowChatModal(false);
    
    // Esconder se está na landing page
    if (router.pathname === '/') {
      setShowZul(false);
      setIsVisible(false);
      return;
    }

    // Aguardar loading da organização terminar
    if (orgLoading) {
      setShowZul(false);
      setIsVisible(false);
      return;
    }

    // Verificar se LoadingLogo está visível no DOM
    const checkLoadingLogo = () => {
      const loadingLogo = document.querySelector('.logo-base, .logo-fill, [alt="Carregando..."]');
      return loadingLogo && loadingLogo.offsetParent !== null; // Verifica se está visível
    };

    // Polling para detectar quando o LoadingLogo desaparece
    const checkInterval = setInterval(() => {
      if (!checkLoadingLogo()) {
        // LoadingLogo não está mais visível - aguardar um pouco e mostrar Zul
        setTimeout(() => {
          setShowZul(true);
          setIsVisible(true);
        }, 500);
        clearInterval(checkInterval);
      }
    }, 100); // Verificar a cada 100ms

    // Timeout de segurança: mostrar após 5s mesmo se LoadingLogo ainda visível
    const safetyTimeout = setTimeout(() => {
      setShowZul(true);
      setIsVisible(true);
      clearInterval(checkInterval);
    }, 5000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(safetyTimeout);
    };
  }, [router.pathname, router.asPath, orgLoading, organization]);

  // Função para encontrar elemento alvo (suporta múltiplos seletores)
  const findTargetElement = (target) => {
    if (!target || target === 'body') return null;
    
    // Casos especiais para elementos do dashboard principal
    if (target === 'stats-cards') return 'stats-cards';
    if (target === 'quick-actions') return 'quick-actions';
    if (target === 'monthly-analysis-header') return 'monthly-analysis-header';
    if (target === 'comparative-analysis-header') return 'comparative-analysis-header';
    
    // Tentar seletores múltiplos (separados por vírgula)
    const selectors = target.split(',').map(s => s.trim());
    for (const selector of selectors) {
      try {
        // Se for seletor genérico (button, table, etc), procurar no main
        let element;
        if (selector === 'button') {
          // Procurar botão de ação principal no main
          element = document.querySelector('main button[class*="flight-blue"]');
        } else if (selector === 'table') {
          // Procurar tabela no main
          element = document.querySelector('main table');
        } else {
          // Tentar seletor direto
          element = document.querySelector(selector);
        }
        
        // Verificar se elemento é visível
        if (element && element.offsetParent !== null) {
          return element;
        }
      } catch (e) {
        continue; // Seletor inválido, tentar próximo
      }
    }
    
    return null;
  };

  // Função UNIVERSAL para limpar TODOS os highlights
  const clearAllHighlights = () => {
    // Limpar elementos rastreados
    highlightedElementsRef.current.forEach(el => {
      if (el && el.style) {
        el.style.backgroundColor = '';
        el.style.border = '';
        el.style.borderRadius = '';
        el.style.transform = '';
        el.style.zIndex = '';
        el.style.transition = '';
        el.style.boxShadow = '';
        el.style.padding = '';
        el.style.position = '';
      }
    });
    highlightedElementsRef.current = [];
    
    // Limpar também por seletores genéricos (fallback)
    const genericSelectors = [
      'main .grid.gap-3.grid-cols-1.md\\:grid-cols-3 > div',
      'main .space-y-8 > div',
      'main > div',
      '.card',
      '[class*="Card"]'
    ];
    
    genericSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          if (el.style.border && el.style.border.includes('59, 130, 246')) {
            el.style.backgroundColor = '';
            el.style.border = '';
            el.style.borderRadius = '';
            el.style.transform = '';
            el.style.zIndex = '';
            el.style.transition = '';
            el.style.boxShadow = '';
            el.style.padding = '';
            el.style.position = '';
          }
        });
      } catch (e) {
        // Seletor inválido, ignorar
      }
    });
  };

  // Adicionar highlight ao elemento alvo durante o tour
  useEffect(() => {
    // APENAS DASHBOARD PRINCIPAL TEM HIGHLIGHT!
    const currentPath = router.asPath;
    const isDashboard = currentPath.includes('/dashboard') && 
                       !currentPath.includes('/dashboard/');
    
    if (!isDashboard) {
      // Não aplica highlight em outras páginas (apenas dashboard principal)
      return;
    }
    
    // SEMPRE limpar highlights anteriores primeiro
    clearAllHighlights();
    
    // Limpar cards de estatísticas
    const statsCardsToClear = document.querySelectorAll('main .grid > div');
    statsCardsToClear.forEach(card => {
      card.style.backgroundColor = '';
      card.style.border = '';
      card.style.borderRadius = '';
      card.style.transform = '';
      card.style.zIndex = '';
      card.style.transition = '';
      card.style.boxShadow = '';
    });

    // Limpar ações rápidas - múltiplas tentativas
    let quickActionsCard = document.querySelector('main .space-y-8 > div:nth-child(3)');
    if (!quickActionsCard) {
      const allDivs = document.querySelectorAll('main .space-y-8 > div');
      quickActionsCard = Array.from(allDivs).find(div => 
        div.textContent.includes('Ações Rápidas')
      );
    }
    if (!quickActionsCard) {
      const allMainDivs = document.querySelectorAll('main div');
      quickActionsCard = Array.from(allMainDivs).find(div => 
        div.textContent.includes('Ações Rápidas') && 
        div.offsetHeight > 100
      );
    }
    if (!quickActionsCard) {
      const actionButtons = document.querySelectorAll('button, a');
      const quickActionButton = Array.from(actionButtons).find(btn => 
        btn.textContent.includes('Nova Transação') || 
        btn.textContent.includes('Ver Transações')
      );
      if (quickActionButton) {
        quickActionsCard = quickActionButton.closest('div, section, article');
      }
    }
    if (quickActionsCard) {
      quickActionsCard.style.backgroundColor = '';
      quickActionsCard.style.border = '';
      quickActionsCard.style.borderRadius = '';
      quickActionsCard.style.transform = '';
      quickActionsCard.style.zIndex = '';
      quickActionsCard.style.transition = '';
      quickActionsCard.style.boxShadow = '';
    }

    // Limpar headers de análise - limpar o container completo
    const monthlyTitle = Array.from(document.querySelectorAll('h2, h3')).find(h => 
      h.textContent.includes('Análise do Mês')
    );
    if (monthlyTitle) {
      let monthlyHeader = monthlyTitle.closest('div, section, article');
      if (monthlyHeader && monthlyHeader.offsetHeight < 200) {
        monthlyHeader = monthlyHeader.parentElement;
      }
      if (monthlyHeader && monthlyHeader.offsetHeight < 200) {
        const largerContainer = monthlyTitle.closest('[class*="analysis"], [class*="chart"], [class*="graph"]') ||
                             monthlyTitle.closest('.space-y-12 > div') ||
                             monthlyTitle.closest('main > div');
        if (largerContainer) {
          monthlyHeader = largerContainer;
        }
      }
      if (monthlyHeader) {
        monthlyHeader.style.backgroundColor = '';
        monthlyHeader.style.border = '';
        monthlyHeader.style.borderRadius = '';
        monthlyHeader.style.transform = '';
        monthlyHeader.style.zIndex = '';
        monthlyHeader.style.transition = '';
        monthlyHeader.style.boxShadow = '';
        monthlyHeader.style.padding = '';
      }
    }

    const comparativeTitle = Array.from(document.querySelectorAll('h2, h3')).find(h => 
      h.textContent.includes('Comparativo')
    );
    if (comparativeTitle) {
      let comparativeHeader = comparativeTitle.closest('div, section, article');
      if (comparativeHeader && comparativeHeader.offsetHeight < 200) {
        comparativeHeader = comparativeHeader.parentElement;
      }
      if (comparativeHeader && comparativeHeader.offsetHeight < 200) {
        const largerContainer = comparativeTitle.closest('[class*="comparative"], [class*="chart"], [class*="graph"]') ||
                             comparativeTitle.closest('.space-y-12 > div') ||
                             comparativeTitle.closest('main > div');
        if (largerContainer) {
          comparativeHeader = largerContainer;
        }
      }
      if (comparativeHeader) {
        comparativeHeader.style.backgroundColor = '';
        comparativeHeader.style.border = '';
        comparativeHeader.style.borderRadius = '';
        comparativeHeader.style.transform = '';
        comparativeHeader.style.zIndex = '';
        comparativeHeader.style.transition = '';
        comparativeHeader.style.boxShadow = '';
        comparativeHeader.style.padding = '';
      }
    }

    if (isTourActive) {
      const currentStepData = getCurrentStep();
      if (currentStepData?.target && currentStepData.target !== 'body') {
        const targetElement = findTargetElement(currentStepData.target);
        
        if (targetElement === 'stats-cards') {
          // Buscar cards de estatísticas com seletores mais flexíveis
          let cardsToHighlight = document.querySelectorAll('main .grid.grid-cols-1 > div, main .grid.md\\:grid-cols-2 > div, main .grid.lg\\:grid-cols-3 > div');
          // Se não encontrar, tentar buscar qualquer grid dentro de main que tenha cards
          if (cardsToHighlight.length === 0) {
            const firstGrid = document.querySelector('main .grid');
            if (firstGrid) {
              cardsToHighlight = firstGrid.querySelectorAll(':scope > div');
              // Limitar aos primeiros 6 cards (geralmente são 3-6 cards de estatísticas)
              cardsToHighlight = Array.from(cardsToHighlight).slice(0, 6);
            }
          }
          
          // Destacar todos os cards de estatísticas encontrados
          cardsToHighlight.forEach((card) => {
            // Verificar se o card tem conteúdo relevante (não está vazio)
            if (card.offsetHeight > 50 && card.offsetWidth > 100) {
              card.style.position = 'relative';
              card.style.zIndex = '50';
              card.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
              card.style.border = '3px solid rgba(59, 130, 246, 0.5)';
              card.style.borderRadius = '12px';
              card.style.transition = 'all 0.3s ease';
              card.style.transform = 'scale(1.03)';
              card.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
              highlightedElementsRef.current.push(card); // Rastrear
            }
          });
          
          // Rolar para o primeiro card se encontrou algum
          if (cardsToHighlight.length > 0) {
            setTimeout(() => {
              cardsToHighlight[0].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }, 100);
          }
        } else if (targetElement === 'quick-actions') {
          // Destacar o card de ações rápidas - múltiplas tentativas
          let quickActionsCard = null;
          
          // Tentativa 1: Seletor específico
          quickActionsCard = document.querySelector('main .space-y-8 > div:nth-child(3)');
          
          // Tentativa 2: Procurar por div que contém "Ações Rápidas"
          if (!quickActionsCard) {
            const allDivs = document.querySelectorAll('main .space-y-8 > div');
            quickActionsCard = Array.from(allDivs).find(div => 
              div.textContent.includes('Ações Rápidas')
            );
          }
          
          // Tentativa 3: Procurar em toda a main
          if (!quickActionsCard) {
            const allMainDivs = document.querySelectorAll('main div');
            quickActionsCard = Array.from(allMainDivs).find(div => 
              div.textContent.includes('Ações Rápidas') && 
              div.offsetHeight > 100 // Deve ter uma altura razoável
            );
          }
          
          // Tentativa 4: Procurar por botões de ação rápida
          if (!quickActionsCard) {
            const actionButtons = document.querySelectorAll('button, a');
            const quickActionButton = Array.from(actionButtons).find(btn => 
              btn.textContent.includes('Nova Transação') || 
              btn.textContent.includes('Ver Transações')
            );
            if (quickActionButton) {
              quickActionsCard = quickActionButton.closest('div, section, article');
            }
          }
          
          if (quickActionsCard) {
            quickActionsCard.style.position = 'relative';
            quickActionsCard.style.zIndex = '50';
            quickActionsCard.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
            quickActionsCard.style.border = '3px solid rgba(59, 130, 246, 0.5)';
            quickActionsCard.style.borderRadius = '12px';
            quickActionsCard.style.transition = 'all 0.3s ease';
            quickActionsCard.style.transform = 'scale(1.03)';
            quickActionsCard.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
            highlightedElementsRef.current.push(quickActionsCard); // Rastrear
            
            // Rolar a tela para mostrar melhor as ações rápidas
            setTimeout(() => {
              quickActionsCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }, 100);
          }
        } else if (targetElement === 'monthly-analysis-header') {
          // Destacar o container completo da análise mensal (incluindo seletor de mês)
          const monthlyTitle = Array.from(document.querySelectorAll('h2, h3')).find(h => 
            h.textContent.includes('Análise do Mês')
          );
          if (monthlyTitle) {
            // Procurar por um container maior que inclui título + seletor + gráfico
            let monthlyHeader = monthlyTitle.closest('div, section, article');
            
            // Se o container pai for muito pequeno, subir mais na hierarquia
            if (monthlyHeader && monthlyHeader.offsetHeight < 200) {
              monthlyHeader = monthlyHeader.parentElement;
            }
            
            // Se ainda for pequeno, procurar por um container com classe específica
            if (monthlyHeader && monthlyHeader.offsetHeight < 200) {
              const largerContainer = monthlyTitle.closest('[class*="analysis"], [class*="chart"], [class*="graph"]') ||
                                   monthlyTitle.closest('.space-y-12 > div') ||
                                   monthlyTitle.closest('main > div');
              if (largerContainer) {
                monthlyHeader = largerContainer;
              }
            }
            
            if (monthlyHeader) {
              monthlyHeader.style.position = 'relative';
              monthlyHeader.style.zIndex = '50';
              monthlyHeader.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
              monthlyHeader.style.border = '3px solid rgba(59, 130, 246, 0.5)';
              monthlyHeader.style.borderRadius = '12px';
              monthlyHeader.style.padding = '20px';
              monthlyHeader.style.transition = 'all 0.3s ease';
              monthlyHeader.style.transform = 'scale(1.03)';
              monthlyHeader.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
              highlightedElementsRef.current.push(monthlyHeader); // Rastrear
              
              // Rolar a tela para mostrar o container
              setTimeout(() => {
                monthlyHeader.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }, 100);
            }
          }
        } else if (targetElement === 'comparative-analysis-header') {
          // Destacar o container completo do comparativo mensal
          const comparativeTitle = Array.from(document.querySelectorAll('h2, h3')).find(h => 
            h.textContent.includes('Comparativo')
          );
          if (comparativeTitle) {
            // Procurar por um container maior que inclui título + seletor + gráfico
            let comparativeHeader = comparativeTitle.closest('div, section, article');
            
            // Se o container pai for muito pequeno, subir mais na hierarquia
            if (comparativeHeader && comparativeHeader.offsetHeight < 200) {
              comparativeHeader = comparativeHeader.parentElement;
            }
            
            // Se ainda for pequeno, procurar por um container com classe específica
            if (comparativeHeader && comparativeHeader.offsetHeight < 200) {
              const largerContainer = comparativeTitle.closest('[class*="comparative"], [class*="chart"], [class*="graph"]') ||
                                   comparativeTitle.closest('.space-y-12 > div') ||
                                   comparativeTitle.closest('main > div');
              if (largerContainer) {
                comparativeHeader = largerContainer;
              }
            }
            
            if (comparativeHeader) {
              comparativeHeader.style.position = 'relative';
              comparativeHeader.style.zIndex = '50';
              comparativeHeader.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
              comparativeHeader.style.border = '3px solid rgba(59, 130, 246, 0.5)';
              comparativeHeader.style.borderRadius = '12px';
              comparativeHeader.style.padding = '20px';
              comparativeHeader.style.transition = 'all 0.3s ease';
              comparativeHeader.style.transform = 'scale(1.03)';
              comparativeHeader.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
              highlightedElementsRef.current.push(comparativeHeader); // Rastrear
              
              // Rolar a tela para mostrar o container
              setTimeout(() => {
                comparativeHeader.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }, 100);
            }
          }
        } else if (targetElement && typeof targetElement === 'object') {
          // LÓGICA GENÉRICA - MESMO PADRÃO DO DASHBOARD
          // Determinar o elemento correto a destacar
          let elementToHighlight = targetElement;
          
          // Se for botão, pegar o card pai
          if (targetElement.tagName === 'BUTTON') {
            const parent = targetElement.closest('[class*="Card"], .card, main > div');
            if (parent && parent !== document.querySelector('main')) {
              elementToHighlight = parent;
            }
          }
          
          // Se for grid, pegar os filhos diretos (cards)
          if (targetElement.classList && targetElement.classList.contains('grid')) {
            const cards = targetElement.querySelectorAll(':scope > div, :scope > [class*="Card"]');
            if (cards.length > 0) {
              // Destacar todos os cards do grid
              cards.forEach(card => {
                card.style.position = 'relative';
                card.style.zIndex = '50';
                card.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                card.style.border = '3px solid rgba(59, 130, 246, 0.5)';
                card.style.borderRadius = '12px';
                card.style.transition = 'all 0.3s ease';
                card.style.transform = 'scale(1.03)';
                card.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
                highlightedElementsRef.current.push(card);
              });
              
              // Rolar para o primeiro card
              setTimeout(() => {
                cards[0].scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }, 100);
              return;
            }
          }
          
          // Aplicar highlight IGUAL ao dashboard
          elementToHighlight.style.position = 'relative';
          elementToHighlight.style.zIndex = '50';
          elementToHighlight.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
          elementToHighlight.style.border = '3px solid rgba(59, 130, 246, 0.5)';
          elementToHighlight.style.borderRadius = '12px';
          elementToHighlight.style.transition = 'all 0.3s ease';
          elementToHighlight.style.transform = 'scale(1.03)';
          elementToHighlight.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.3)';
          highlightedElementsRef.current.push(elementToHighlight);
          
          // Rolar para o elemento destacado
          setTimeout(() => {
            elementToHighlight.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 100);
        }
      }
    }
  }, [isTourActive, currentStep, router.asPath]);

  // Limpar highlight quando componente desmontar
  useEffect(() => {
    return () => {
      clearAllHighlights();
    };
  }, []);
  
  // Limpar highlight quando tour terminar
  useEffect(() => {
    if (!isTourActive) {
      clearAllHighlights();
    }
  }, [isTourActive]);


  const handleClick = () => {
    setShowChatModal(true);
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
  };



  const handleTipAction = () => {
    if (currentTip?.tourAction) {
      // Verificar se o tour já foi completado
      const path = window.location.pathname;
      const tourType = getTourTypeFromRoute(path);
      
      if (isTourCompleted(tourType)) {
        // Tour já completado, abrir chat
        setShowChatModal(true);
        setHasNewTip(false);
      } else {
        // Iniciar tour se disponível
        const userName = user?.name || null;
        const tourSteps = getTourForRoute(path, userName);
        if (tourSteps.length > 0) {
          startTour(tourSteps, tourType);
          setHasNewTip(false);
        } else {
          setShowChatModal(true);
          setHasNewTip(false);
        }
      }
    } else {
      setShowChatModal(true);
      setHasNewTip(false);
    }
  };

  // Iniciar tour automaticamente em QUALQUER página que tenha tour disponível
  useEffect(() => {
    const path = router.asPath;
    
    // Se mudou de rota E há um tour ativo, cancelar o tour anterior
    if (previousPathRef.current && previousPathRef.current !== path && isTourActive) {
      skipTour();
    }
    
    // Atualizar ref do path anterior
    previousPathRef.current = path;
    
    // Não iniciar se ainda está carregando
    if (orgLoading || !organization || !user) {
      return;
    }
    
    // Não iniciar se já está em um tour
    if (isTourActive) {
      return;
    }
    
    // Verificar se há tour disponível para esta página
    const userName = user?.name || null;
    const tourSteps = getTourForRoute(path, userName);
    
    // Se não tem tour para esta página, não fazer nada
    if (!tourSteps || tourSteps.length === 0) {
      return;
    }
    
    // Extrair tipo do tour da rota
    const tourType = getTourTypeFromRoute(path);
    
    // Verificar se o tour já foi completado (no banco)
    const isCompleted = isTourCompleted(tourType);
    
    // Verificar se o tour foi fechado nesta sessão (sessionStorage)
    let isSkippedInSession = false;
    if (typeof window !== 'undefined' && tourType) {
      try {
        const skippedTours = JSON.parse(sessionStorage.getItem('skipped_tours') || '{}');
        isSkippedInSession = skippedTours[tourType] === true;
      } catch (error) {
        console.error('Erro ao verificar tour fechado na sessão:', error);
      }
    }
    
    // Se o tour foi completado no banco, não iniciar
    if (isCompleted) {
      return;
    }
    
    // Se o tour foi fechado nesta sessão, não iniciar (aparecerá no próximo login)
    if (isSkippedInSession) {
      return;
    }
    
    // Verificar se LoadingLogo está visível no DOM
    const checkLoadingLogo = () => {
      const loadingLogo = document.querySelector('.logo-base, .logo-fill, [alt="Carregando..."]');
      return loadingLogo && loadingLogo.offsetParent !== null;
    };

    // Polling para iniciar tour quando LoadingLogo desaparecer
    const checkInterval = setInterval(() => {
      if (!checkLoadingLogo()) {
        // LoadingLogo não está mais visível
        setTimeout(() => {
          // Verificar novamente se ainda está na mesma página e não está em tour
          if (router.asPath === path && !isTourActive && !orgLoading) {
            const currentTourType = getTourTypeFromRoute(router.asPath);
            const currentIsCompleted = isTourCompleted(currentTourType);
            
            // Verificar se foi fechado nesta sessão
            let currentIsSkipped = false;
            if (typeof window !== 'undefined' && currentTourType) {
              try {
                const skippedTours = JSON.parse(sessionStorage.getItem('skipped_tours') || '{}');
                currentIsSkipped = skippedTours[currentTourType] === true;
              } catch (error) {
                // Ignorar erro
              }
            }
            
            if (!currentIsCompleted && !currentIsSkipped) {
              const currentTourSteps = getTourForRoute(router.asPath, userName);
              if (currentTourSteps && currentTourSteps.length > 0) {
                startTour(currentTourSteps, currentTourType);
              }
            }
          }
        }, 1500); // 1.5s após loading desaparecer
        clearInterval(checkInterval);
      }
    }, 100);

    // Timeout de segurança: iniciar após 3s mesmo se LoadingLogo ainda visível
    const safetyTimeout = setTimeout(() => {
      if (router.asPath === path && !isTourActive && !orgLoading) {
        const currentTourType = getTourTypeFromRoute(router.asPath);
        const currentIsCompleted = isTourCompleted(currentTourType);
        
        // Verificar se foi fechado nesta sessão
        let currentIsSkipped = false;
        if (typeof window !== 'undefined' && currentTourType) {
          try {
            const skippedTours = JSON.parse(sessionStorage.getItem('skipped_tours') || '{}');
            currentIsSkipped = skippedTours[currentTourType] === true;
          } catch (error) {
            // Ignorar erro
          }
        }
        
        if (!currentIsCompleted && !currentIsSkipped) {
          const currentTourSteps = getTourForRoute(router.asPath, userName);
          if (currentTourSteps && currentTourSteps.length > 0) {
            startTour(currentTourSteps, currentTourType);
          }
        }
      }
      clearInterval(checkInterval);
    }, 3000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(safetyTimeout);
    };
  }, [router.asPath, orgLoading, organization, user, isTourActive, isTourCompleted, startTour, skipTour]);

  // Scroll automático quando novas mensagens são adicionadas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Inicializar chat com mensagem de boas-vindas personalizada
  useEffect(() => {
    if (showChatModal && messages.length === 0) {
      // Pegar primeiro nome da tabela users
      const getFirstName = () => {
        if (user?.name) {
          return user.name.split(' ')[0];
        }
        return null;
      };

      const firstName = getFirstName();
      const greeting = firstName 
        ? t('web.zulFloatingButton.heyHowCanIHelp', { firstName })
        : t('web.zulFloatingButton.heyHowCanIHelp2');

      setMessages([
        {
          id: 1,
          type: 'zul',
          message: greeting,
          timestamp: new Date()
        }
      ]);
    }
  }, [showChatModal, messages.length, user]);

  // Fechar chat ao clicar fora (desktop e mobile)
  useEffect(() => {
    if (!showChatModal) return;

    const handleClickOutside = (event) => {
      // Não fechar se clicou no botão do Zul ou no próprio chat
      if (
        chatModalRef.current &&
        !chatModalRef.current.contains(event.target) &&
        !event.target.closest('#zul-button')
      ) {
        handleCloseChat();
      }
    };

    // Adicionar listener com pequeno delay para evitar fechar imediatamente ao abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showChatModal]);

  // Coletar TODOS os dados financeiros da organização para o Zul
  const getFinancialContext = async () => {
    if (!organization || !user) return null;
    
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const startOfMonth = `${currentMonth}-01`;
      const [year, month] = currentMonth.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

      // Buscar TODAS as despesas do mês (usando sintaxe correta do Supabase)
      let expenses = [];
      
      // Usar query similar ao dashboard (sem relacionamentos complexos)
      const expensesResult = await supabase
        .from('expenses')
        .select(`
          *,
          expense_splits (
            id,
            cost_center_id,
            percentage,
            amount
          )
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      if (expensesResult.error) {
        console.error('❌ [ZUL] Erro ao buscar despesas:', expensesResult.error);
        // Tentar query mais simples
        const expensesSimpleResult = await supabase
          .from('expenses')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .order('date', { ascending: false });
        
        if (expensesSimpleResult.error) {
          console.error('❌ [ZUL] Erro ao buscar despesas (query simples):', expensesSimpleResult.error);
        } else {
          expenses = expensesSimpleResult.data || [];
        }
      } else {
        expenses = expensesResult.data || [];
      }

      // Buscar TODAS as entradas do mês (usando sintaxe correta do Supabase)
      let incomes = [];
      
      const incomesResult = await supabase
        .from('incomes')
        .select(`
          *,
          cost_center:cost_centers(name, color),
          income_splits(
            id,
            cost_center_id,
            percentage,
            amount
          )
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      if (incomesResult.error) {
        console.error('❌ [ZUL] Erro ao buscar entradas:', incomesResult.error);
        // Tentar query mais simples
        const incomesSimpleResult = await supabase
          .from('incomes')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .order('date', { ascending: false });
        
        if (incomesSimpleResult.error) {
          console.error('❌ [ZUL] Erro ao buscar entradas (query simples):', incomesSimpleResult.error);
        } else {
          incomes = incomesSimpleResult.data || [];
        }
      } else {
        incomes = incomesResult.data || [];
      }

      // Buscar TODOS os cartões
      const { data: cards } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Calcular uso dos cartões
      const cardsUsage = {};
      if (cards && expenses) {
        for (const card of cards) {
          if (card.type === 'credit') {
            const cardExpenses = expenses.filter(e => e.card_id === card.id && e.payment_method === 'credit_card');
            const used = cardExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            cardsUsage[card.id] = {
              used,
              limit: card.credit_limit || 0,
              available: (card.credit_limit || 0) - used
            };
          }
        }
      }

      // Buscar contas bancárias
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Calcular totais
      const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
      const totalIncomes = incomes?.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
      const balance = totalIncomes - totalExpenses;

      // Despesas por forma de pagamento
      const creditExpenses = expenses?.filter(e => e.payment_method === 'credit_card')
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
      const cashExpenses = totalExpenses - creditExpenses;

      // Buscar categorias e cost centers separadamente se necessário
      let categoryMap = {};
      let costCenterMap = {};
      
      // Se expenses não tem categoria expandida, buscar separadamente
      if (expenses && expenses.length > 0) {
        const categoryIds = [...new Set(expenses.map(e => e.category_id).filter(Boolean))];
        if (categoryIds.length > 0) {
          const { data: categoriesData } = await supabase
            .from('budget_categories')
            .select('id, name')
            .in('id', categoryIds);
          if (categoriesData) {
            categoryMap = categoriesData.reduce((acc, cat) => {
              acc[cat.id] = cat.name;
              return acc;
            }, {});
          }
        }
        
        // Buscar cost centers
        const costCenterIds = [...new Set(expenses.map(e => e.cost_center_id).filter(Boolean))];
        if (costCenterIds.length > 0) {
          const { data: costCentersData } = await supabase
            .from('cost_centers')
            .select('id, name')
            .in('id', costCenterIds);
          if (costCentersData) {
            costCenterMap = costCentersData.reduce((acc, cc) => {
              acc[cc.id] = cc.name;
              return acc;
            }, {});
          }
        }
      }

      // Despesas por categoria
      const categoryTotals = {};
      expenses?.forEach(e => {
        const catName = categoryMap[e.category_id] || 'Outros';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(e.amount || 0);
      });
      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }));

      // Despesas por cost center/responsável
      const ownerTotals = {};
      expenses?.forEach(e => {
        const ownerName = costCenterMap[e.cost_center_id] || t('web.shared.shared2');
        ownerTotals[ownerName] = (ownerTotals[ownerName] || 0) + parseFloat(e.amount || 0);
      });
      const expensesByOwner = Object.entries(ownerTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }));

      // Buscar dados dos últimos 6 meses para comparação
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);
        const monthStart = `${monthStr}-01`;
        const [y, m] = monthStr.split('-');
        const lastDay = new Date(y, m, 0).getDate();
        const monthEnd = `${y}-${m}-${lastDay.toString().padStart(2, '0')}`;

        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        const { data: monthIncomes } = await supabase
          .from('incomes')
          .select('amount')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', monthStart)
          .lte('date', monthEnd);

        const monthTotalExpenses = monthExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const monthTotalIncomes = monthIncomes?.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;

        monthlyData.push({
          month: monthStr,
          expenses: monthTotalExpenses,
          incomes: monthTotalIncomes,
          balance: monthTotalIncomes - monthTotalExpenses
        });
      }

      // Buscar orçamentos do mês atual
      let budgets = [];
      const budgetsResult = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', startOfMonth)
        .order('created_at', { ascending: false });

      if (budgetsResult.error) {
        console.error('❌ [ZUL] Erro ao buscar orçamentos:', budgetsResult.error);
      } else {
        budgets = budgetsResult.data || [];
        
        // Buscar nomes das categorias se houver budgets
        if (budgets.length > 0) {
          const categoryIds = [...new Set(budgets.map(b => b.category_id).filter(Boolean))];
          if (categoryIds.length > 0) {
            const { data: budgetCategories } = await supabase
              .from('budget_categories')
              .select('id, name')
              .in('id', categoryIds);
            
            const budgetCategoryMap = (budgetCategories || []).reduce((acc, cat) => {
              acc[cat.id] = cat.name;
              return acc;
            }, {});
            
            // Adicionar nome da categoria aos budgets
            budgets = budgets.map(b => ({
              ...b,
              category_name: budgetCategoryMap[b.category_id] || 'Sem categoria'
            }));
          }
        }
      }

      return {
        month: currentMonth,
        summary: {
          totalIncomes: Number(totalIncomes.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          balance: Number(balance.toFixed(2)),
          creditExpenses: Number(creditExpenses.toFixed(2)),
          cashExpenses: Number(cashExpenses.toFixed(2)),
          creditPercentage: totalExpenses > 0 ? Number((creditExpenses / totalExpenses * 100).toFixed(1)) : 0,
          cashPercentage: totalExpenses > 0 ? Number((cashExpenses / totalExpenses * 100).toFixed(1)) : 0
        },
        topCategories,
        expensesByOwner,
        cards: cards?.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          limit: c.credit_limit || 0,
          used: cardsUsage[c.id]?.used || 0,
          available: cardsUsage[c.id]?.available || 0,
          usagePercentage: c.credit_limit > 0 ? Number((cardsUsage[c.id]?.used || 0) / c.credit_limit * 100).toFixed(1) : 0
        })) || [],
        bankAccounts: bankAccounts?.map(acc => ({
          name: acc.name,
          type: acc.type,
          balance: Number((acc.current_balance || 0).toFixed(2))
        })) || [],
        monthlyTrend: monthlyData,
        organization: {
          name: organization.name,
          memberCount: costCenters?.filter(cc => cc.is_active !== false).length || 0,
          costCenters: costCenters?.filter(cc => cc.is_active !== false).map(cc => ({
            name: cc.name,
            color: cc.color
          })) || []
        },
        budgets: budgets?.map(b => ({
          name: b.category_name || 'Sem categoria',
          category: b.category_name || 'Geral',
          amount: Number((b.limit_amount || 0).toFixed(2)),
          spent: Number((b.current_spent || 0).toFixed(2)) // Usar current_spent do banco se disponível
        })) || [],
        // Dados completos para análise detalhada
        allExpenses: expenses?.map(e => ({
          id: e.id,
          description: e.description,
          amount: Number((e.amount || 0).toFixed(2)),
          date: e.date,
          category: categoryMap[e.category_id] || 'Outros',
          paymentMethod: e.payment_method,
          owner: costCenterMap[e.cost_center_id] || 'Compartilhado',
          isShared: e.is_shared || false
        })) || [],
        allIncomes: incomes?.map(i => ({
          id: i.id,
          description: i.description,
          amount: Number((i.amount || 0).toFixed(2)),
          date: i.date,
          category: 'Outros', // Incomes não tem categoria no select atual
          owner: i.cost_center?.name || 'Compartilhado',
          isShared: i.is_shared || false
        })) || []
      };
    } catch (error) {
      console.error('Error fetching financial context:', error);
      return null;
    }
  };

  // Enviar mensagem para o Zul com streaming
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // ID da mensagem do Zul que será criada quando o primeiro chunk chegar
    const zulMessageId = Date.now() + 1;

    try {
      // Coletar contexto financeiro completo
      const financialContext = await getFinancialContext();
      
      console.log('📊 [ZUL] Contexto financeiro coletado:', financialContext ? 'Sim' : 'Não');
      if (financialContext) {
        console.log('📊 [ZUL] Resumo:', financialContext.summary);
        console.log('📊 [ZUL] Saldo:', financialContext.summary?.balance);
        console.log('📊 [ZUL] Total de despesas:', financialContext.allExpenses?.length || 0);
        console.log('📊 [ZUL] Mês:', financialContext.month);
        console.log('📊 [ZUL] Context keys:', Object.keys(financialContext));
      }
      
      // Preparar histórico de conversa (últimas 5 mensagens para contexto)
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.message
      }));
      
      const requestBody = {
        message: userInput,
        userId: user?.id || 'web-user',
        userName: user?.name || 'Usuário Web',
        organizationId: organization?.id,
        context: financialContext || {}, // TODOS os dados financeiros (ou objeto vazio se não houver)
        conversationHistory: conversationHistory // Histórico de conversa para contexto
      };
      
      console.log('📤 [ZUL] Enviando requisição com streaming:', {
        hasContext: !!requestBody.context,
        hasSummary: !!requestBody.context?.summary,
        summaryBalance: requestBody.context?.summary?.balance,
        month: requestBody.context?.month,
        historyLength: conversationHistory.length
      });
      
      // Fazer requisição com streaming
      const response = await fetch('/api/zul-chat?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ler stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasReceivedContent = false; // Flag para saber se já recebeu conteúdo

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Manter última linha incompleta no buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.done) {
                setIsLoading(false);
                continue;
              }
              
              if (data.content) {
                // Se ainda não recebeu conteúdo, criar mensagem do Zul e remover loading
                if (!hasReceivedContent) {
                  hasReceivedContent = true;
                  setIsLoading(false);
                  
                  // Criar mensagem do Zul com o primeiro chunk
                  const zulMessage = {
                    id: zulMessageId,
                    type: 'zul',
                    message: data.content,
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, zulMessage]);
                } else {
                  // Atualizar mensagem do Zul em tempo real com chunks subsequentes
                  setMessages(prev => prev.map(msg => 
                    msg.id === zulMessageId 
                      ? { ...msg, message: msg.message + data.content }
                      : msg
                  ));
                }
              }
            } catch (parseError) {
              console.error('Erro ao parsear SSE:', parseError);
            }
          }
        }
      }

      setIsLoading(false);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Remover mensagem vazia e adicionar mensagem de erro
      setMessages(prev => prev.filter(msg => msg.id !== zulMessageId));
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'zul',
        message: t('web.zulFloatingButton.sorrySomethingWentWrongTry'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Enviar com Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Não mostrar se ainda não carregou ou se não deve mostrar o Zul
  if (!isVisible || !showZul) return null;

  return (
    <>
      {/* Botão Flutuante */}
      <div className="fixed bottom-12 right-8 md:bottom-16 md:right-10 z-50">
        {/* Logo do Zul */}
        <div 
          id="zul-button"
          onClick={handleClick}
          className="relative cursor-pointer hover:opacity-80 transition-all duration-300 group"
        >
          <Image
            src="/images/logo_flat.svg"
            alt="Zul Assistant"
            width={56}
            height={56}
            className="scale-x-[-1] w-14 h-14"
          />
        </div>
      </div>


      {/* Card de dicas/tour - Responsivo para mobile */}
      {((showTip && currentTip) || isTourActive) && (
        <div className="fixed bottom-32 right-8 md:bottom-32 md:right-32 w-[calc(100vw-32px)] md:w-72 max-w-sm z-[60] pointer-events-auto">
          <Card className="shadow-2xl border border-gray-200 bg-white animate-in slide-in-from-bottom-2 duration-300 relative">
            {/* X no canto superior direito para tour */}
            {isTourActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={skipTour}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
              >
                <X className="h-3 w-3 text-gray-500" />
              </Button>
            )}
            
            <CardContent className="p-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">
                  {isTourActive ? getCurrentStep()?.title : currentTip?.title}
                </h4>
                <p className="text-xs text-gray-600">
                  {isTourActive ? getCurrentStep()?.description : currentTip?.message}
                </p>
                
                {/* Dica especial do tour */}
                {isTourActive && getCurrentStep()?.tip && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800 font-medium leading-relaxed">
                        {getCurrentStep()?.tip}
                      </p>
                    </div>
                  </div>
                )}

                {/* Indicador de progresso do tour */}
                {isTourActive && tourSteps.length > 0 && (
                  <div className="flex items-center justify-center space-x-1.5 pt-2">
                    {tourSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === currentStep
                            ? 'bg-blue-600 w-6'
                            : index < currentStep
                            ? 'bg-blue-400 w-2'
                            : 'bg-gray-300 w-2'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="flex space-x-2">
                  {isTourActive ? (
                    <>
                      {!isFirstStep() && (
                        <Button
                          size="sm"
                          onClick={prevStep}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs px-3 py-1 h-7"
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" />
                          {t('web.shared.previous')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={isLastStep() ? completeTour : nextStep}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs px-3 py-1 h-7 flex-1"
                      >
                        {isLastStep() ? t('web.zulFloatingButton.finish') : t('web.shared.next')}
                        {!isLastStep() && <ChevronRight className="h-3 w-3 ml-1" />}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={handleTipAction}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs px-3 py-1 h-7"
                      >
                        {currentTip?.action}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={dismissTip}
                        className="text-gray-500 text-xs px-3 py-1 h-7"
                      >
                        {t('web.zulFloatingButton.later')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Chat - Responsivo para mobile */}
      {showChatModal && (
        <>
          {/* Backdrop 100% transparente para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 bg-transparent z-[45]"
            onClick={handleCloseChat}
          />
          
          <div 
            ref={chatModalRef}
            className="fixed bottom-12 right-8 md:bottom-32 md:right-32 w-[calc(100vw-32px)] md:w-[28rem] max-w-md z-50 pointer-events-auto"
          >
            <div className="bg-blue-50 rounded-xl shadow-xl w-full h-[calc(100vh-120px)] md:h-[75vh] max-h-[600px] flex flex-col border border-blue-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/logo_flat.svg"
                    alt="Zul Assistant"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Zul</h2>
                  <p className="text-xs text-gray-500">{t('web.zulFloatingButton.moneyAssistant')}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseChat} className="h-8 w-8">
                <X className="h-4 w-4 text-gray-500" />
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-end space-x-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* Mensagens do Zul: Avatar à esquerda, mensagem à direita */}
                    {msg.type === 'zul' && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/images/logo_flat.svg"
                          alt="Zul"
                          width={24}
                          height={24}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                    )}
                    
                    {/* Mensagem */}
                    <div className={`rounded-lg p-3 ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm max-w-xs' 
                        : 'bg-white border border-gray-200 rounded-tl-sm max-w-[85%] md:max-w-md'
                    }`}>
                      <div 
                        className={`text-sm whitespace-pre-wrap ${
                          msg.type === 'user' ? 'text-white' : 'text-gray-900'
                        }`}
                        dangerouslySetInnerHTML={{ 
                          __html: formatZulMessage(msg.message, msg.type === 'user')
                        }}
                      />
                    </div>
                    
                    {/* Mensagens do usuário: Avatar à direita */}
                    {msg.type === 'user' && user && (
                      <Avatar 
                        src={user.avatar_url} 
                        name={user.name} 
                        size="sm"
                        color={avatarColor}
                      />
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-tl-sm p-3 max-w-xs border border-gray-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Elemento para scroll automático */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder={t('web.zulFloatingButton.typeAMessage')}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <Button 
                  size="sm" 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isLoading ? '...' : t('web.zulFloatingButton.send')}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* REMOVIDO: Onboarding automático do Zul - desabilitado */}
      {/* <OnboardingOverlay
        steps={zulWebOnboardingSteps}
        isOpen={showZulOnboarding}
        onComplete={() => setShowZulOnboarding(false)}
        onSkip={() => setShowZulOnboarding(false)}
        storageKey="zul_web"
      /> */}

    </>
  );
}