import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { useZulTips } from '../hooks/useZulTips';
import { useTour } from '../hooks/useTour';
import { getTourForRoute } from '../data/tourSteps';
import { useOrganization } from '../hooks/useOrganization';
import Image from 'next/image';

export default function ZulFloatingButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const { organization, user, loading: orgLoading } = useOrganization();
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
  const { currentTip, showTip, hasNewTip, dismissTip, setHasNewTip } = useZulTips(isTourActive);

  // Mostrar botão após carregar
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Função para encontrar elemento alvo
  const findTargetElement = (target) => {
    if (target === 'body') return null;
    
    // Casos especiais para elementos do dashboard
    if (target === 'stats-cards') {
      return 'stats-cards'; // Flag especial para tratar no useEffect
    }
    
    if (target === 'quick-actions') {
      return 'quick-actions'; // Flag especial para tratar no useEffect
    }
    
    if (target === 'monthly-analysis-header') {
      return 'monthly-analysis-header'; // Flag especial para tratar no useEffect
    }
    
    if (target === 'comparative-analysis-header') {
      return 'comparative-analysis-header'; // Flag especial para tratar no useEffect
    }
    
    return document.querySelector(target);
  };

  // Adicionar highlight ao elemento alvo durante o tour
  useEffect(() => {
    // SEMPRE limpar highlights anteriores primeiro
    const statsCards = document.querySelectorAll('main .grid.gap-3.grid-cols-1.md\\:grid-cols-3 > div');
    statsCards.forEach(card => {
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
          // Destacar todos os cards de estatísticas
          statsCards.forEach((card) => {
            card.style.position = 'relative';
            card.style.zIndex = '10';
            card.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            card.style.border = '2px solid rgba(59, 130, 246, 0.3)';
            card.style.borderRadius = '12px';
            card.style.transition = 'all 0.3s ease';
            card.style.transform = 'scale(1.02)';
            card.style.boxShadow = 'none';
          });
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
          
          console.log('Quick actions card found:', quickActionsCard); // Debug
          
          if (quickActionsCard) {
            quickActionsCard.style.position = 'relative';
            quickActionsCard.style.zIndex = '10';
            quickActionsCard.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            quickActionsCard.style.border = '2px solid rgba(59, 130, 246, 0.3)';
            quickActionsCard.style.borderRadius = '12px';
            quickActionsCard.style.transition = 'all 0.3s ease';
            quickActionsCard.style.transform = 'scale(1.02)';
            quickActionsCard.style.boxShadow = 'none';
            
            // Rolar a tela para mostrar melhor as ações rápidas
            setTimeout(() => {
              quickActionsCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }, 100);
          } else {
            console.log('Quick actions card not found!'); // Debug
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
              monthlyHeader.style.zIndex = '10';
              monthlyHeader.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              monthlyHeader.style.border = '2px solid rgba(59, 130, 246, 0.3)';
              monthlyHeader.style.borderRadius = '12px';
              monthlyHeader.style.padding = '20px';
              monthlyHeader.style.transition = 'all 0.3s ease';
              monthlyHeader.style.transform = 'scale(1.02)';
              monthlyHeader.style.boxShadow = 'none';
              
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
              comparativeHeader.style.zIndex = '10';
              comparativeHeader.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              comparativeHeader.style.border = '2px solid rgba(59, 130, 246, 0.3)';
              comparativeHeader.style.borderRadius = '12px';
              comparativeHeader.style.padding = '20px';
              comparativeHeader.style.transition = 'all 0.3s ease';
              comparativeHeader.style.transform = 'scale(1.02)';
              comparativeHeader.style.boxShadow = 'none';
              
              // Rolar a tela para mostrar o container
              setTimeout(() => {
                comparativeHeader.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }, 100);
            }
          }
        }
      }
    }
  }, [isTourActive, currentStep]);

  // Limpar highlight quando componente desmontar
  useEffect(() => {
    return () => {
      if (highlightedElement) {
        // Limpar todos os cards de estatísticas
        if (highlightedElement === 'stats-cards' || highlightedElement?.length > 0) {
          const statsCards = document.querySelectorAll('main .grid.gap-3.grid-cols-1.md\\:grid-cols-3 > div');
          statsCards.forEach(card => {
            card.style.backgroundColor = '';
            card.style.border = '';
            card.style.borderRadius = '';
            card.style.transform = '';
            card.style.zIndex = '';
            card.style.transition = '';
            card.style.boxShadow = ''; // Restaurar sombra original
          });
        } else if (highlightedElement) {
          highlightedElement.style.backgroundColor = '';
          highlightedElement.style.border = '';
          highlightedElement.style.borderRadius = '';
          highlightedElement.style.transform = '';
          highlightedElement.style.boxShadow = '';
          highlightedElement.style.zIndex = '';
          highlightedElement.style.transition = '';
        }
      }
    };
  }, [highlightedElement]);


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
      const tourType = path.replace('/dashboard', '') || 'dashboard';
      
      if (isTourCompleted(tourType)) {
        // Tour já completado, abrir chat
        setShowChatModal(true);
        setHasNewTip(false);
      } else {
        // Iniciar tour se disponível
        const tourSteps = getTourForRoute(path);
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

  // Iniciar tour automaticamente no dashboard
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/dashboard' && !isTourActive && !isTourCompleted('dashboard')) {
      console.log('Iniciando tour do dashboard automaticamente');
      const tourSteps = getTourForRoute(path);
      if (tourSteps.length > 0) {
        console.log('Tour steps encontrados:', tourSteps.length);
        // Pequeno delay para garantir que a página carregou
        const timer = setTimeout(() => {
          console.log('Iniciando tour após delay...');
          startTour(tourSteps, 'dashboard');
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isTourActive, isTourCompleted, startTour, getTourForRoute]);

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
        ? `E aí, ${firstName}! 👋 Como posso te ajudar hoje?`
        : 'E aí! 👋 Como posso te ajudar hoje?';

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



  // Enviar mensagem para o Zul
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/zul-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          userId: 'web-user',
          userName: user?.name || 'Usuário Web'
        })
      });

      const data = await response.json();

      if (data.success) {
        const zulMessage = {
          id: Date.now() + 1,
          type: 'zul',
          message: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, zulMessage]);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'zul',
        message: 'Desculpe, ocorreu um erro. Tente novamente em alguns instantes.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
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

  // if (!isVisible) return null; // Temporariamente comentado para debug

  return (
    <>
      {/* Botão Flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Logo do Zul */}
        <div 
          id="zul-button"
          onClick={handleClick}
          className="relative cursor-pointer hover:opacity-80 transition-all duration-300 group"
        >
          <Image
            src="/images/logo_flat.svg"
            alt="Zul Assistant"
            width={128}
            height={128}
            className="scale-x-[-1]"
          />
        </div>
      </div>


      {/* Card de dicas/tour - MESMA POSIÇÃO ORIGINAL */}
      {((showTip && currentTip) || isTourActive) && (
        <div className="fixed bottom-28 right-28 w-72 z-50 pointer-events-auto">
          <Card className="shadow-lg border border-gray-200 bg-white animate-in slide-in-from-bottom-2 duration-300 relative">
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

                <div className="flex space-x-2">
                  {isTourActive ? (
                    <>
                      {!isFirstStep() && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={prevStep}
                          className="text-xs px-3 py-1 h-7"
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" />
                          Anterior
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={isLastStep() ? completeTour : nextStep}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs px-3 py-1 h-7"
                      >
                        {isLastStep() ? 'Finalizar' : 'Próximo'}
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
                        Depois
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Chat */}
      {showChatModal && (
        <div className="fixed bottom-28 right-28 w-[28rem] z-50 pointer-events-auto">
          <div className="bg-blue-50 rounded-xl shadow-xl w-full h-[75vh] flex flex-col border border-blue-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/logo_flat.svg"
                    alt="Zul Assistant"
                    width={32}
                    height={32}
                    className="scale-125"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Zul</h2>
                  <p className="text-xs text-gray-500">Assistente financeiro</p>
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
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-lg p-3 max-w-xs ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 rounded-tl-sm'
                    }`}>
                      <p 
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: msg.message
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        }}
                      />
                    </div>
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
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
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
                  {isLoading ? '...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}