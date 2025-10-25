import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // Não fazer redirecionamentos em desenvolvimento
  const isDev = hostname?.includes('localhost') || hostname?.includes('127.0.0.1');
  
  // Rotas públicas que não precisam de validação
  const publicPaths = [
    '/',
    '/login',
    '/reset-password',
    '/create-organization',
    '/auth/callback',
    '/_next',
    '/api',
    '/images',
    '/favicon.ico'
  ];
  
  // Verificar se a rota é pública
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Domínios que devem redirecionar para o principal (apenas em produção)
  if (!isDev) {
    const alternativeDomains = ['meuazulao.com', 'www.meuazulao.com'];
    const primaryDomain = 'meuazulao.com.br';
    
    // Verificar se está em um domínio alternativo
    if (alternativeDomains.includes(hostname)) {
      const url = request.nextUrl.clone();
      url.hostname = primaryDomain;
      url.protocol = 'https';
      
      return NextResponse.redirect(url, 301);
    }
  }
  
  // Se for rota pública, permitir acesso sem validação
  if (isPublicPath) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    return response;
  }
  
  // Validação de segurança para URLs dinâmicas
  const dynamicRouteRegex = /^\/org\/([^\/]+)\/user\/([^\/]+)/;
  const match = pathname.match(dynamicRouteRegex);
  
  if (match) {
    const [, orgIdFromUrl, userIdFromUrl] = match;
    
    try {
      // Criar response para manipular cookies
      const res = NextResponse.next();
      
      // Criar cliente Supabase para middleware usando @supabase/ssr
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return request.cookies.get(name)?.value;
            },
            set(name, value, options) {
              res.cookies.set({ name, value, ...options });
            },
            remove(name, options) {
              res.cookies.set({ name, value: '', ...options });
            },
          },
        }
      );
      
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('🚨 [SECURITY] Tentativa de acesso sem autenticação:', pathname);
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
      
      // Buscar usuário por email (mais confiável para usuários existentes)
      const { data: userDataByEmail } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('email', session.user.email)
        .maybeSingle();
      
      // CRÍTICO: Verificar se o userId da URL corresponde ao usuário autenticado
      // Aceitar tanto o ID do auth quanto o ID da tabela users
      const isValidUserId = userIdFromUrl === session.user.id || 
                           (userDataByEmail && userIdFromUrl === userDataByEmail.id);
      
      if (!isValidUserId) {
        console.error('🚨 [SECURITY] Tentativa de acesso a outro usuário:', {
          authenticatedUser: session.user.id,
          dbUserId: userDataByEmail?.id,
          attemptedUser: userIdFromUrl,
          path: pathname,
          email: session.user.email
        });
        
        // Redirecionar para a URL correta do usuário
        if (userDataByEmail?.organization_id) {
          const url = request.nextUrl.clone();
          url.pathname = pathname.replace(
            `/org/${orgIdFromUrl}/user/${userIdFromUrl}`,
            `/org/${userDataByEmail.organization_id}/user/${userDataByEmail.id}`
          );
          return NextResponse.redirect(url);
        }
        
        // Se não encontrou dados, voltar para login
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }
      
      // Verificar se o usuário pertence à organização da URL
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userIdFromUrl)
        .eq('organization_id', orgIdFromUrl)
        .single();
      
      if (userError || !userData) {
        console.error('🚨 [SECURITY] Usuário não pertence à organização:', {
          userId: userIdFromUrl,
          orgId: orgIdFromUrl,
          path: pathname
        });
        
        // Buscar a organização correta do usuário
        const { data: correctUserData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', session.user.id)
          .single();
        
        if (correctUserData?.organization_id) {
          const url = request.nextUrl.clone();
          url.pathname = pathname.replace(
            `/org/${orgIdFromUrl}/user/${userIdFromUrl}`,
            `/org/${correctUserData.organization_id}/user/${session.user.id}`
          );
          return NextResponse.redirect(url);
        }
        
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
      
      // Tudo OK - adicionar headers de segurança e continuar
      res.headers.set('X-User-Id', session.user.id);
      res.headers.set('X-Org-Id', orgIdFromUrl);
      res.headers.set('X-Content-Type-Options', 'nosniff');
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-XSS-Protection', '1; mode=block');
      
      return res;
      
    } catch (error) {
      console.error('🚨 [SECURITY] Erro na validação:', error);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }
  
  // Rotas que não são dinâmicas - apenas adicionar headers de segurança
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  if (!isDev) {
    response.headers.set('X-Robots-Tag', 'index, follow');
  }
  
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
     * - images, fonts, and other static assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|fonts|.*\\..*|_next).*)',
  ],
};
