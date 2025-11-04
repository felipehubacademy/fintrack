import { useState, useEffect, useRef } from 'react';

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  autoOpen = false,
  visible = null,
  onToggle = null,
  wide = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);
  
  // Detectar mobile e atualizar quando a janela redimensionar
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Se for passado visible e onToggle, usar estado controlado (padrão da aplicação)
  const showTooltip = visible !== null ? visible : isVisible;
  
  const handleToggle = (value) => {
    if (onToggle) {
      onToggle(value);
    } else {
      setIsVisible(value);
    }
  };
  
  // Calcular posicionamento inteligente
  useEffect(() => {
    if (showTooltip && tooltipRef.current && triggerRef.current && isMobile) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Reset position
      tooltip.style.left = '';
      tooltip.style.right = '';
      tooltip.style.top = '';
      tooltip.style.bottom = '';
      tooltip.style.transform = '';
      
      let newPosition = position;
      
      // Verificar espaço disponível
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;
      
      // Ajustar posição vertical
      if (position === 'top' && spaceAbove < tooltipRect.height + 8) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && spaceBelow < tooltipRect.height + 8) {
        newPosition = 'top';
      }
      
      // Ajustar posição horizontal
      if (newPosition === 'top' || newPosition === 'bottom') {
        // Centralizar horizontalmente em mobile
        const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        const maxLeft = 16; // padding mínimo
        const minRight = viewportWidth - tooltipRect.width - 16;
        
        if (left < maxLeft) {
          tooltip.style.left = '16px';
          tooltip.style.right = 'auto';
        } else if (left + tooltipRect.width > viewportWidth - 16) {
          tooltip.style.right = '16px';
          tooltip.style.left = 'auto';
        } else {
          tooltip.style.left = `${left}px`;
          tooltip.style.right = 'auto';
        }
        
        // Posição vertical
        if (newPosition === 'top') {
          tooltip.style.bottom = `${viewportHeight - rect.top + 8}px`;
          tooltip.style.top = 'auto';
        } else {
          tooltip.style.top = `${rect.bottom + 8}px`;
          tooltip.style.bottom = 'auto';
        }
      } else {
        // Para left/right, ajustar para top/bottom em mobile
        if (spaceBelow >= tooltipRect.height + 8) {
          tooltip.style.top = `${rect.bottom + 8}px`;
          tooltip.style.left = `${Math.max(16, Math.min(rect.left, viewportWidth - tooltipRect.width - 16))}px`;
        } else if (spaceAbove >= tooltipRect.height + 8) {
          tooltip.style.bottom = `${viewportHeight - rect.top + 8}px`;
          tooltip.style.left = `${Math.max(16, Math.min(rect.left, viewportWidth - tooltipRect.width - 16))}px`;
        }
      }
      
      setTooltipPosition(newPosition);
    }
  }, [showTooltip, position, isMobile]);
  
  // Fechar tooltip ao clicar fora em mobile
  useEffect(() => {
    if (!isMobile || !showTooltip) return;
    
    const handleClickOutside = (event) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        handleToggle(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showTooltip, isMobile]);
  
  // Handler para desktop (hover) e mobile (click)
  const handleMouseEnter = () => {
    if (!isMobile) {
      handleToggle(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (!isMobile) {
      handleToggle(false);
    }
  };
  
  const handleClick = () => {
    if (isMobile) {
      handleToggle(!showTooltip);
    }
  };
  
  return (
    <>
      {/* Backdrop para mobile */}
      {showTooltip && isMobile && (
        <div 
          className="fixed inset-0 z-[99] bg-transparent"
          onClick={() => handleToggle(false)}
          aria-hidden="true"
        />
      )}
      
      <div className="relative group inline-block" style={{ contain: 'layout' }}>
        <div 
          ref={triggerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={() => autoOpen && handleToggle(true)}
          onBlur={() => autoOpen && !isMobile && handleToggle(false)}
          onClick={handleClick}
          className="cursor-pointer md:cursor-default"
        >
          {children}
        </div>
        
        {/* Tooltip */}
        <div 
          ref={tooltipRef}
          className={`
            z-[100] bg-white rounded-lg shadow-2xl border border-gray-200 p-4 
            min-w-[200px] max-w-[calc(100vw-32px)]
            ${wide ? 'md:w-96' : 'md:max-w-xs'} 
            ${isMobile ? 'fixed' : 'absolute'}
            ${isMobile ? '' : 'md:invisible md:group-hover:visible'}
            ${showTooltip ? 'visible' : 'invisible'}
            ${!isMobile && position === 'left' ? 'right-0' : ''}
            ${!isMobile && position === 'right' ? 'left-0' : ''}
            ${!isMobile && position === 'top' ? 'bottom-full mb-2' : ''}
            ${!isMobile && position === 'bottom' ? 'top-full mt-2' : ''}
          `}
          style={{
            ...(isMobile && {
              maxWidth: 'calc(100vw - 32px)',
            })
          }}
        >
          <div className="text-sm text-gray-900 whitespace-normal">
            {content}
          </div>
        </div>
      </div>
    </>
  );
}

