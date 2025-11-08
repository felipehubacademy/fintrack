import Image from 'next/image';

export default function LoadingLogo({ size = 'medium', message = '', className = '' }) {
  // Tamanhos responsivos: mobile, md, lg, xl, 2xl
  const sizes = {
    small: 'h-10 w-10 md:h-12 md:w-12 lg:h-12 lg:w-12 xl:h-14 xl:w-14 2xl:h-14 2xl:w-14',
    medium: 'h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 2xl:h-32 2xl:w-32',
    large: 'h-20 w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32 2xl:h-36 2xl:w-36'
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
            className="logo-base object-contain"
          />
        </div>
        {/* Logo animado - Deep Sky preenchendo */}
        <div className="absolute inset-0 animate-fill-logo">
          <Image
            src="/images/logo_flat.svg"
            alt="Carregando..."
            fill
            className="logo-fill object-contain"
          />
        </div>
      </div>
      {message && (
        <p className="mt-4 text-deep-sky font-medium text-xs md:text-sm lg:text-base xl:text-base 2xl:text-lg animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
