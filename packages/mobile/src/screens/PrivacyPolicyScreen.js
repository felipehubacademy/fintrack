import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Shield, Lock, Eye, FileText } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { formatBrazilDateLong } from '../utils/date';
import { Text, Headline, Callout, Caption, Title2 } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useOrganization } from '../hooks/useOrganization';

export default function PrivacyPolicyScreen({ navigation }) {
  const { user } = useOrganization();
  const lastUpdate = formatBrazilDateLong(new Date());

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Política de Privacidade"
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
            <Shield size={16} color={colors.brand.primary} />
            <Caption style={{ color: colors.brand.primary, marginLeft: spacing[1] }}>
              Privacidade e Segurança
            </Caption>
          </View>
          <Headline weight="bold" style={{ marginTop: spacing[2], marginBottom: spacing[1] }}>
            Política de Privacidade
          </Headline>
          <Caption color="secondary">
            Última atualização: {lastUpdate}
          </Caption>
        </Card>

        {/* Introduction */}
        <Card style={styles.contentCard}>
          <Callout style={{ lineHeight: 24 }}>
            O MeuAzulão ("nós", "nosso" ou "plataforma") está comprometido com a proteção da privacidade e dos dados pessoais de nossos usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </Callout>
        </Card>

        {/* Section 1 */}
        <Card style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.brand.bg }]}>
              <FileText size={24} color={colors.brand.primary} />
            </View>
            <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
              1. Dados Coletados
            </Title2>
          </View>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">1.1. Dados de Cadastro:</Text> Nome, e-mail, telefone (WhatsApp), data de nascimento (quando aplicável).
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">1.2. Dados Financeiros:</Text> Transações, despesas, receitas, categorias, valores, datas, métodos de pagamento, informações de cartões e contas bancárias.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">1.3. Dados de Uso:</Text> Histórico de interações com o Zul, logs de acesso, preferências de uso, informações de dispositivo.
            </Callout>
            <Callout>
              <Text weight="bold">1.4. Dados de Comunicação:</Text> Mensagens enviadas ao Zul via WhatsApp (texto e áudio), transcrições de áudio.
            </Callout>
          </View>
        </Card>

        {/* Section 2 */}
        <Card style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.info.bg }]}>
              <Eye size={24} color={colors.info.main} />
            </View>
            <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
              2. Finalidade do Uso
            </Title2>
          </View>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[1] }}>Utilizamos seus dados pessoais para:</Callout>
            {[
              'Prestar os serviços de controle financeiro através do WhatsApp e dashboard',
              'Processar e registrar transações financeiras',
              'Gerar resumos, análises e relatórios financeiros',
              'Enviar avisos e notificações sobre vencimentos e orçamentos',
              'Melhorar nossos serviços e desenvolver novas funcionalidades',
              'Comunicar-nos com você sobre atualizações, suporte e informações relevantes',
              'Cumprir obrigações legais e regulatórias',
            ].map((item, index) => (
              <View key={index} style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Callout style={{ flex: 1 }}>{item}</Callout>
              </View>
            ))}
          </View>
        </Card>

        {/* Section 3 */}
        <Card style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.success.bg }]}>
              <Lock size={24} color={colors.success.main} />
            </View>
            <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
              3. Compartilhamento de Dados
            </Title2>
          </View>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">3.1. Compartilhamento com Parceiros:</Text> Eventualmente, podemos compartilhar dados de contato (nome, e-mail, telefone) com parceiros estratégicos para oferecer produtos e serviços financeiros relevantes, sempre com seu consentimento prévio e em conformidade com a LGPD.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">3.2. Prestadores de Serviço:</Text> Compartilhamos dados com provedores de serviços terceirizados (hospedagem, processamento de pagamentos, análise de dados) que nos auxiliam na operação da plataforma, sob rigorosos contratos de confidencialidade.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">3.3. Obrigações Legais:</Text> Podemos divulgar informações quando exigido por lei, ordem judicial ou autoridades competentes.
            </Callout>
            <Callout style={{ marginBottom: spacing[2] }}>
              <Text weight="bold">3.4. Organizações Compartilhadas:</Text> Em contas compartilhadas, os dados financeiros são visíveis para todos os membros da organização autorizados.
            </Callout>
            <View style={styles.warningBox}>
              <Callout weight="bold" style={{ color: colors.warning.dark, marginBottom: spacing[1] }}>
                Importante:
              </Callout>
              <Callout style={{ color: colors.warning.dark }}>
                NUNCA compartilhamos dados financeiros sensíveis (valores de transações, informações de cartões completas) com parceiros sem sua autorização explícita.
              </Callout>
            </View>
          </View>
        </Card>

        {/* Section 4 */}
        <Card style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.error.bg }]}>
              <Shield size={24} color={colors.error.main} />
            </View>
            <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
              4. Segurança dos Dados
            </Title2>
          </View>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[1] }}>Implementamos medidas técnicas e organizacionais para proteger seus dados:</Callout>
            {[
              'Criptografia de ponta a ponta para dados sensíveis',
              'Armazenamento seguro em servidores com certificações de segurança',
              'Controles de acesso baseados em permissões',
              'Monitoramento contínuo de segurança',
              'Backup regular dos dados',
              'Atualizações de segurança regulares',
            ].map((item, index) => (
              <View key={index} style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Callout style={{ flex: 1 }}>{item}</Callout>
              </View>
            ))}
          </View>
        </Card>

        {/* Section 5 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            5. Seus Direitos sob a LGPD
          </Title2>
          <View style={styles.sectionContent}>
            <Callout style={{ marginBottom: spacing[1] }}>Você tem os seguintes direitos em relação aos seus dados pessoais:</Callout>
            {[
              { title: 'Confirmação e Acesso:', desc: 'Saber se tratamos seus dados e acessá-los' },
              { title: 'Correção:', desc: 'Solicitar correção de dados incompletos, inexatos ou desatualizados' },
              { title: 'Anonimização, Bloqueio ou Eliminação:', desc: 'Solicitar a remoção de dados desnecessários ou excessivos' },
              { title: 'Portabilidade:', desc: 'Solicitar a transferência de seus dados para outro fornecedor' },
              { title: 'Eliminação:', desc: 'Solicitar a exclusão de dados tratados com seu consentimento' },
              { title: 'Informação:', desc: 'Obter informações sobre entidades públicas e privadas com as quais compartilhamos dados' },
              { title: 'Revogação do Consentimento:', desc: 'Revogar seu consentimento a qualquer momento' },
            ].map((item, index) => (
              <View key={index} style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Callout style={{ flex: 1 }}>
                  <Text weight="bold">{item.title}</Text> {item.desc}
                </Callout>
              </View>
            ))}
            <Callout style={{ marginTop: spacing[2] }}>
              Para exercer seus direitos, entre em contato conosco através de{' '}
              <Text weight="bold" style={{ color: colors.brand.primary }}>
                privacidade@meuazulao.com.br
              </Text>
            </Callout>
          </View>
        </Card>

        {/* Section 6 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            6. Retenção de Dados
          </Title2>
          <Callout>
            Mantemos seus dados pessoais enquanto necessário para fornecer nossos serviços ou enquanto exigido por lei. Ao encerrar sua conta, excluiremos ou anonimizaremos seus dados pessoais, exceto quando a retenção for necessária para cumprir obrigações legais ou resolver disputas.
          </Callout>
        </Card>

        {/* Section 7 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            7. Cookies e Tecnologias Similares
          </Title2>
          <Callout>
            Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
          </Callout>
        </Card>

        {/* Section 8 */}
        <Card style={styles.contentCard}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            8. Alterações nesta Política
          </Title2>
          <Callout>
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por e-mail ou através de aviso na plataforma. A data da última atualização está sempre indicada no topo desta página.
          </Callout>
        </Card>

        {/* Section 9 - Contact */}
        <Card style={[styles.contentCard, styles.contactCard]}>
          <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
            9. Contato
          </Title2>
          <Callout style={{ marginBottom: spacing[2] }}>
            Para questões relacionadas a esta Política de Privacidade ou para exercer seus direitos sob a LGPD, entre em contato conosco:
          </Callout>
          <View style={styles.contactInfo}>
            <Callout>
              <Text weight="bold">E-mail:</Text>{' '}
              <Text style={{ color: colors.brand.primary }}>privacidade@meuazulao.com.br</Text>
            </Callout>
            <Callout style={{ marginTop: spacing[1] }}>
              <Text weight="bold">Encarregado de Dados (DPO):</Text> disponível através do e-mail acima
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
    backgroundColor: colors.warning.bg,
    borderRadius: radius.md,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.warning.main,
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

