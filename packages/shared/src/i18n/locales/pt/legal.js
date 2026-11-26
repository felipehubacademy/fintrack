// legal strings (pt). Keys are referenced as t('legal.<key>').
// Textos longos são listas de seções: { title, body?: [], items?: [], after?: [] }.
// Placeholders preenchidos pela página: {{controller}}, {{email}}, {{contactEmail}}, {{deleteUrl}}.
// NOTE: must be reviewed by a lawyer before launch.
export default {
  lastUpdated: 'Última atualização: {{date}}',
  updatedDate: '26 de novembro de 2026',
  otherLanguages: 'Também disponível em',
  onThisPage: 'Nesta página',
  privacy: {
    metaTitle: 'Política de Privacidade | MeuAzulão',
    metaDescription: 'Quais dados o MeuAzulão coleta, por quê, quem os trata e como excluí-los.',
    badge: 'Privacidade',
    title: 'Política de Privacidade',
    shortTitle: 'Privacidade',
    intro: 'O MeuAzulão ajuda você a controlar seu dinheiro conversando com o Zul no WhatsApp. Esta política explica, de forma simples, o que coletamos, por quê, quem nos ajuda a tratar esses dados e como você mantém o controle. Ela segue a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018) e as leis de privacidade dos países onde atuamos.',
    sections: [
      {
        title: '1. Quem é responsável pelos seus dados',
        body: [
          'O MeuAzulão é operado por {{controller}}, controlador dos dados pessoais descritos aqui.',
          'Para qualquer assunto sobre seus dados, escreva para o nosso Encarregado (DPO) em {{email}}.',
        ],
      },
      {
        title: '2. O que coletamos',
        items: [
          'Dados da conta: seu número de telefone (WhatsApp), seu nome e, se você informar, seu e-mail.',
          'O que você nos conta: transações e outras anotações financeiras que você escreve ou fala para o Zul ou registra no app, como valores, descrições, categorias, nomes de cartões e contas, contas a pagar, orçamentos e metas.',
          'Áudios e fotos (por exemplo, comprovantes) que você manda para o Zul. Usamos esses arquivos para entender a transação e depois os descartamos em até 30 dias.',
          'Dados de uso e de falhas: versão do app e do aparelho, relatórios de erro, registros de acesso e endereço IP, usados para manter o serviço funcionando e seguro.',
        ],
        after: [
          'Nunca pedimos senhas de banco nem números completos de cartão, e não precisamos deles. Por favor, não mande esses dados para o Zul.',
        ],
      },
      {
        title: '3. Para que usamos (e a base legal)',
        items: [
          'Para prestar o serviço que você contratou: registrar suas transações, responder você no WhatsApp, mostrar seu painel e enviar os lembretes e resumos que você pediu. Base legal: execução de contrato (LGPD, art. 7º, V).',
          'Para manter o serviço seguro, evitar abusos e corrigir erros. Base legal: execução de contrato e nosso legítimo interesse (art. 7º, IX).',
          'Para cumprir obrigações legais e pedidos de autoridades (art. 7º, II).',
        ],
        after: [
          'Não usamos seus dados para publicidade, não temos rastreadores de anúncios e nunca vendemos seus dados.',
        ],
      },
      {
        title: '4. Quem trata seus dados para nós',
        body: ['Usamos alguns prestadores de serviço, com contratos que só permitem tratar seus dados para operar o MeuAzulão:'],
        items: [
          'Meta (WhatsApp Business Platform): entrega as mensagens entre você e o Zul.',
          'OpenAI (via API): entende suas mensagens, áudios e fotos. Os dados enviados pela API não são usados para treinar os modelos da OpenAI.',
          'Supabase: nosso banco de dados, hospedado na região de São Paulo (Brasil), com criptografia em trânsito e em repouso.',
          'Vercel: hospeda nosso site e nossos servidores.',
          'Sentry: recebe relatórios de erros e falhas para podermos corrigir problemas.',
          'Twilio SendGrid: envia e-mails da conta, como convites, quando você usa e-mail.',
        ],
        after: [
          'Em uma conta compartilhada (família), os membros que você convidar podem ver os dados financeiros compartilhados da organização.',
          'Podemos divulgar dados quando a lei ou uma ordem judicial exigir.',
        ],
      },
      {
        title: '5. Transferência internacional',
        body: [
          'Alguns prestadores (como Meta, OpenAI, Vercel e Sentry) podem tratar dados fora do Brasil, inclusive nos Estados Unidos. Essas transferências seguem o art. 33 da LGPD, com base em cláusulas contratuais padrão e compromissos de proteção de dados equivalentes.',
        ],
      },
      {
        title: '6. Por quanto tempo guardamos',
        items: [
          'Dados da conta e financeiros: enquanto sua conta estiver ativa.',
          'Áudios e fotos: descartados em até 30 dias depois de processados.',
          'Registros de acesso e relatórios de erro: até 90 dias.',
          'Quando você exclui sua conta, seus dados são apagados na hora; cópias em backups são apagadas em até 30 dias. Guardamos só o que a lei nos obriga a guardar, pelo prazo que ela exige.',
        ],
      },
      {
        title: '7. Seus direitos',
        body: ['Você pode, a qualquer momento e sem custo:'],
        items: [
          'Confirmar se tratamos seus dados e acessá-los.',
          'Corrigir dados incompletos, inexatos ou desatualizados.',
          'Receber uma cópia dos seus dados em formato estruturado (portabilidade).',
          'Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou excessivos.',
          'Excluir sua conta e seus dados.',
          'Saber com quem compartilhamos seus dados.',
          'Se opor a um tratamento e revogar qualquer consentimento que tenha dado.',
        ],
        after: [
          'Para exercer qualquer desses direitos, escreva para {{email}}. Respondemos em até 15 dias. Você também pode reclamar na Autoridade Nacional de Proteção de Dados (ANPD) ou na autoridade do seu país.',
        ],
      },
      {
        title: '8. Como excluir sua conta',
        body: [
          'Você pode excluir sua conta no app (Configurações > Excluir conta), mandando “apagar minha conta” para o Zul no WhatsApp, ou na web em {{deleteUrl}}. A exclusão é imediata e vale para todos os seus dados.',
        ],
      },
      {
        title: '9. Segurança',
        items: [
          'Criptografia em trânsito (TLS/HTTPS) e em repouso.',
          'Segurança por linha no banco de dados, para que cada pessoa só acesse os próprios dados.',
          'Acesso com código de uso único enviado pelo WhatsApp.',
          'Controle de acesso por organização e função, e backups automáticos.',
        ],
      },
      {
        title: '10. Crianças e adolescentes',
        body: ['O MeuAzulão é para maiores de 18 anos. Não coletamos dados de menores de propósito.'],
      },
      {
        title: '11. Cookies',
        body: [
          'Usamos só o estritamente necessário para manter você conectado e lembrar suas preferências (como o idioma). Nada de cookies de publicidade ou de rastreamento de terceiros.',
        ],
      },
      {
        title: '12. Mudanças nesta política',
        body: [
          'Se fizermos mudanças importantes, avisaremos você pelo WhatsApp, por e-mail ou no app antes que entrem em vigor. A data no topo mostra a versão mais recente.',
        ],
      },
      {
        title: '13. Contato',
        body: [
          'Controlador: {{controller}}.',
          'Encarregado (DPO): {{email}}.',
        ],
      },
    ],
  },
  terms: {
    metaTitle: 'Termos de Uso | MeuAzulão',
    metaDescription: 'As regras para usar o MeuAzulão e o Zul, seu assistente no WhatsApp.',
    badge: 'Termos',
    title: 'Termos de Uso',
    shortTitle: 'Termos',
    intro: 'Estes Termos regem o uso do MeuAzulão, operado por {{controller}}. Ao criar uma conta ou usar o serviço, no WhatsApp, no app ou na web, você concorda com eles. Leia junto com a nossa Política de Privacidade.',
    sections: [
      {
        title: '1. Quem pode usar o MeuAzulão',
        items: [
          'Você tem pelo menos 18 anos e capacidade para fazer um contrato.',
          'As informações que você nos dá são verdadeiras e atualizadas.',
          'Você protege seu celular, seu WhatsApp e seus códigos de acesso. Quem tiver acesso ao seu WhatsApp pode falar com o Zul como se fosse você.',
        ],
      },
      {
        title: '2. O serviço',
        body: ['O MeuAzulão é um controle financeiro pessoal e familiar. Com ele você pode:'],
        items: [
          'Registrar gastos e receitas conversando com o Zul no WhatsApp (texto, áudio ou foto), no app ou na web.',
          'Ver resumos, gráficos e o seu mês de um jeito simples.',
          'Receber os lembretes e alertas que você escolher, como contas a vencer e orçamentos.',
          'Dividir a conta com a família, com uma função para cada membro.',
        ],
        after: [
          'Podemos mudar, suspender ou encerrar funcionalidades. Quando a mudança for importante para você, avisaremos com antecedência sempre que possível.',
        ],
      },
      {
        title: '3. Zul e inteligência artificial',
        items: [
          'O Zul é um assistente automático que usa inteligência artificial (modelos da OpenAI via API). O Zul não é um consultor financeiro certificado, e as respostas dele não são aconselhamento financeiro, tributário, jurídico ou de investimentos.',
          'A inteligência artificial pode errar. Confira números importantes no seu painel antes de tomar decisões.',
          'O que você manda para o Zul é tratado como descrito na Política de Privacidade e não é usado para treinar os modelos da OpenAI.',
        ],
      },
      {
        title: '4. Sua conta',
        items: [
          'Você entra com um código que mandamos no seu WhatsApp (ou com e-mail e senha, se tiver configurado).',
          'Você é responsável pelo que acontece na sua conta. Avise a gente na hora se notar qualquer uso não autorizado.',
          'Em uma conta compartilhada, todos os membros que você convidar veem os dados financeiros compartilhados. Os administradores gerenciam os membros e as permissões.',
        ],
      },
      {
        title: '5. Uso correto',
        body: ['Você concorda em não:'],
        items: [
          'Usar o MeuAzulão para algo ilegal ou para violar direitos de outras pessoas.',
          'Tentar acessar dados de outras pessoas ou partes do serviço a que você não tem acesso.',
          'Mandar vírus, spam ou conteúdo abusivo ou ilegal para o Zul.',
          'Atrapalhar, sobrecarregar, copiar, revender ou fazer engenharia reversa do serviço.',
        ],
        after: ['Se essas regras forem descumpridas, podemos suspender ou encerrar a conta.'],
      },
      {
        title: '6. Preço: acesso antecipado grátis',
        items: [
          'O MeuAzulão é grátis durante o acesso antecipado, até {{earlyAccessEnd}}.',
          'Antes de qualquer plano pago começar, avisaremos com antecedência, com o preço e o que ele inclui. Nada é cobrado automaticamente: você escolhe se quer assinar.',
          'Planos pagos comprados pela App Store ou pelo Google Play seguem as regras de cobrança e cancelamento dessas lojas.',
        ],
      },
      {
        title: '7. Propriedade intelectual',
        body: [
          'A marca MeuAzulão, o Zul, o software e o conteúdo do serviço pertencem a {{controller}} ou a seus licenciantes. Damos a você uma licença pessoal, não exclusiva, intransferível e revogável para usar o serviço de acordo com estes Termos. Seus dados financeiros são seus.',
        ],
      },
      {
        title: '8. Privacidade',
        body: [
          'Como tratamos seus dados pessoais está na nossa Política de Privacidade, que faz parte destes Termos.',
        ],
      },
      {
        title: '9. Limites da nossa responsabilidade',
        items: [
          'O MeuAzulão é uma ferramenta de organização. Não somos banco nem instituição financeira e não oferecemos crédito, investimentos ou consultoria financeira.',
          'Trabalhamos para manter o serviço disponível e correto, mas ele pode ter interrupções ou erros.',
          'Na medida permitida pela lei, não respondemos por danos indiretos nem por decisões tomadas só com base nas respostas do Zul. Nada nestes Termos limita os direitos que o Código de Defesa do Consumidor garante a você.',
        ],
      },
      {
        title: '10. Encerramento da conta',
        items: [
          'Você pode excluir sua conta quando quiser: no app, mandando “apagar minha conta” para o Zul ou em {{deleteUrl}}.',
          'Podemos suspender ou encerrar contas que descumpram estes Termos ou coloquem o serviço ou outras pessoas em risco.',
          'Depois do encerramento, seus dados são tratados como descrito na Política de Privacidade.',
        ],
      },
      {
        title: '11. Lei aplicável',
        body: [
          'Estes Termos seguem as leis do Brasil, em especial o Código de Defesa do Consumidor (Lei nº 8.078/1990), o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD. Qualquer disputa será resolvida no foro do domicílio do consumidor. Se você mora fora do Brasil, as regras obrigatórias de proteção ao consumidor do seu país também se aplicam.',
        ],
      },
      {
        title: '12. Mudanças nestes Termos',
        body: [
          'Se mudarmos estes Termos de forma relevante, avisaremos com antecedência pelo WhatsApp, por e-mail ou no app. Se você continuar usando o MeuAzulão depois que as mudanças valerem, os novos Termos se aplicam.',
        ],
      },
      {
        title: '13. Contato',
        body: ['Dúvidas sobre estes Termos: {{contactEmail}}. Dúvidas sobre privacidade: {{email}}.'],
      },
    ],
  },
};
