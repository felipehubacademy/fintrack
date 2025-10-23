import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const Toast = ({ 
  id, 
  title, 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border p-4 transform transition-all duration-300 ease-in-out',
        isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        getStyles()
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-semibold mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm">
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
