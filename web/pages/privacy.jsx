import Head from 'next/head';
import Link from 'next/link';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Política de Privacidade - MeuAzulão</title>
        <meta name="description" content="Política de Privacidade e Proteção de Dados do MeuAzulão" />
      </Head>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-md shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <img src="/images/logo_flat.svg" alt="MeuAzulão" className="w-8 h-8" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#207DFF] to-[#0D2C66] bg-clip-text text-transparent">
                MeuAzulão
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Início
              </Link>
              <Link href="/help" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Ajuda
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                Contato
              </Link>
              <Link 
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-full text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300"
              >
                Entrar
              </Link>
            </div>

            <div className="md:hidden flex items-center space-x-3">
              <Link 
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-full text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300"
              >
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            <span>Privacidade e Segurança</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Política de Privacidade
          </h1>
          
          <p className="text-xl text-gray-600 mb-4 font-light">
            Última atualização: {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            {/* Introdução */}
            <div className="mb-12">
              <p className="text-gray-600 leading-relaxed text-lg mb-6">
                O MeuAzulão ("nós", "nosso" ou "plataforma") está comprometido com a proteção da privacidade e dos dados pessoais de nossos usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </div>

            {/* 1. Dados Coletados */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#207DFF]" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">1. Dados Coletados</h2>
              </div>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">1.1. Dados de Cadastro:</strong> Nome, e-mail, telefone (WhatsApp), data de nascimento (quando aplicável).
                </p>
                <p>
                  <strong className="text-gray-900">1.2. Dados Financeiros:</strong> Transações, despesas, receitas, categorias, valores, datas, métodos de pagamento, informações de cartões e contas bancárias.
                </p>
                <p>
                  <strong className="text-gray-900">1.3. Dados de Uso:</strong> Histórico de interações com o Zul, logs de acesso, preferências de uso, informações de dispositivo.
                </p>
                <p>
                  <strong className="text-gray-900">1.4. Dados de Comunicação:</strong> Mensagens enviadas ao Zul via WhatsApp (texto e áudio), transcrições de áudio.
                </p>
              </div>
            </div>

            {/* 2. Finalidade do Uso */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">2. Finalidade do Uso</h2>
              </div>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Utilizamos seus dados pessoais para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Prestar os serviços de controle financeiro através do WhatsApp e dashboard</li>
                  <li>Processar e registrar transações financeiras</li>
                  <li>Gerar resumos, análises e relatórios financeiros</li>
                  <li>Enviar avisos e notificações sobre vencimentos e orçamentos</li>
                  <li>Melhorar nossos serviços e desenvolver novas funcionalidades</li>
                  <li>Comunicar-nos com você sobre atualizações, suporte e informações relevantes</li>
                  <li>Cumprir obrigações legais e regulatórias</li>
                </ul>
              </div>
            </div>

            {/* 3. Compartilhamento de Dados */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">3. Compartilhamento de Dados</h2>
              </div>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">3.1. Compartilhamento com Parceiros:</strong> Eventualmente, podemos compartilhar dados de contato (nome, e-mail, telefone) com parceiros estratégicos para oferecer produtos e serviços financeiros relevantes, sempre com seu consentimento prévio e em conformidade com a LGPD.
                </p>
                <p>
                  <strong className="text-gray-900">3.2. Prestadores de Serviço:</strong> Compartilhamos dados com provedores de serviços terceirizados (hospedagem, processamento de pagamentos, análise de dados) que nos auxiliam na operação da plataforma, sob rigorosos contratos de confidencialidade.
                </p>
                <p>
                  <strong className="text-gray-900">3.3. Obrigações Legais:</strong> Podemos divulgar informações quando exigido por lei, ordem judicial ou autoridades competentes.
                </p>
                <p>
                  <strong className="text-gray-900">3.4. Organizações Compartilhadas:</strong> Em contas compartilhadas, os dados financeiros são visíveis para todos os membros da organização autorizados.
                </p>
                <p className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                  <strong className="text-yellow-900">Importante:</strong> NUNCA compartilhamos dados financeiros sensíveis (valores de transações, informações de cartões completas) com parceiros sem sua autorização explícita.
                </p>
              </div>
            </div>

            {/* 4. Segurança dos Dados */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">4. Segurança dos Dados</h2>
              </div>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Criptografia de ponta a ponta para dados sensíveis</li>
                  <li>Armazenamento seguro em servidores com certificações de segurança</li>
                  <li>Controles de acesso baseados em permissões</li>
                  <li>Monitoramento contínuo de segurança</li>
                  <li>Backup regular dos dados</li>
                  <li>Atualizações de segurança regulares</li>
                </ul>
              </div>
            </div>

            {/* 5. Seus Direitos (LGPD) */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Seus Direitos sob a LGPD</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-gray-900">Confirmação e Acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
                  <li><strong className="text-gray-900">Correção:</strong> Solicitar correção de dados incompletos, inexatos ou desatualizados</li>
                  <li><strong className="text-gray-900">Anonimização, Bloqueio ou Eliminação:</strong> Solicitar a remoção de dados desnecessários ou excessivos</li>
                  <li><strong className="text-gray-900">Portabilidade:</strong> Solicitar a transferência de seus dados para outro fornecedor</li>
                  <li><strong className="text-gray-900">Eliminação:</strong> Solicitar a exclusão de dados tratados com seu consentimento</li>
                  <li><strong className="text-gray-900">Informação:</strong> Obter informações sobre entidades públicas e privadas com as quais compartilhamos dados</li>
                  <li><strong className="text-gray-900">Revogação do Consentimento:</strong> Revogar seu consentimento a qualquer momento</li>
                </ul>
                <p className="mt-4">
                  Para exercer seus direitos, entre em contato conosco através de <a href="mailto:privacidade@meuazulao.com.br" className="text-[#207DFF] hover:underline">privacidade@meuazulao.com.br</a>
                </p>
              </div>
            </div>

            {/* 6. Retenção de Dados */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Retenção de Dados</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Mantemos seus dados pessoais enquanto necessário para fornecer nossos serviços ou enquanto exigido por lei. Ao encerrar sua conta, excluiremos ou anonimizaremos seus dados pessoais, exceto quando a retenção for necessária para cumprir obrigações legais ou resolver disputas.
                </p>
              </div>
            </div>

            {/* 7. Cookies e Tecnologias Similares */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Cookies e Tecnologias Similares</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
                </p>
              </div>
            </div>

            {/* 8. Alterações nesta Política */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">8. Alterações nesta Política</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por e-mail ou através de aviso na plataforma. A data da última atualização está sempre indicada no topo desta página.
                </p>
              </div>
            </div>

            {/* 9. Contato */}
            <div className="mb-12 bg-blue-50 rounded-3xl p-8 border border-blue-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">9. Contato</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Para questões relacionadas a esta Política de Privacidade ou para exercer seus direitos sob a LGPD, entre em contato conosco:
                </p>
                <ul className="space-y-2">
                  <li><strong className="text-gray-900">E-mail:</strong> <a href="mailto:privacidade@meuazulao.com.br" className="text-[#207DFF] hover:underline">privacidade@meuazulao.com.br</a></li>
                  <li><strong className="text-gray-900">Encarregado de Dados (DPO):</strong> disponível através do e-mail acima</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 mb-6 group">
                <img 
                  src="/images/logo_flat.svg" 
                  alt="MeuAzulão" 
                  className="w-10 h-10"
                />
                <span className="text-xl font-bold text-white">MeuAzulão</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Controle financeiro inteligente via WhatsApp. 
                Registre transações, visualize resumos e gerencie suas finanças de forma simples.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Termos de Serviço</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Suporte</h3>
              <ul className="space-y-3">
                <li><Link href="/help" className="hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contato</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} MeuAzulão. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

