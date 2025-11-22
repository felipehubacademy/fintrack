import { Button } from './Button';

/**
 * EmptyState - Componente para estados vazios com instruções claras
 * 
 * Design elegante e profissional para guiar o usuário
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* Ícone ou Ilustração */}
      {illustration ? (
        <div className="mb-6">
          {illustration}
        </div>
      ) : Icon ? (
        <div className="mb-6 p-6 bg-gray-100 rounded-full">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      ) : null}

      {/* Título */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>

      {/* Descrição */}
      {description && (
        <p className="text-gray-600 text-center max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Ações */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button onClick={onSecondaryAction} variant="outline">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

