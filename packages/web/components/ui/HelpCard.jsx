import { Info, Lightbulb, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

const CARD_TYPES = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900'
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-900'
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900'
  },
  help: {
    icon: HelpCircle,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900'
  }
};

/**
 * HelpCard - Componente para instruções e dicas visuais
 * 
 * @param {string} type - Tipo do card: 'info', 'tip', 'warning', 'success', 'help'
 * @param {string} title - Título do card
 * @param {string|ReactNode} children - Conteúdo do card
 * @param {boolean} dismissible - Se pode ser fechado
 * @param {function} onDismiss - Callback ao fechar
 */
export default function HelpCard({ 
  type = 'info', 
  title, 
  children, 
  dismissible = false,
  onDismiss,
  className = ''
}) {
  const config = CARD_TYPES[type] || CARD_TYPES.info;
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.bgColor}
        ${config.borderColor}
        border-l-4
        rounded-lg
        p-4
        ${className}
      `}
    >
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h4 className={`text-sm font-semibold ${config.titleColor} mb-1`}>
              {title}
            </h4>
          )}
          <div className="text-sm text-gray-700">
            {children}
          </div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

