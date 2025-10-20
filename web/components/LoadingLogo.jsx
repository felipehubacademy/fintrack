import Image from 'next/image';

export default function LoadingLogo({ size = 'medium', message = '', className = '' }) {
  const sizes = {
    small: 'h-12 w-12',
    medium: 'h-24 w-24',
    large: 'h-32 w-32'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizes[size]}`}>
        {/* Logo base - Flight Blue desbotado */}
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/images/logo_flat.svg"
            alt="Carregando..."
            fill
            className="logo-base"
          />
        </div>
        {/* Logo animado - Deep Sky preenchendo */}
        <div className="absolute inset-0 animate-fill-logo">
          <Image
            src="/images/logo_flat.svg"
            alt="Carregando..."
            fill
            className="logo-fill"
          />
        </div>
      </div>
      {message && (
        <p className="mt-4 text-deep-sky font-medium text-sm animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
