import Head from 'next/head';
import Link from 'next/link';
import { FileText, Scale, CheckCircle, AlertTriangle } from 'lucide-react';
import LandingHeader from '../components/LandingHeader';

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Termos de Serviço - MeuAzulão</title>
        <meta name="description" content="Termos de Serviço e Condições de Uso do MeuAzulão" />
      </Head>

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
                Estes Termos de Serviço (&ldquo;Termos&rdquo;) regem seu acesso e uso da plataforma MeuAzulão, operada pela MeuAzulão Tecnologia (&ldquo;Plataforma&rdquo;, &ldquo;Serviço&rdquo;, &ldquo;nós&rdquo;). Ao acessar ou usar nosso Serviço, você concorda em cumprir e estar vinculado a estes Termos. Se você não concordar com qualquer parte destes Termos, não poderá usar o Serviço.
              </p>
            </div>

            {/* 1. Aceitação dos Termos */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#1A6AFF]" />
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
                  <li>Você concorda em cumprir todas as leis e regulamentos aplicáveis, incluindo a LGPD</li>
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
                  O MeuAzulão é uma plataforma de controle financeiro pessoal e familiar que permite:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Registrar transações financeiras (despesas e receitas) via WhatsApp, app mobile ou dashboard web</li>
                  <li>Interagir com o Zul, um assistente financeiro inteligente alimentado por inteligência artificial (OpenAI GPT), que interpreta suas mensagens e auxilia no registro e análise de finanças</li>
                  <li>Visualizar resumos, gráficos e análises financeiras em tempo real</li>
                  <li>Receber notificações sobre vencimentos, orçamentos e alertas financeiros via WhatsApp e push</li>
                  <li>Gerenciar finanças individuais ou compartilhadas em organizações familiares</li>
                  <li>Definir orçamentos por categoria e acompanhar metas financeiras</li>
                  <li>Exportar dados financeiros para análise externa</li>
                </ul>
                <p className="mt-4">
                  Nos reservamos o direito de modificar, suspender ou descontinuar qualquer aspecto do Serviço a qualquer momento, mediante aviso prévio quando possível.
                </p>
              </div>
            </div>

            {/* 3. Assistente Zul e Inteligência Artificial */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">3. Assistente Zul e Inteligência Artificial</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">3.1. Natureza do Zul:</strong> O Zul é um assistente automatizado que utiliza modelos de linguagem da OpenAI (GPT) para interpretar suas mensagens e fornecer respostas. O Zul não é um consultor financeiro certificado e suas respostas não constituem aconselhamento financeiro profissional.
                </p>
                <p>
                  <strong className="text-gray-900">3.2. Precisão:</strong> Embora nos esforcemos para que o Zul processe suas informações corretamente, respostas geradas por inteligência artificial podem conter imprecisões. Recomendamos que você verifique dados importantes no dashboard antes de tomar decisões financeiras.
                </p>
                <p>
                  <strong className="text-gray-900">3.3. Processamento de Dados:</strong> As mensagens que você envia ao Zul são processadas pela API da OpenAI para gerar respostas. Conforme a política da OpenAI, dados enviados via API não são usados para treinar seus modelos. Para mais detalhes, consulte nossa <Link href="/privacy" className="text-[#1A6AFF] hover:underline">Política de Privacidade</Link>.
                </p>
              </div>
            </div>

            {/* 4. Conta do Usuário */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">4. Conta do Usuário</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">4.1. Registro:</strong> Para usar o Serviço, você deve criar uma conta fornecendo informações precisas e completas. A verificação é realizada através do seu número de WhatsApp.
                </p>
                <p>
                  <strong className="text-gray-900">4.2. Responsabilidade:</strong> Você é totalmente responsável por todas as atividades que ocorrem sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
                </p>
                <p>
                  <strong className="text-gray-900">4.3. Organizações Compartilhadas:</strong> Em contas familiares compartilhadas, todos os membros autorizados têm acesso aos dados financeiros da organização. Você é responsável por gerenciar adequadamente os membros e suas permissões.
                </p>
              </div>
            </div>

            {/* 5. Uso Aceitável */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">5. Uso Aceitável</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Você concorda em NÃO usar o Serviço para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Qualquer finalidade ilegal ou não autorizada</li>
                  <li>Violar qualquer lei, regulamento ou direito de terceiros</li>
                  <li>Transmitir vírus, malware ou qualquer código malicioso</li>
                  <li>Tentar acesso não autorizado a qualquer parte do Serviço ou de outros usuários</li>
                  <li>Interferir ou interromper o funcionamento do Serviço</li>
                  <li>Usar o Zul para fins que não sejam controle financeiro pessoal/familiar</li>
                  <li>Enviar conteúdo abusivo, ofensivo ou ilegal ao Zul via WhatsApp</li>
                  <li>Reproduzir, copiar ou revender o Serviço sem autorização</li>
                </ul>
                <p className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                  <strong className="text-red-900">Violação:</strong> A violação destas regras pode resultar em suspensão ou encerramento imediato de sua conta, sem reembolso.
                </p>
              </div>
            </div>

            {/* 6. Propriedade Intelectual */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">6. Propriedade Intelectual</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Todo o conteúdo do MeuAzulão, incluindo texto, gráficos, logos, ícones, imagens, software, código-fonte e a marca MeuAzulão, é propriedade da MeuAzulão Tecnologia ou de seus licenciadores e está protegido por leis de direitos autorais e propriedade intelectual brasileiras e internacionais.
                </p>
                <p>
                  Você recebe uma licença limitada, não exclusiva, não transferível e revogável para acessar e usar o Serviço exclusivamente para fins pessoais e não comerciais, de acordo com estes Termos.
                </p>
              </div>
            </div>

            {/* 7. Privacidade */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">7. Privacidade e Proteção de Dados</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Seu uso do Serviço é regido por nossa <Link href="/privacy" className="text-[#1A6AFF] hover:underline">Política de Privacidade</Link>, que detalha como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD (Lei nº 13.709/2018). Ao usar o Serviço, você consente na coleta e tratamento de dados conforme descrito na Política de Privacidade.
                </p>
              </div>
            </div>

            {/* 8. Pagamentos e Assinaturas */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">8. Pagamentos e Assinaturas</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">8.1. Plano Gratuito:</strong> O MeuAzulão oferece um plano gratuito com funcionalidades essenciais de controle financeiro.
                </p>
                <p>
                  <strong className="text-gray-900">8.2. Planos Pagos:</strong> Recursos adicionais podem ser oferecidos em planos pagos. Você concorda em pagar todas as taxas associadas conforme acordado no momento da contratação.
                </p>
                <p>
                  <strong className="text-gray-900">8.3. Renovação:</strong> Assinaturas podem ser renovadas automaticamente, a menos que você cancele antes do período de renovação, conforme as regras da loja de aplicativos utilizada (App Store ou Google Play).
                </p>
                <p>
                  <strong className="text-gray-900">8.4. Alterações de Preço:</strong> Reservamo-nos o direito de modificar nossos preços a qualquer momento, com aviso prévio de pelo menos 30 dias.
                </p>
              </div>
            </div>

            {/* 9. Limitação de Responsabilidade */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">9. Limitação de Responsabilidade</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">9.1. Natureza do Serviço:</strong> O MeuAzulão é uma ferramenta de organização e controle financeiro. Não somos uma instituição financeira, não oferecemos crédito, investimentos ou consultoria financeira profissional.
                </p>
                <p>
                  <strong className="text-gray-900">9.2. Disponibilidade:</strong> O Serviço é fornecido &ldquo;como está&rdquo; e &ldquo;conforme disponível&rdquo;. Não garantimos que o Serviço será ininterrupto ou livre de erros.
                </p>
                <p>
                  <strong className="text-gray-900">9.3. Respostas do Zul:</strong> As respostas do assistente Zul são geradas por inteligência artificial e podem conter imprecisões. Não nos responsabilizamos por decisões financeiras tomadas com base exclusivamente nas respostas do Zul.
                </p>
                <p>
                  <strong className="text-gray-900">9.4. Limitação de Danos:</strong> Na máxima extensão permitida por lei, não seremos responsáveis por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso do Serviço.
                </p>
                <p className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                  <strong className="text-yellow-900">Aviso Importante:</strong> O MeuAzulão é uma ferramenta de controle e organização financeira. Sempre consulte um profissional certificado para decisões financeiras importantes.
                </p>
              </div>
            </div>

            {/* 10. Indenização */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">10. Indenização</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Você concorda em indenizar e isentar a MeuAzulão Tecnologia, seus sócios, diretores e colaboradores de quaisquer reivindicações, perdas e despesas (incluindo honorários advocatícios) decorrentes de:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Seu uso ou mau uso do Serviço</li>
                  <li>Violação destes Termos</li>
                  <li>Violação de qualquer direito de terceiros</li>
                  <li>Conteúdo que você envie ou transmita através do Serviço</li>
                </ul>
              </div>
            </div>

            {/* 11. Encerramento */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">11. Encerramento</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  <strong className="text-gray-900">11.1. Por Você:</strong> Você pode encerrar sua conta a qualquer momento através das configurações do app ou entrando em contato pelo e-mail{' '}<a href="mailto:privacidade@meuazulao.com.br" className="text-[#1A6AFF] hover:underline">privacidade@meuazulao.com.br</a>.
                </p>
                <p>
                  <strong className="text-gray-900">11.2. Por Nós:</strong> Podemos suspender ou encerrar sua conta se você violar estes Termos ou por motivo de segurança da plataforma.
                </p>
                <p>
                  <strong className="text-gray-900">11.3. Efeitos:</strong> Após o encerramento, seu direito de usar o Serviço cessa imediatamente. Seus dados serão tratados conforme nossa <Link href="/privacy" className="text-[#1A6AFF] hover:underline">Política de Privacidade</Link> (seção de Retenção de Dados).
                </p>
              </div>
            </div>

            {/* 12. Lei Aplicável */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">12. Lei Aplicável e Jurisdição</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor (Lei nº 8.078/1990), o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD (Lei nº 13.709/2018). Qualquer disputa será resolvida no foro da comarca do domicílio do consumidor, conforme a legislação brasileira.
                </p>
              </div>
            </div>

            {/* 13. Alterações */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">13. Alterações nos Termos</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos você sobre mudanças significativas por e-mail, WhatsApp ou aviso na plataforma. Seu uso continuado do Serviço após as alterações constitui aceitação dos novos Termos.
                </p>
              </div>
            </div>

            {/* 14. Contato */}
            <div className="mb-12 bg-blue-50 rounded-3xl p-8 border border-blue-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">14. Contato</h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Para questões sobre estes Termos de Serviço, entre em contato conosco:
                </p>
                <ul className="space-y-2">
                  <li><strong className="text-gray-900">Razão Social:</strong> MeuAzulão Tecnologia</li>
                  <li><strong className="text-gray-900">E-mail:</strong>{' '}<a href="mailto:contato@meuazulao.com.br" className="text-[#1A6AFF] hover:underline">contato@meuazulao.com.br</a></li>
                  <li><strong className="text-gray-900">Formulário:</strong>{' '}<Link href="/contact" className="text-[#1A6AFF] hover:underline">Página de Contato</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
