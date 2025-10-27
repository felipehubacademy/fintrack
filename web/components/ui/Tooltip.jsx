import { useState } from 'react';

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
  
  // Se for passado visible e onToggle, usar estado controlado (padrão da aplicação)
  const showTooltip = visible !== null ? visible : isVisible;
  const handleToggle = (value) => {
    if (onToggle) {
      onToggle(value);
    } else {
      setIsVisible(value);
    }
  };
  
  return (
    <div className="relative group inline-block" style={{ contain: 'layout' }}>
      <div 
        onMouseEnter={() => handleToggle(true)}
        onMouseLeave={() => handleToggle(false)}
        onFocus={() => autoOpen && handleToggle(true)}
        onBlur={() => autoOpen && handleToggle(false)}
        onClick={() => handleToggle(!showTooltip)}
      >
        {children}
      </div>
      
      {/* Tooltip - padrão da aplicação */}
      <div className={`absolute z-[100] bg-white rounded-lg shadow-2xl border border-gray-200 p-4 top-full mt-2 min-w-[200px] ${wide ? 'w-96' : 'max-w-xs'} md:invisible md:group-hover:visible ${showTooltip ? 'visible' : 'invisible'} ${
        position === 'left' ? 'right-0' : position === 'right' ? 'left-0' : 'right-0'
      }`}>
        <div className="text-sm text-gray-900 whitespace-normal">
          {content}
        </div>
      </div>
    </div>
  );
}

