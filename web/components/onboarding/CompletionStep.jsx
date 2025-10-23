import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

export default function CompletionStep({ organization, onComplete }) {
  useEffect(() => {
    // Criar confetes quando o componente montar
    const confettiCount = 400;
    const colors = ['#207DFF', '#5FFFA7', '#FF6B6B', '#FFD93D', '#A8E6CF'];
    
    for (let i = 0; i < confettiCount; i++) {
      createConfetti(colors);
    }
  }, []);

  const createConfetti = (colors) => {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animationDuration = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 8;
    
    // Ângulo aleatório de 0 a 360 graus
    const angle = Math.random() * 360;
    
    // Calcular distância necessária para alcançar as bordas da tela
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const maxDistance = Math.max(screenWidth, screenHeight);
    const velocity = maxDistance * 0.6 + Math.random() * maxDistance * 0.4; // 60-100% da tela
    
    // Calcular posição final baseada no ângulo
    const radians = (angle * Math.PI) / 180;
    const endX = Math.cos(radians) * velocity;
    const endY = Math.sin(radians) * velocity;
    
    confetti.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      opacity: 0.9;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      pointer-events: none;
      z-index: 9999;
      animation: confetti-explode-${angle.toFixed(0)} ${animationDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
    `;
    
    // Criar animação única para este confete
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes confetti-explode-${angle.toFixed(0)} {
        0% {
          transform: translate(-50%, -50%) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${Math.random() * 1080}deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
    
    document.body.appendChild(confetti);
    
    // Remover confete e animação após a animação
    setTimeout(() => {
      confetti.remove();
      styleSheet.remove();
    }, animationDuration * 1000);
  };

  return (
    <div className="max-w-3xl xl:max-w-4xl mx-auto text-center space-y-12 py-12">
      {/* Success Emoji */}
      <div className="text-8xl">
        🎉
      </div>

      {/* Title */}
      <div className="space-y-8">
        <h2 className="text-5xl md:text-6xl xl:text-7xl font-bold text-gray-900">
          Tudo Pronto!
        </h2>
        <p className="text-2xl xl:text-3xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          <span className="font-bold text-[#207DFF]">{organization?.name}</span> está configurada
        </p>
      </div>

      {/* CTA */}
      <div className="pt-8">
        <button
          onClick={onComplete}
          className="inline-flex items-center space-x-3 px-10 py-5 xl:px-12 xl:py-6 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-full text-xl xl:text-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <span>Concluir</span>
          <ArrowRight className="w-6 h-6 xl:w-7 xl:h-7" />
        </button>
      </div>
    </div>
  );
}
