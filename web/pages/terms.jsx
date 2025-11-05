import Head from 'next/head';
import Link from 'next/link';
import { FileText, Scale, CheckCircle } from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Termos de Serviço - MeuAzulão</title>
        <meta name="description" content="Termos de Serviço e Condições de Uso do MeuAzulão" />
      </Head>

      {/* Navigation */}
      <LandingHeader currentPage="terms" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Scale className="w-4 h-4" />
            <span>Termos e Condições</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Termos de Serviço
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
                Estes Termos de Serviço ("Termos") regem seu acesso e uso da plataforma MeuAzulão ("Plataforma", "Serviço", "nós", "nosso"). Ao acessar ou usar nosso Serviço, você concorda em cumprir e estar vinculado a estes Termos. Se você não concordar com qualquer parte destes Termos, não poderá usar o Serviço.
              </p>
            </div>

            {/* 1. Aceitação dos Termos */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#207DFF]" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">1. Aceitação dos Termos</h2>
              </div>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Ao criar uma conta, acessar ou usar o MeuAzulão, você confirma que:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Você tem pelo menos 18 anos de idade ou possui autorização de um responsável legal</li>
                  <li>Você tem capacidade legal para celebrar contratos vinculativos</li>
                  <li>Você forneceu informações precisas e completas durante o registro</li>
                  <li>Você é responsável por manter a segurança de sua conta e senha</li>
                  <li>Você concorda em cumprir todas as leis e regulamentos aplicáveis</li>
                </ul>
              </div>
            </div>

            {/* 2. Descrição do Serviço */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">2. Descrição do Serviço</h2>
              </div>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  O MeuAzulão é uma plataforma de controle financeiro que permite:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Registrar transações financeiras (despesas e receitas) via WhatsApp</li>
                  <li>Visualizar resumos e análises financeiras em tempo real</li>
                  <li>Receber avisos e notificações sobre vencimentos e orçamentos</li>
                  <li>Gerenciar finanças individuais ou compartilhadas</li>
                  <li>Exportar dados financeiros para análise externa</li>
                </ul>
                <p className="mt-4">
                  Nos reservamos o direito de modificar, suspender ou descontinuar qualquer aspecto do Serviço a qualquer momento, com ou sem aviso prévio.
                </p>
              </div>
            </div>

            {/* 3. Conta do Usuário */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">3. Conta do Usuário</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">3.1. Registro:</strong> Para usar o Serviço, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de suas credenciais de acesso.
                </p>
                <p>
                  <strong className="text-gray-900">3.2. Responsabilidade:</strong> Você é totalmente responsável por todas as atividades que ocorrem sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado de sua conta.
                </p>
                <p>
                  <strong className="text-gray-900">3.3. Contas Compartilhadas:</strong> Em organizações compartilhadas, todos os membros autorizados têm acesso aos dados financeiros da organização. Você é responsável por gerenciar adequadamente os membros e permissões.
                </p>
              </div>
            </div>

            {/* 4. Uso Aceitável */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">4. Uso Aceitável</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Você concorda em NÃO usar o Serviço para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Qualquer finalidade ilegal ou não autorizada</li>
                  <li>Violar qualquer lei, regulamento ou direito de terceiros</li>
                  <li>Transmitir vírus, malware ou qualquer código malicioso</li>
                  <li>Tentar acessar não autorizado a qualquer parte do Serviço</li>
                  <li>Interferir ou interromper o funcionamento do Serviço</li>
                  <li>Usar o Serviço para atividades fraudulentas ou enganosas</li>
                  <li>Reproduzir, copiar ou revender o Serviço sem autorização</li>
                </ul>
                <p className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                  <strong className="text-red-900">Violação:</strong> A violação destas regras pode resultar em suspensão ou encerramento imediato de sua conta, sem reembolso.
                </p>
              </div>
            </div>

            {/* 5. Propriedade Intelectual */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Propriedade Intelectual</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Todo o conteúdo do MeuAzulão, incluindo mas não limitado a texto, gráficos, logos, ícones, imagens, software e código, é propriedade do MeuAzulão ou de seus licenciadores e está protegido por leis de direitos autorais e propriedade intelectual.
                </p>
                <p>
                  Você recebe uma licença limitada, não exclusiva, não transferível e revogável para acessar e usar o Serviço exclusivamente para fins pessoais e não comerciais, de acordo com estes Termos.
                </p>
              </div>
            </div>

            {/* 6. Privacidade */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Privacidade</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Seu uso do Serviço também é regido por nossa <Link href="/privacy" className="text-[#207DFF] hover:underline">Política de Privacidade</Link>. Ao usar o Serviço, você consente na coleta, uso e compartilhamento de suas informações conforme descrito na Política de Privacidade.
                </p>
              </div>
            </div>

            {/* 7. Pagamentos e Assinaturas */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Pagamentos e Assinaturas</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">7.1. Assinaturas:</strong> Alguns recursos do Serviço podem exigir uma assinatura paga. Você concorda em pagar todas as taxas associadas à sua assinatura conforme acordado no momento da contratação.
                </p>
                <p>
                  <strong className="text-gray-900">7.2. Renovação Automática:</strong> As assinaturas podem ser renovadas automaticamente, a menos que você cancele antes do período de renovação.
                </p>
                <p>
                  <strong className="text-gray-900">7.3. Reembolsos:</strong> Reembolsos são avaliados caso a caso, de acordo com nossa política de reembolso.
                </p>
                <p>
                  <strong className="text-gray-900">7.4. Alterações de Preço:</strong> Reservamo-nos o direito de modificar nossos preços a qualquer momento, com aviso prévio de pelo menos 30 dias.
                </p>
              </div>
            </div>

            {/* 8. Limitação de Responsabilidade */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">8. Limitação de Responsabilidade</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">8.1. Serviço "Como Está":</strong> O Serviço é fornecido "como está" e "conforme disponível". Não garantimos que o Serviço será ininterrupto, seguro, livre de erros ou atenderá suas expectativas específicas.
                </p>
                <p>
                  <strong className="text-gray-900">8.2. Isenção de Garantias:</strong> Renunciamos a todas as garantias, expressas ou implícitas, incluindo mas não limitado a garantias de comercialização, adequação a um propósito específico e não violação.
                </p>
                <p>
                  <strong className="text-gray-900">8.3. Limitação de Danos:</strong> Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou outras perdas intangíveis.
                </p>
                <p className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                  <strong className="text-yellow-900">Aviso Importante:</strong> O MeuAzulão é uma ferramenta de controle financeiro e não oferece serviços de consultoria financeira, investimento ou planejamento financeiro profissional.
                </p>
              </div>
            </div>

            {/* 9. Indenização */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">9. Indenização</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Você concorda em indenizar, defender e isentar o MeuAzulão, seus afiliados, diretores, funcionários e agentes de quaisquer reivindicações, responsabilidades, danos, perdas e despesas (incluindo honorários advocatícios) decorrentes de:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Seu uso ou mau uso do Serviço</li>
                  <li>Violação destes Termos</li>
                  <li>Violação de qualquer direito de terceiros</li>
                  <li>Qualquer conteúdo que você envie ou transmita através do Serviço</li>
                </ul>
              </div>
            </div>

            {/* 10. Encerramento */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">10. Encerramento</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">10.1. Por Você:</strong> Você pode encerrar sua conta a qualquer momento através das configurações da conta ou entrando em contato conosco.
                </p>
                <p>
                  <strong className="text-gray-900">10.2. Por Nós:</strong> Podemos suspender ou encerrar sua conta imediatamente, sem aviso prévio, se você violar estes Termos ou por qualquer outro motivo a nosso critério.
                </p>
                <p>
                  <strong className="text-gray-900">10.3. Efeitos do Encerramento:</strong> Após o encerramento, seu direito de usar o Serviço cessará imediatamente. Podemos excluir ou anonimizar seus dados de acordo com nossa Política de Privacidade.
                </p>
              </div>
            </div>

            {/* 11. Lei Aplicável e Jurisdição */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">11. Lei Aplicável e Jurisdição</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada a estes Termos será resolvida exclusivamente nos tribunais competentes do Brasil.
                </p>
              </div>
            </div>

            {/* 12. Alterações nos Termos */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">12. Alterações nos Termos</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos você sobre mudanças significativas por e-mail ou através de aviso na Plataforma. Seu uso continuado do Serviço após as alterações constitui aceitação dos novos Termos.
                </p>
              </div>
            </div>

            {/* 13. Contato */}
            <div className="mb-12 bg-blue-50 rounded-3xl p-8 border border-blue-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">13. Contato</h2>
              
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Para questões sobre estes Termos de Serviço, entre em contato conosco:
                </p>
                <ul className="space-y-2">
                  <li><strong className="text-gray-900">E-mail:</strong> <a href="mailto:legal@meuazulao.com.br" className="text-[#207DFF] hover:underline">legal@meuazulao.com.br</a></li>
                  <li><strong className="text-gray-900">Formulário:</strong> <Link href="/contact" className="text-[#207DFF] hover:underline">Página de Contato</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </>
  );
}
