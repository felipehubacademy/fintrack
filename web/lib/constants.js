// Constantes da aplicação
export const APP_CONFIG = {
  // Domínio principal (canônico)
  PRIMARY_DOMAIN: 'meuazulao.com.br',
  
  // Domínios alternativos que redirecionam para o principal
  ALTERNATIVE_DOMAINS: ['meuazulao.com', 'www.meuazulao.com'],
  
  // URLs base
  BASE_URL: 'https://meuazulao.com.br',
  APP_URL: 'https://meuazulao.com.br',
  
  // Configurações de SEO
  SITE_NAME: 'MeuAzulão',
  SITE_DESCRIPTION: 'Controle Financeiro Familiar pelo WhatsApp',
  
  // Configurações do Zul
  ZUL_NAME: 'ZUL',
  ZUL_DESCRIPTION: 'Assistente financeiro inteligente via WhatsApp',
  
  // Configurações de notificação
  NOTIFICATION_EMAILS: {
    SUPPORT: 'suporte@meuazulao.com.br',
    NO_REPLY: 'noreply@meuazulao.com.br'
  }
};

// Função para verificar se está no domínio correto
export function isCorrectDomain() {
  if (typeof window === 'undefined') return true;
  
  const currentHost = window.location.hostname;
  // Aceitar tanto meuazulao.com.br quanto www.meuazulao.com.br
  return currentHost === APP_CONFIG.PRIMARY_DOMAIN || 
         currentHost === `www.${APP_CONFIG.PRIMARY_DOMAIN}` ||
         currentHost.includes('localhost'); // Aceitar localhost em dev
}

// Função para redirecionar para o domínio correto
export function redirectToCorrectDomain() {
  if (typeof window === 'undefined') return;
  
  const currentHost = window.location.hostname;
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  
  if (APP_CONFIG.ALTERNATIVE_DOMAINS.includes(currentHost)) {
    const correctUrl = `${APP_CONFIG.BASE_URL}${currentPath}`;
    window.location.replace(correctUrl);
  }
}

// Função para obter URL canônica
export function getCanonicalUrl(path = '') {
  return `${APP_CONFIG.BASE_URL}${path}`;
}
