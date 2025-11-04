import { useState, useEffect } from 'react';

export function useResponsiveChart() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calcular altura do gráfico baseado no tamanho da tela
  const getChartHeight = (desktopHeight = 280, mobileHeight = 240) => {
    return dimensions.isMobile ? mobileHeight : desktopHeight;
  };

  // Calcular raios do donut chart baseado no tamanho da tela
  const getDonutRadii = (desktopInner = 56, desktopOuter = 120, mobileInner = 50, mobileOuter = 100) => {
    return {
      innerRadius: dimensions.isMobile ? mobileInner : desktopInner,
      outerRadius: dimensions.isMobile ? mobileOuter : desktopOuter,
    };
  };

  // Calcular tamanho da fonte baseado no tamanho da tela
  const getFontSize = (desktopSize = 'sm', mobileSize = 'xs') => {
    return dimensions.isMobile ? mobileSize : desktopSize;
  };

  return {
    ...dimensions,
    getChartHeight,
    getDonutRadii,
    getFontSize,
  };
}

