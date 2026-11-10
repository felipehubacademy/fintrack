import Head from 'next/head';
import Link from 'next/link';
import { Shield, Lock, Eye, FileText, Server, MessageCircle, Brain } from 'lucide-react';
import LandingHeader from '../components/LandingHeader';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Política de Privacidade - MeuAzulão</title>
        <meta name="description" content="Política de Privacidade e Proteção de Dados do MeuAzulão" />
      </Head>

      <LandingHeader currentPage="privacy" />

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
            Última atualização: 10 de novembro de 2026
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
                A MeuAzulão Tecnologia (&ldquo;MeuAzulão&rdquo;, &ldquo;nós&rdquo; ou &ldquo;plataforma&rdquo;) está comprometida com a proteção da privacidade e dos dados pessoais de nossos usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
              </p>
            </div>

            {/* 1. Dados Coletados */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#1A6AFF]" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">1. Dados Coletados</h2>
              </div>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">1.1. Dados de Cadastro:</strong> Nome, e-mail, telefone (WhatsApp), foto de perfil (quando fornecida).
                </p>
                <p>
                  <strong className="text-gray-900">1.2. Dados Financeiros:</strong> Transações (despesas e receitas), categorias, valores, datas, métodos de pagamento, nomes de cartões de crédito/débito, nomes e saldos de contas bancárias, orçamentos e metas financeiras.
                </p>
                <p>
                  <strong className="text-gray-900">1.3. Dados de Comunicação:</strong> Mensagens de texto e áudio enviadas ao assistente Zul via WhatsApp, transcrições geradas a partir de áudios, e histórico de interações com o assistente.
                </p>
                <p>
                  <strong className="text-gray-900">1.4. Dados de Uso:</strong> Logs de acesso, preferências de uso, informações de dispositivo, endereço IP e dados de navegação.
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
                  <li>Prestar os serviços de controle financeiro através do app, dashboard web e WhatsApp</li>
                  <li>Processar e registrar transações financeiras informadas por você</li>
                  <li>Gerar resumos, análises, insights e relatórios financeiros personalizados</li>
                  <li>Operar o assistente financeiro inteligente Zul, que utiliza inteligência artificial para interpretar suas mensagens e fornecer respostas contextuais</li>
                  <li>Enviar notificações sobre vencimentos, orçamentos e alertas financeiros via WhatsApp e push</li>
                  <li>Melhorar nossos serviços e desenvolver novas funcionalidades</li>
                  <li>Garantir a segurança da plataforma e prevenir fraudes</li>
                  <li>Cumprir obrigações legais e regulatórias</li>
                </ul>
              </div>
            </div>

            {/* 3. Compartilhamento e Terceiros */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">3. Compartilhamento de Dados e Terceiros</h2>
              </div>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Para operar a plataforma, utilizamos os seguintes prestadores de serviço, que acessam dados pessoais sob rigorosos contratos de confidencialidade:
                </p>

                <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <Brain className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">OpenAI (GPT)</p>
                      <p className="text-sm">O assistente Zul utiliza a API da OpenAI para processar linguagem natural. Mensagens de texto e transcrições de áudio são enviadas à OpenAI para interpretação. A OpenAI não utiliza esses dados para treinar seus modelos quando acessados via API. Consulte a <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1A6AFF] hover:underline">política de privacidade da OpenAI</a>.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MessageCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">WhatsApp Cloud API (Meta)</p>
                      <p className="text-sm">Utilizamos a API oficial do WhatsApp para receber e enviar mensagens. A Meta processa os metadados de entrega conforme sua política. Consulte a <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1A6AFF] hover:underline">política de privacidade do WhatsApp</a>.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Server className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Supabase (Banco de Dados)</p>
                      <p className="text-sm">Todos os seus dados financeiros e de conta são armazenados no Supabase, uma plataforma de banco de dados com criptografia em repouso e em trânsito, hospedada em infraestrutura segura na nuvem. Consulte a <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#1A6AFF] hover:underline">política de privacidade do Supabase</a>.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Lock className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Vercel (Hospedagem)</p>
                      <p className="text-sm">O site e a API são hospedados na Vercel, que processa requisições e logs de acesso.</p>
                    </div>
                  </div>
                </div>

                <p>
                  <strong className="text-gray-900">Organizações Compartilhadas:</strong> Em contas familiares ou compartilhadas, os dados financeiros são visíveis para todos os membros autorizados da organização.
                </p>
                <p>
                  <strong className="text-gray-900">Obrigações Legais:</strong> Podemos divulgar informações quando exigido por lei, ordem judicial ou autoridades competentes.
                </p>
                <p className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                  <strong className="text-yellow-900">Importante:</strong> NUNCA vendemos seus dados pessoais ou financeiros a terceiros. O compartilhamento ocorre exclusivamente para a operação dos serviços descritos acima.
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
                  <li>Criptografia em trânsito (TLS/HTTPS) e em repouso no banco de dados</li>
                  <li>Políticas de segurança em nível de linha (Row Level Security) no banco de dados, garantindo que cada usuário acesse apenas seus próprios dados</li>
                  <li>Autenticação segura com tokens JWT e verificação via WhatsApp</li>
                  <li>Controles de acesso baseados em permissões por organização</li>
                  <li>Monitoramento contínuo de segurança e backups automáticos</li>
                  <li>Hospedagem em provedores com certificações de segurança internacionais (SOC 2, ISO 27001)</li>
                </ul>
              </div>
            </div>

            {/* 5. Seus Direitos (LGPD) */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Seus Direitos sob a LGPD</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Conforme a LGPD (Art. 18), você tem os seguintes direitos em relação aos seus dados pessoais:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-gray-900">Confirmação e Acesso:</strong> Confirmar a existência de tratamento e acessar seus dados pessoais</li>
                  <li><strong className="text-gray-900">Correção:</strong> Solicitar a correção de dados incompletos, inexatos ou desatualizados</li>
                  <li><strong className="text-gray-900">Anonimização, Bloqueio ou Eliminação:</strong> Solicitar a remoção de dados desnecessários, excessivos ou tratados em desconformidade</li>
                  <li><strong className="text-gray-900">Portabilidade:</strong> Solicitar a transferência de seus dados a outro fornecedor de serviço (em formato estruturado)</li>
                  <li><strong className="text-gray-900">Eliminação:</strong> Solicitar a exclusão de dados pessoais tratados com base em seu consentimento</li>
                  <li><strong className="text-gray-900">Informação:</strong> Obter informações sobre entidades públicas e privadas com as quais compartilhamos dados</li>
                  <li><strong className="text-gray-900">Revogação do Consentimento:</strong> Revogar seu consentimento a qualquer momento, sem custos</li>
                  <li><strong className="text-gray-900">Oposição:</strong> Opor-se ao tratamento de dados quando realizado com base em hipótese diferente do consentimento, em caso de descumprimento da LGPD</li>
                </ul>
                <p className="mt-4">
                  Para exercer qualquer desses direitos, entre em contato pelo e-mail{' '}
                  <a href="mailto:privacidade@meuazulao.com.br" className="text-[#1A6AFF] hover:underline">privacidade@meuazulao.com.br</a>.
                  Responderemos sua solicitação em até 15 dias úteis.
                </p>
              </div>
            </div>

            {/* 6. Retenção de Dados */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Retenção de Dados</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Mantemos seus dados pessoais enquanto sua conta estiver ativa e pelo período necessário para cumprir as finalidades descritas nesta política. Ao solicitar a exclusão da sua conta:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Dados financeiros e de perfil são excluídos ou anonimizados em até 30 dias</li>
                  <li>Logs de comunicação com o Zul são excluídos em até 90 dias</li>
                  <li>Dados necessários para cumprimento de obrigações legais podem ser retidos pelo prazo exigido em lei</li>
                  <li>Backups são removidos dentro do ciclo regular de rotação (até 90 dias)</li>
                </ul>
              </div>
            </div>

            {/* 7. Cookies */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Cookies e Tecnologias Similares</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Utilizamos cookies estritamente necessários para o funcionamento da plataforma (autenticação e preferências). Não utilizamos cookies de rastreamento ou publicidade de terceiros. Você pode gerenciar cookies através das configurações do seu navegador.
                </p>
              </div>
            </div>

            {/* 8. Transferência Internacional */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">8. Transferência Internacional de Dados</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Alguns de nossos prestadores de serviço (OpenAI, Supabase, Vercel) podem processar dados em servidores localizados fora do Brasil. Essas transferências são realizadas conforme o Art. 33 da LGPD, com base em cláusulas contratuais padrão e compromissos de proteção de dados equivalentes aos exigidos pela legislação brasileira.
                </p>
              </div>
            </div>

            {/* 9. Alterações */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">9. Alterações nesta Política</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por e-mail, WhatsApp ou através de aviso na plataforma. A data da última atualização está sempre indicada no topo desta página.
                </p>
              </div>
            </div>

            {/* 10. Contato */}
            <div className="mb-12 bg-blue-50 rounded-3xl p-8 border border-blue-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">10. Contato</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Para questões relacionadas a esta Política de Privacidade ou para exercer seus direitos sob a LGPD, entre em contato conosco:
                </p>
                <ul className="space-y-2">
                  <li><strong className="text-gray-900">Controlador:</strong> MeuAzulão Tecnologia</li>
                  <li><strong className="text-gray-900">E-mail do Encarregado (DPO):</strong>{' '}<a href="mailto:privacidade@meuazulao.com.br" className="text-[#1A6AFF] hover:underline">privacidade@meuazulao.com.br</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
