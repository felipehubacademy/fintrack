import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { MessageCircle, Search, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { Text, Headline, Callout, Caption, Title2 } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useOrganization } from '../hooks/useOrganization';

const FAQs = [
  {
    id: 1,
    category: 'Geral',
    question: 'O que é o MeuAzulão?',
    answer: 'O MeuAzulão é uma plataforma de controle financeiro que permite registrar despesas, recebimentos e muito mais através do WhatsApp. Você conversa naturalmente com o Zul, nosso assistente financeiro, e tudo é registrado automaticamente no dashboard.',
  },
  {
    id: 2,
    category: 'Geral',
    question: 'Como funciona o registro de transações?',
    answer: 'Basta enviar uma mensagem para o Zul pelo WhatsApp com a informação da sua transação. Por exemplo: "Gastei R$ 150 no mercado" ou "Recebi R$ 500 de comissão". O Zul entende naturalmente e registra tudo automaticamente. Você também pode enviar mensagens de áudio!',
  },
  {
    id: 3,
    category: 'Geral',
    question: 'O Zul funciona com mensagens de áudio?',
    answer: 'Sim! O Zul transcreve mensagens de áudio automaticamente usando inteligência artificial. Você pode falar naturalmente e o Zul entenderá e processará sua transação.',
  },
  {
    id: 4,
    category: 'Conta',
    question: 'Como criar uma conta?',
    answer: 'Clique em "Começar Agora" na página inicial, escolha o tipo de conta (individual ou compartilhada), preencha seus dados e confirme seu e-mail. Todo o processo leva menos de 2 minutos.',
  },
  {
    id: 5,
    category: 'Conta',
    question: 'Posso usar a mesma conta para múltiplas pessoas?',
    answer: 'Sim! Você pode criar uma organização compartilhada e convidar membros da família. Todos podem registrar transações e visualizar as finanças em conjunto.',
  },
  {
    id: 6,
    category: 'WhatsApp',
    question: 'Como conectar meu WhatsApp?',
    answer: 'Após criar sua conta, você receberá um código de verificação por SMS. Digite o código no painel de onboarding e seu WhatsApp estará conectado. O número do Zul será adicionado automaticamente aos seus contatos.',
  },
  {
    id: 7,
    category: 'WhatsApp',
    question: 'Posso usar o Zul em grupos do WhatsApp?',
    answer: 'Atualmente o Zul funciona apenas em conversas individuais. Cada membro da organização precisa conversar com o Zul diretamente para registrar transações.',
  },
  {
    id: 8,
    category: 'Transações',
    question: 'Como editar ou excluir uma transação?',
    answer: 'Para editar ou excluir transações, acesse o painel web do MeuAzulão pelo navegador ou use o app mobile. Lá você encontra todas as suas transações e pode gerenciá-las facilmente. O Zul pelo WhatsApp é focado em registrar novas transações.',
  },
  {
    id: 9,
    category: 'Transações',
    question: 'Como consultar resumos de gastos?',
    answer: 'Você pode perguntar ao Zul pelo WhatsApp: "Quanto gastei este mês?", "Quanto gastei de alimentação?", "Qual meu saldo?" etc. O Zul responderá com os resumos solicitados.',
  },
  {
    id: 10,
    category: 'Transações',
    question: 'Como registrar compras parceladas?',
    answer: 'Basta mencionar o número de parcelas ao registrar. Por exemplo: "Comprei uma TV de R$ 1500 em 5x no crédito Latam". O Zul criará automaticamente todas as parcelas.',
  },
  {
    id: 11,
    category: 'Segurança',
    question: 'Meus dados estão seguros?',
    answer: 'Sim! Utilizamos criptografia de ponta a ponta e seguimos todas as normas da LGPD. Seus dados financeiros são protegidos e nunca compartilhamos informações sensíveis sem sua autorização.',
  },
  {
    id: 12,
    category: 'Segurança',
    question: 'O MeuAzulão é gratuito?',
    answer: 'Oferecemos um período de teste gratuito. Após isso, temos planos acessíveis para uso individual e familiar. Consulte nossa página de preços para mais detalhes.',
  },
  {
    id: 13,
    category: 'Dashboard',
    question: 'O que posso ver no dashboard?',
    answer: 'No dashboard você visualiza gráficos interativos dos seus gastos e receitas, resumos por categoria, saldos de contas, avisos de vencimentos, análises de orçamento e muito mais.',
  },
  {
    id: 14,
    category: 'Dashboard',
    question: 'Posso exportar meus dados?',
    answer: 'Sim! No dashboard você pode exportar seus dados em formato CSV ou PDF para análise externa ou backup.',
  },
];

const CATEGORIES = ['Todos', 'Geral', 'Conta', 'WhatsApp', 'Transações', 'Segurança', 'Dashboard'];

export default function HelpScreen({ navigation }) {
  const { user } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const filteredFaqs = searchQuery
    ? FAQs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedCategory === 'Todos'
    ? FAQs
    : FAQs.filter(faq => faq.category === selectedCategory);

  const groupedFaqs = CATEGORIES.filter(cat => cat !== 'Todos').reduce((acc, category) => {
    acc[category] = filteredFaqs.filter(faq => faq.category === category);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Central de Ajuda"
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
            <MessageCircle size={16} color={colors.brand.primary} />
            <Caption style={{ color: colors.brand.primary, marginLeft: spacing[1] }}>
              Central de Ajuda
            </Caption>
          </View>
          <Headline weight="bold" style={{ marginTop: spacing[2], marginBottom: spacing[1] }}>
            Como podemos ajudar?
          </Headline>
          <Caption color="secondary" style={{ marginBottom: spacing[3] }}>
            Encontre respostas rápidas para suas dúvidas ou entre em contato conosco
          </Caption>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar perguntas..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </Card>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => {
                setSelectedCategory(category);
                setSearchQuery('');
              }}
            >
              <Caption weight={selectedCategory === category ? 'semiBold' : 'regular'}>
                {category}
              </Caption>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ Sections */}
        {CATEGORIES.filter(cat => cat !== 'Todos').map(category => {
          const categoryFaqs = groupedFaqs[category] || [];
          if (categoryFaqs.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
                {category}
              </Title2>

              {categoryFaqs.map((faq) => (
                <Card key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    activeOpacity={0.7}
                  >
                    <Callout weight="semiBold" style={{ flex: 1, paddingRight: spacing[2] }}>
                      {faq.question}
                    </Callout>
                    {openFaq === faq.id ? (
                      <ChevronUp size={20} color={colors.brand.primary} />
                    ) : (
                      <ChevronDown size={20} color={colors.text.tertiary} />
                    )}
                  </TouchableOpacity>

                  {openFaq === faq.id && (
                    <View style={styles.faqAnswer}>
                      <View style={styles.faqDivider} />
                      <Callout color="secondary" style={{ lineHeight: 22 }}>
                        {faq.answer}
                      </Callout>
                    </View>
                  )}
                </Card>
              ))}
            </View>
          );
        })}

        {filteredFaqs.length === 0 && (
          <Card style={styles.emptyCard}>
            <Callout color="secondary" align="center" style={{ marginBottom: spacing[2] }}>
              Nenhuma pergunta encontrada para "{searchQuery}"
            </Callout>
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Callout style={{ color: colors.brand.primary }} align="center" weight="semiBold">
                Limpar busca
              </Callout>
            </TouchableOpacity>
          </Card>
        )}

        {/* Contact CTA */}
        <Card style={styles.ctaCard}>
          <Headline weight="bold" align="center" style={{ marginBottom: spacing[1] }}>
            Ainda precisa de ajuda?
          </Headline>
          <Callout color="secondary" align="center" style={{ marginBottom: spacing[3] }}>
            Entre em contato conosco e nossa equipe responderá o mais rápido possível
          </Callout>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Support')}
            activeOpacity={0.8}
          >
            <Callout weight="semiBold" style={{ color: colors.neutral[0] }}>
              Entrar em Contato
            </Callout>
          </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  searchIcon: {
    marginRight: spacing[1],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  categoryScroll: {
    marginBottom: spacing[3],
  },
  categoryScrollContent: {
    paddingRight: spacing[3],
  },
  categoryChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.full,
    marginRight: spacing[1],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryChipActive: {
    backgroundColor: colors.brand.bg,
    borderColor: colors.brand.primary,
  },
  categorySection: {
    marginBottom: spacing[3],
  },
  faqCard: {
    marginBottom: spacing[2],
    padding: 0,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
  },
  faqAnswer: {
    padding: spacing[2],
    paddingTop: 0,
  },
  faqDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: spacing[2],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  ctaCard: {
    alignItems: 'center',
    padding: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.brand.bg,
  },
  ctaButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
  },
});

