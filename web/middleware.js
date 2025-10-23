import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // Domínios que devem redirecionar para o principal
  const alternativeDomains = ['meuazulao.com', 'www.meuazulao.com', 'www.meuazulao.com.br'];
  const primaryDomain = 'meuazulao.com.br';
  
  // Verificar se está em um domínio alternativo
  if (alternativeDomains.includes(hostname)) {
    const url = request.nextUrl.clone();
    url.hostname = primaryDomain;
    url.protocol = 'https';
    
    return NextResponse.redirect(url, 301);
  }
  
  // Adicionar headers de SEO
  const response = NextResponse.next();
  
  // Headers para SEO
  response.headers.set('X-Robots-Tag', 'index, follow');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
