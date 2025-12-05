import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { FileText, Scale, CheckCircle } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { formatBrazilDateLong } from '../utils/date';
import { Text, Headline, Callout, Caption, Title2 } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useOrganization } from '../hooks/useOrganization';

export default function TermsOfServiceScreen({ navigation }) {
  const { user } = useOrganization();
  const lastUpdate = formatBrazilDateLong(new Date());

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Termos de Serviço"
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={styles.badge}>
            <Scale size={16} color={colors.brand.primary} />
            <Caption style={{ color: colors.brand.primary, marginLeft: spacing[1] }}>
              Termos e Condições
            </Caption>
          </View>
          <Headline weight="bold" style={{ marginTop: spacing[2], marginBottom: spacing[1] }}>
            Termos de Serviço
          </Headline>
          <Caption color="secondary">
            Última atualização: {lastUpdate}
          </Caption>
        </Card>

        {/* Introduction */}
        <Card style={styles.contentCard}>
          <Callout style={{ lineHeight: 24 }}>
            Estes Termos de Serviço ("Termos") regem seu acesso e uso da plataforma MeuAzulão ("Plataforma", "Serviço", "nós", "nosso"). Ao acessar ou usar nosso Serviço, você concorda em cumprir e estar vinculado a estes Termos. Se você não concordar com qualquer parte destes Termos, não poderá usar o Serviço.
          </Callout>
        </Card>

        {/* Section 1 */}
        <Card style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.brand.bg }]}>
              <CheckCircle size={24} color={colors.brand.primary} />
            </View>
            <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
              1. Aceitação dos Termos
            </Title2>
          </View>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[1] }}>Ao criar uma conta, acessar ou usar o MeuAzulão, você confirma que:</Callout>
            {[
              'Você tem pelo menos 18 anos de idade ou possui autorização de um responsável legal',
              'Você tem capacidade legal para celebrar contratos vinculativos',
              'Você forneceu informações precisas e completas durante o registro',
              'Você é responsável por manter a segurança de sua conta e senha',
              'Você concorda em cumprir todas as leis e regulamentos aplicáveis',
            ].map((item, index) => (
              <View key={index} style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Callout style={{ flex: 1 }}>{item}</Callout>
              </View>
            ))}
          </View>
        </Card>

        {/* Section 2 */}
        <Card style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.info.bg }]}>
              <FileText size={24} color={colors.info.main} />
            </View>
            <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
              2. Descrição do Serviço
            </Title2>
          </View>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[1] }}>O MeuAzulão é uma plataforma de controle financeiro que permite:</Callout>
            {[
              'Registrar transações financeiras (despesas e receitas) via WhatsApp',
              'Visualizar resumos e análises financeiras em tempo real',
              'Receber avisos e notificações sobre vencimentos e orçamentos',
              'Gerenciar finanças individuais ou compartilhadas',
              'Exportar dados financeiros para análise externa',
            ].map((item, index) => (
              <View key={index} style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Callout style={{ flex: 1 }}>{item}</Callout>
              </View>
            ))}
            <Callout style={{ marginTop: spacing[2] }}>
              Nos reservamos o direito de modificar, suspender ou descontinuar qualquer aspecto do Serviço a qualquer momento, com ou sem aviso prévio.
            </Callout>
          </View>
        </Card>

        {/* Section 3 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            3. Conta do Usuário
          </Title2>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">3.1. Registro:</Text> Para usar o Serviço, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de suas credenciais de acesso.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">3.2. Responsabilidade:</Text> Você é totalmente responsável por todas as atividades que ocorrem sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado de sua conta.
            </Callout>
            <Callout>
              <Text weight="bold">3.3. Contas Compartilhadas:</Text> Em organizações compartilhadas, todos os membros autorizados têm acesso aos dados financeiros da organização. Você é responsável por gerenciar adequadamente os membros e permissões.
            </Callout>
          </View>
        </Card>

        {/* Section 4 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            4. Uso Aceitável
          </Title2>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[1] }}>Você concorda em NÃO usar o Serviço para:</Callout>
            {[
              'Qualquer finalidade ilegal ou não autorizada',
              'Violar qualquer lei, regulamento ou direito de terceiros',
              'Transmitir vírus, malware ou qualquer código malicioso',
              'Tentar acessar não autorizado a qualquer parte do Serviço',
              'Interferir ou interromper o funcionamento do Serviço',
              'Usar o Serviço para atividades fraudulentas ou enganosas',
              'Reproduzir, copiar ou revender o Serviço sem autorização',
            ].map((item, index) => (
              <View key={index} style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Callout style={{ flex: 1 }}>{item}</Callout>
              </View>
            ))}
            <View style={styles.warningBox}>
              <Callout weight="bold" style={{ color: colors.error.dark, marginBottom: spacing[1] }}>
                Violação:
              </Callout>
              <Callout style={{ color: colors.error.dark }}>
                A violação destas regras pode resultar em suspensão ou encerramento imediato de sua conta, sem reembolso.
              </Callout>
            </View>
          </View>
        </Card>

        {/* Section 5 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            5. Propriedade Intelectual
          </Title2>
          <Callout style={{ marginBottom: spacing[2] }}>
            Todo o conteúdo do MeuAzulão, incluindo mas não limitado a texto, gráficos, logos, ícones, imagens, software e código, é propriedade do MeuAzulão ou de seus licenciadores e está protegido por leis de direitos autorais e propriedade intelectual.
          </Callout>
          <Callout>
            Você recebe uma licença limitada, não exclusiva, não transferível e revogável para acessar e usar o Serviço exclusivamente para fins pessoais e não comerciais, de acordo com estes Termos.
          </Callout>
        </Card>

        {/* Section 6 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            6. Privacidade
          </Title2>
          <Callout>
            Seu uso do Serviço também é regido por nossa Política de Privacidade. Ao usar o Serviço, você consente na coleta, uso e compartilhamento de suas informações conforme descrito na Política de Privacidade.
          </Callout>
        </Card>

        {/* Section 7 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            7. Pagamentos e Assinaturas
          </Title2>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">7.1. Assinaturas:</Text> Alguns recursos do Serviço podem exigir uma assinatura paga. Você concorda em pagar todas as taxas associadas à sua assinatura conforme acordado no momento da contratação.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">7.2. Renovação Automática:</Text> As assinaturas podem ser renovadas automaticamente, a menos que você cancele antes do período de renovação.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">7.3. Reembolsos:</Text> Reembolsos são avaliados caso a caso, de acordo com nossa política de reembolso.
            </Callout>
            <Callout>
              <Text weight="bold">7.4. Alterações de Preço:</Text> Reservamo-nos o direito de modificar nossos preços a qualquer momento, com aviso prévio de pelo menos 30 dias.
            </Callout>
          </View>
        </Card>

        {/* Section 8 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            8. Limitação de Responsabilidade
          </Title2>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">8.1. Serviço "Como Está":</Text> O Serviço é fornecido "como está" e "conforme disponível". Não garantimos que o Serviço será ininterrupto, seguro, livre de erros ou atenderá suas expectativas específicas.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">8.2. Isenção de Garantias:</Text> Renunciamos a todas as garantias, expressas ou implícitas, incluindo mas não limitado a garantias de comercialização, adequação a um propósito específico e não violação.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">8.3. Limitação de Danos:</Text> Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou outras perdas intangíveis.
            </Callout>
            <View style={styles.warningBox}>
              <Callout weight="bold" style={{ color: colors.warning.dark, marginBottom: spacing[1] }}>
                Aviso Importante:
              </Callout>
              <Callout style={{ color: colors.warning.dark }}>
                O MeuAzulão é uma ferramenta de controle financeiro e não oferece serviços de consultoria financeira, investimento ou planejamento financeiro profissional.
              </Callout>
            </View>
          </View>
        </Card>

        {/* Section 9 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            9. Indenização
          </Title2>
          <Callout style={{ marginBottom: spacing[1] }}>
            Você concorda em indenizar, defender e isentar o MeuAzulão, seus afiliados, diretores, funcionários e agentes de quaisquer reivindicações, responsabilidades, danos, perdas e despesas (incluindo honorários advocatícios) decorrentes de:
          </Callout>
          {[
            'Seu uso ou mau uso do Serviço',
            'Violação destes Termos',
            'Violação de qualquer direito de terceiros',
            'Qualquer conteúdo que você envie ou transmita através do Serviço',
          ].map((item, index) => (
            <View key={index} style={styles.bulletPoint}>
              <View style={styles.bullet} />
              <Callout style={{ flex: 1 }}>{item}</Callout>
            </View>
          ))}
        </Card>

        {/* Section 10 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            10. Encerramento
          </Title2>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">10.1. Por Você:</Text> Você pode encerrar sua conta a qualquer momento através das configurações da conta ou entrando em contato conosco.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">10.2. Por Nós:</Text> Podemos suspender ou encerrar sua conta imediatamente, sem aviso prévio, se você violar estes Termos ou por qualquer outro motivo a nosso critério.
            </Callout>
            <Callout>
              <Text weight="bold">10.3. Efeitos do Encerramento:</Text> Após o encerramento, seu direito de usar o Serviço cessará imediatamente. Podemos excluir ou anonimizar seus dados de acordo com nossa Política de Privacidade.
            </Callout>
          </View>
        </Card>

        {/* Section 11 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            11. Lei Aplicável e Jurisdição
          </Title2>
          <Callout>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada a estes Termos será resolvida exclusivamente nos tribunais competentes do Brasil.
          </Callout>
        </Card>

        {/* Section 12 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            12. Alterações nos Termos
          </Title2>
          <Callout>
            Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos você sobre mudanças significativas por e-mail ou através de aviso na Plataforma. Seu uso continuado do Serviço após as alterações constitui aceitação dos novos Termos.
          </Callout>
        </Card>

        {/* Section 13 - Contact */}
        <Card style={[styles.contentCard, styles.contactCard]}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            13. Contato
          </Title2>
          <Callout style={{ marginBottom: spacing[2] }}>
            Para questões sobre estes Termos de Serviço, entre em contato conosco:
          </Callout>
          <View style={styles.contactInfo}>
            <Callout>
              <Text weight="bold">E-mail:</Text>{' '}
              <Text 
                style={{ color: colors.brand.primary }}
                onPress={() => Linking.openURL('mailto:legal@meuazulao.com.br')}
              >
                legal@meuazulao.com.br
              </Text>
            </Callout>
          </View>
        </Card>

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[3],
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    backgroundColor: colors.brand.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  contentCard: {
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContent: {
    gap: spacing[1],
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[1],
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.primary,
    marginTop: 8,
    marginRight: spacing[2],
  },
  warningBox: {
    backgroundColor: colors.error.bg,
    borderRadius: radius.md,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.error.main,
    marginTop: spacing[2],
  },
  contactCard: {
    backgroundColor: colors.brand.bg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  contactInfo: {
    marginTop: spacing[1],
  },
});

