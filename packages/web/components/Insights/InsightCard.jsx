import { AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';

export default function InsightCard({ insight }) {
  const { type, title, message, severity } = insight;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-green-200',
          bg: 'bg-green-50',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700'
        };
      case 'warning':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700'
        };
      case 'alert':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700'
        };
      default:
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`border ${styles.border} ${styles.bg} rounded-lg p-4`}>
      <div className="flex items-start space-x-3">
        <div className={`${styles.iconColor} flex-shrink-0 mt-0.5`}>
          {getIcon()}
        </div>
        <div className="flex-1 space-y-1">
          <h4 className={`text-sm font-semibold ${styles.titleColor}`}>
            {title}
          </h4>
          <p className={`text-sm ${styles.messageColor}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

