import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { CreditCard, X, ChevronDown, ChevronUp, CheckCircle, ArrowRight } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../ui/Text';
import { Card } from '../ui/Card';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import MarkInvoiceAsPaidModal from './MarkInvoiceAsPaidModal';
import RolloverInvoiceModal from './RolloverInvoiceModal';
import { useToast } from '../ui/Toast';

/**
 * CardInvoiceModal - Modal completo de faturas do cartão
 * Baseado na implementação web com todas as funcionalidades
 */
export default function CardInvoiceModal({ visible, onClose, card, onPayInvoice, onRolloverInvoice }) {
  const { organization, user } = useOrganization();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  
  // Animações
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible && card) {
      fetchInvoices();
      setExpandedInvoices(new Set());
      
      // Animação de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animações
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, card]);

  const getBrazilToday = () => {
    const now = new Date();
    const brazilOffset = -3 * 60; // UTC-3
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (brazilOffset * 60000));
  };

  const getBrazilTodayString = () => {
    const today = getBrazilToday();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const createBrazilDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const fetchInvoices = async () => {
    if (!card || card.type !== 'credit') {
      console.log('[CardInvoiceModal] fetchInvoices: Card inválido ou não é crédito', { card: card?.id, type: card?.type });
      return;
    }
    
    console.log('[CardInvoiceModal] fetchInvoices: Iniciando busca de faturas para card', card.id);
    setLoading(true);
    try {
      const today = getBrazilToday();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const refDate = `${year}-${month}-${day}`;
      console.log('[CardInvoiceModal] fetchInvoices: Data de referência', refDate);

      // Buscar ciclo atual
      let currentCycleStart = null;
      try {
        console.log('[CardInvoiceModal] fetchInvoices: Buscando ciclo de faturamento...');
        const { data: cycle, error: cycleError } = await supabase.rpc('get_billing_cycle', {
          card_uuid: card.id,
          reference_date: refDate
        });
        if (cycleError) {
          console.error('[CardInvoiceModal] fetchInvoices: Erro ao buscar ciclo:', cycleError);
        } else {
          console.log('[CardInvoiceModal] fetchInvoices: Ciclo encontrado', cycle);
        }
        if (cycle && cycle.length) {
          currentCycleStart = cycle[0].start_date;
          setCurrentCycle({ start: cycle[0].start_date, end: cycle[0].end_date });
          console.log('[CardInvoiceModal] fetchInvoices: Ciclo atual definido', { start: cycle[0].start_date, end: cycle[0].end_date });
        }
      } catch (error) {
        console.error('[CardInvoiceModal] fetchInvoices: Erro ao buscar ciclo atual:', error);
      }

      // Buscar faturas da tabela card_invoices usando a view detalhada (igual ao web)
      console.log('[CardInvoiceModal] fetchInvoices: Buscando faturas da view v_card_invoices_detailed para card', card.id);
      const { data: invoiceRecords, error: invoicesError } = await supabase
        .from('v_card_invoices_detailed')
        .select('*')
        .eq('card_id', card.id)
        .order('cycle_start_date', { ascending: true }); // Ordem crescente (mais antiga primeiro)

      if (invoicesError) {
        console.error('[CardInvoiceModal] fetchInvoices: Erro ao buscar faturas:', invoicesError);
        console.error('[CardInvoiceModal] fetchInvoices: Detalhes do erro:', JSON.stringify(invoicesError, null, 2));
        showToast('Erro ao carregar faturas', 'error');
        setInvoices([]);
        return;
      }

      console.log('[CardInvoiceModal] fetchInvoices: Faturas encontradas:', invoiceRecords?.length || 0);
      if (invoiceRecords && invoiceRecords.length > 0) {
        console.log('[CardInvoiceModal] fetchInvoices: Primeira fatura:', invoiceRecords[0]);
      }

      if (!invoiceRecords || invoiceRecords.length === 0) {
        console.log('[CardInvoiceModal] fetchInvoices: Nenhuma fatura encontrada. Verificando se há registros em card_invoices diretamente...');
        // Verificar se há registros em card_invoices diretamente
        const { data: directInvoices, error: directError } = await supabase
          .from('card_invoices')
          .select('*')
          .eq('card_id', card.id)
          .order('cycle_start_date', { ascending: true });
        
        if (directError) {
          console.error('[CardInvoiceModal] fetchInvoices: Erro ao buscar card_invoices diretamente:', directError);
        } else {
          console.log('[CardInvoiceModal] fetchInvoices: Registros em card_invoices:', directInvoices?.length || 0);
          if (directInvoices && directInvoices.length > 0) {
            console.log('[CardInvoiceModal] fetchInvoices: Primeiro registro em card_invoices:', directInvoices[0]);
          }
        }
        
        setInvoices([]);
        return;
      }

      // Para cada fatura, buscar suas despesas
      console.log('[CardInvoiceModal] fetchInvoices: Buscando despesas para', invoiceRecords.length, 'faturas');
      const invoicesWithExpenses = await Promise.all(
        invoiceRecords.map(async (invoice, index) => {
          console.log(`[CardInvoiceModal] fetchInvoices: Buscando despesas para fatura ${index + 1}/${invoiceRecords.length}`, {
            start: invoice.cycle_start_date,
            end: invoice.cycle_end_date
          });
          
          const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('card_id', card.id)
            .eq('payment_method', 'credit_card')
            .eq('status', 'confirmed')
            .gte('date', invoice.cycle_start_date)
            .lte('date', invoice.cycle_end_date)
            .eq('pending_next_invoice', false) // Não incluir despesas fantasma
            .order('date', { ascending: true });

          if (expensesError) {
            console.error(`[CardInvoiceModal] fetchInvoices: Erro ao buscar despesas da fatura ${invoice.cycle_start_date}:`, expensesError);
          } else {
            console.log(`[CardInvoiceModal] fetchInvoices: Despesas encontradas para fatura ${invoice.cycle_start_date}:`, expenses?.length || 0);
          }

          const invoiceData = {
            startDate: invoice.cycle_start_date,
            endDate: invoice.cycle_end_date,
            total: Number(invoice.total_amount || 0),
            status: invoice.status || 'pending',
            paid_amount: Number(invoice.paid_amount || 0),
            expenses: expenses || [],
            invoice_id: invoice.invoice_id,
            transaction_count: invoice.transaction_count || 0
          };
          
          console.log(`[CardInvoiceModal] fetchInvoices: Dados da fatura ${invoice.cycle_start_date}:`, {
            total: invoiceData.total,
            paid: invoiceData.paid_amount,
            expenses: invoiceData.expenses.length,
            status: invoiceData.status
          });
          
          return invoiceData;
        })
      );

      console.log('[CardInvoiceModal] fetchInvoices: Total de faturas processadas:', invoicesWithExpenses.length);
      console.log('[CardInvoiceModal] fetchInvoices: Definindo invoices no estado...');
      setInvoices(invoicesWithExpenses);
      console.log('[CardInvoiceModal] fetchInvoices: Invoices definidos, setando loading = false');
      setLoading(false);
    } catch (error) {
      console.error('[CardInvoiceModal] fetchInvoices: Erro ao buscar faturas:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleMarkInvoiceAsPaid = async (paymentData) => {
    if (!selectedInvoice || !card) return;

    try {
      const { payment_method, bank_account_id, amount } = paymentData;
      
      const totalInvoice = selectedInvoice.total;
      const isFullPayment = amount >= totalInvoice;
      const newStatus = isFullPayment ? 'paid' : 'paid_partial';

      let bankTransactionId = null;

      // Criar transação bancária se necessário
      if (payment_method === 'bank_account' && bank_account_id) {
        const { data: transactionId, error: bankError } = await supabase
          .rpc('create_bank_transaction', {
            p_bank_account_id: bank_account_id,
            p_transaction_type: 'manual_debit',
            p_amount: amount,
            p_description: `Pagamento Fatura ${card.name} - ${formatDate(selectedInvoice.startDate)}`,
            p_date: getBrazilTodayString(),
            p_organization_id: organization.id,
            p_user_id: user?.id
          });

        if (bankError) {
          console.error('Erro ao criar transação bancária:', bankError);
          throw bankError;
        }

        const { data: bankTransaction } = await supabase
          .from('bank_account_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (!bankTransaction) {
          throw new Error('Transação bancária não encontrada após criação');
        }

        bankTransactionId = bankTransaction.id;
      }

      // Buscar ou criar registro da fatura
      let invoiceRecord;
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', card.id)
        .eq('cycle_start_date', selectedInvoice.startDate)
        .maybeSingle();

      if (fetchError) {
        console.error('Erro ao buscar fatura:', fetchError);
        throw fetchError;
      }

      if (existingInvoice) {
        const newPaidAmount = Number(existingInvoice.paid_amount || 0) + amount;
        const finalStatus = newPaidAmount >= totalInvoice ? 'paid' : 'paid_partial';

        const { data: updated, error: updateError } = await supabase
          .from('card_invoices')
          .update({
            paid_amount: newPaidAmount,
            status: finalStatus,
            first_payment_at: existingInvoice.first_payment_at || new Date().toISOString(),
            fully_paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInvoice.id)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar fatura:', updateError);
          throw updateError;
        }
        
        invoiceRecord = updated;
      } else {
        const { data: created, error: createError } = await supabase
          .from('card_invoices')
          .insert({
            card_id: card.id,
            cycle_start_date: selectedInvoice.startDate,
            cycle_end_date: selectedInvoice.endDate,
            total_amount: totalInvoice,
            paid_amount: amount,
            status: newStatus,
            first_payment_at: new Date().toISOString(),
            fully_paid_at: isFullPayment ? new Date().toISOString() : null,
            organization_id: organization.id,
            user_id: user?.id
          })
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar fatura:', createError);
          throw createError;
        }
        
        invoiceRecord = created;
      }

      // Registrar pagamento
      const { error: paymentError } = await supabase
        .from('card_invoice_payments')
        .insert({
          invoice_id: invoiceRecord.id,
          bank_transaction_id: bankTransactionId,
          amount,
          payment_date: getBrazilTodayString()
        });

      if (paymentError) {
        console.error('Erro ao registrar pagamento:', paymentError);
        throw paymentError;
      }

      // Recalcular limite
      const { data: newLimit, error: limitError } = await supabase
        .rpc('calculate_card_available_limit_v2', {
          p_card_id: card.id
        });

      if (limitError) {
        console.error('Erro ao calcular limite:', limitError);
      } else if (newLimit !== null) {
        await supabase
          .from('cards')
          .update({ available_limit: newLimit })
          .eq('id', card.id);
      }

      // Recarregar faturas
      await fetchInvoices();
      
      if (isFullPayment) {
        showToast(`Fatura de ${formatCurrency(totalInvoice)} paga! Limite do cartão liberado.`, 'success');
      } else {
        showToast(`Pagamento parcial de ${formatCurrency(amount)} registrado. Saldo restante: ${formatCurrency(totalInvoice - amount)}`, 'success');
      }
      
      setShowMarkAsPaidModal(false);
      setSelectedInvoice(null);
      onClose();
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      showToast('Erro ao processar pagamento. Tente novamente.', 'error');
    }
  };

  const handleRolloverInvoice = async () => {
    if (!selectedInvoice || !card) return;

    try {
      const { data: invoiceRecord, error: fetchError } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', card.id)
        .eq('cycle_start_date', selectedInvoice.startDate)
        .maybeSingle();

      if (fetchError) {
        console.error('Erro ao buscar fatura:', fetchError);
        throw fetchError;
      }

      let finalInvoiceRecord = invoiceRecord;
      if (!invoiceRecord) {
        const { data: created, error: createError } = await supabase
          .from('card_invoices')
          .insert({
            card_id: card.id,
            cycle_start_date: selectedInvoice.startDate,
            cycle_end_date: selectedInvoice.endDate,
            total_amount: selectedInvoice.total,
            paid_amount: selectedInvoice.paid_amount || 0,
            status: selectedInvoice.status || 'pending',
            organization_id: organization.id,
            user_id: user?.id
          })
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar fatura:', createError);
          throw createError;
        }
        
        finalInvoiceRecord = created;
      }

      const remainingAmount = finalInvoiceRecord.total_amount - (finalInvoiceRecord.paid_amount || 0);

      if (remainingAmount <= 0) {
        // TODO: Mostrar erro
        return;
      }

      // Calcular data para próxima fatura
      const nextCycleStartDate = new Date(selectedInvoice.endDate);
      nextCycleStartDate.setDate(nextCycleStartDate.getDate() + 1);
      const nextCycleDateStr = nextCycleStartDate.toISOString().split('T')[0];

      // Buscar categoria padrão
      const { data: categories } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .or('type.eq.expense,type.eq.both')
        .order('name');

      const category = categories?.find(cat => cat.name.toLowerCase() === 'contas') || categories?.[0];

      // Criar despesa fantasma
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: `Saldo anterior - ${card.name}`,
          amount: remainingAmount,
          date: nextCycleDateStr,
          category_id: category?.id || null,
          category: category?.name || 'Saldo Anterior',
          payment_method: 'credit_card',
          card_id: card.id,
          status: 'confirmed',
          pending_next_invoice: true,
          organization_id: organization.id,
          user_id: user?.id,
          source: 'manual'
        });

      if (expenseError) {
        console.error('Erro ao criar despesa fantasma:', expenseError);
        throw expenseError;
      }

      // Atualizar status da fatura
      const { error: updateError } = await supabase
        .from('card_invoices')
        .update({
          status: 'paid',
          fully_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', finalInvoiceRecord.id);

      if (updateError) {
        console.error('Erro ao atualizar status da fatura:', updateError);
        throw updateError;
      }

      // Recalcular limite
      const { data: newLimit, error: limitError } = await supabase
        .rpc('calculate_card_available_limit_v2', { p_card_id: card.id });

      if (limitError) {
        console.error('Erro ao calcular limite:', limitError);
      } else if (newLimit !== null) {
        await supabase
          .from('cards')
          .update({ available_limit: newLimit })
          .eq('id', card.id);
      }

      await fetchInvoices();
      
      showToast(`Saldo de ${formatCurrency(remainingAmount)} transferido para a próxima fatura!`, 'success');
      
      setShowRolloverModal(false);
      setSelectedInvoice(null);
      onClose();
      
    } catch (error) {
      console.error('Erro ao transferir saldo:', error);
      showToast('Erro ao transferir saldo. Tente novamente.', 'error');
    }
  };

  if (!visible || !card) {
    console.log('[CardInvoiceModal] Render: Modal não visível ou card não definido', { visible, card: card?.id });
    return null;
  }

  console.log('[CardInvoiceModal] Render: Renderizando modal', { 
    loading, 
    invoicesCount: invoices.length,
    cardId: card.id,
    cardName: card.name
  });

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Animated.View 
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Animated.View 
            style={[
              styles.modal,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <CreditCard size={24} color={colors.brand.primary} />
                <View style={styles.headerText}>
                  <Headline weight="semiBold">Faturas - {card.name}</Headline>
                  <Caption color="secondary">Vence no dia {card.billing_day}</Caption>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled={true}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.brand.primary} />
                  <Caption color="secondary" style={{ marginTop: spacing[2] }}>
                    Carregando faturas...
                  </Caption>
                </View>
              ) : invoices.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <CreditCard size={64} color={colors.text.tertiary} />
                  <Caption color="secondary" style={{ marginTop: spacing[2] }}>
                    Nenhuma fatura encontrada
                  </Caption>
                </View>
              ) : (
                <View style={styles.invoicesList}>
                  {invoices.map((invoice, index) => {
                    console.log(`[CardInvoiceModal] Render: Renderizando fatura ${index + 1}/${invoices.length}`, invoice.startDate);
                    const endDateBrazil = createBrazilDate(invoice.endDate);
                    const closingDate = new Date(endDateBrazil.getFullYear(), endDateBrazil.getMonth(), endDateBrazil.getDate() + 1);
                    
                    const billingDay = card.billing_day || 15;
                    let dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth(), billingDay);
                    
                    if (billingDay < closingDate.getDate()) {
                      dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth() + 1, billingDay);
                    }
                    
                    const today = getBrazilToday();
                    const closingDateNormalized = new Date(closingDate.getFullYear(), closingDate.getMonth(), closingDate.getDate());
                    const hasClosed = closingDateNormalized <= today;
                    
                    const invoiceStartDate = createBrazilDate(invoice.startDate);
                    const invoiceStartDateNormalized = new Date(invoiceStartDate.getFullYear(), invoiceStartDate.getMonth(), invoiceStartDate.getDate());
                    const currentCycleStart = currentCycle?.start ? createBrazilDate(currentCycle.start) : null;
                    const currentCycleStartNormalized = currentCycleStart ? new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), currentCycleStart.getDate()) : null;
                    
                    const isCurrentCycle = !hasClosed && currentCycleStartNormalized && invoiceStartDateNormalized.getTime() === currentCycleStartNormalized.getTime();
                    const isFuture = invoiceStartDateNormalized > today;
                    
                    const allPreviousInvoicesPaid = invoices
                      .slice(0, index)
                      .every(inv => inv.status === 'paid');
                    
                    const canShowPayButton = allPreviousInvoicesPaid && !isFuture && invoice.status !== 'paid';
                    const canShowRolloverButton = hasClosed && invoice.status === 'paid_partial';
                    
                    console.log(`[CardInvoiceModal] Fatura ${invoice.startDate}:`, {
                      canShowPayButton,
                      allPreviousInvoicesPaid,
                      isFuture,
                      status: invoice.status,
                      isCurrentCycle,
                      hasClosed
                    });
                    
                    let statusLabel = '';
                    if (isCurrentCycle) {
                      statusLabel = 'Fatura Atual';
                    } else {
                      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                      const monthName = monthNames[dueDate.getMonth()];
                      statusLabel = `Fatura de ${monthName}`;
                    }
                    
                    const invoiceKey = `${invoice.startDate}-${invoice.endDate}`;
                    const isExpanded = expandedInvoices.has(invoiceKey);
                    const expenses = invoice.expenses || [];
                    
                    const toggleExpand = () => {
                      const newExpanded = new Set(expandedInvoices);
                      if (isExpanded) {
                        newExpanded.delete(invoiceKey);
                      } else {
                        newExpanded.add(invoiceKey);
                      }
                      setExpandedInvoices(newExpanded);
                    };

                    // Fatura paga - visual simplificado
                    if (invoice.status === 'paid') {
                      return (
                        <Card key={index} style={[styles.invoiceCard, styles.paidCard]}>
                          <View style={styles.invoiceHeader}>
                            <View style={styles.invoiceHeaderLeft}>
                              <Callout weight="medium">{statusLabel}</Callout>
                              <Caption color="secondary" style={{ color: colors.success.main, marginTop: spacing[0.5] }}>
                                ✓ Paga
                              </Caption>
                            </View>
                            <Callout weight="bold">{formatCurrency(invoice.total)}</Callout>
                          </View>
                        </Card>
                      );
                    }

                    return (
                      <Card 
                        key={index} 
                        style={[
                          styles.invoiceCard,
                          isCurrentCycle && styles.currentCycleCard,
                          hasClosed && !isCurrentCycle && styles.closedCard
                        ]}
                      >
                        <View style={styles.invoiceHeader}>
                          <View style={styles.invoiceHeaderLeft}>
                            {/* Primeira linha: Título + Botão expandir + Valor */}
                            <View style={styles.invoiceTitleRow}>
                              <Callout weight="semiBold" style={{ flex: 1 }}>{statusLabel}</Callout>
                              {expenses.length > 0 && (
                                <TouchableOpacity
                                  onPress={toggleExpand}
                                  style={styles.expandButton}
                                >
                                  {isExpanded ? (
                                    <ChevronUp size={20} color={colors.text.secondary} />
                                  ) : (
                                    <ChevronDown size={20} color={colors.text.secondary} />
                                  )}
                                </TouchableOpacity>
                              )}
                              <View style={styles.invoiceAmount}>
                                <Callout 
                                  weight="bold" 
                                  style={[
                                    styles.invoiceAmountText,
                                    isCurrentCycle && { color: colors.brand.primary },
                                    hasClosed && !isCurrentCycle && { color: colors.warning.main }
                                  ]}
                                >
                                  {formatCurrency(invoice.total)}
                                </Callout>
                              </View>
                            </View>
                            
                            {/* Segunda linha: Data do ciclo */}
                            <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                              Data do ciclo: {new Date(invoice.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(invoice.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </Caption>
                            
                            {/* Terceira linha: Fechou em... */}
                            {hasClosed && !isFuture && (
                              <Caption style={{ color: colors.warning.main, marginTop: spacing[0.5] }}>
                                Fechou em {closingDate.toLocaleDateString('pt-BR')}
                              </Caption>
                            )}
                            
                            {/* Informações de pagamento parcial */}
                            {invoice.status === 'paid_partial' && invoice.paid_amount > 0 && (
                              <View style={{ marginTop: spacing[1] }}>
                                <Caption style={{ color: colors.success.main }}>
                                  Pago: {formatCurrency(invoice.paid_amount)}
                                </Caption>
                                <Caption style={{ color: colors.warning.main }}>
                                  Restante: {formatCurrency(invoice.total - invoice.paid_amount)}
                                </Caption>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Lista de transações expandida */}
                        {isExpanded && expenses.length > 0 && (
                          <View style={styles.expensesContainer}>
                            <Subheadline weight="semiBold" style={{ marginBottom: spacing[2] }}>
                              Transações ({expenses.length})
                            </Subheadline>
                            <View style={styles.expensesList}>
                              {expenses
                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                .map((expense, expIndex) => {
                                  const expenseDate = new Date(expense.date + 'T00:00:00');
                                  const isInstallment = expense.installment_info && 
                                    expense.installment_info.total_installments > 1;
                                  const displayAmount = expense.installmentAmount || expense.amount || 0;
                                  const installmentText = isInstallment 
                                    ? `${expense.installment_info.current_installment}/${expense.installment_info.total_installments}`
                                    : '';
                                  
                                  return (
                                    <View key={expense.id || expIndex} style={styles.expenseItem}>
                                      <Caption color="secondary">
                                        {expenseDate.toLocaleDateString('pt-BR')}
                                      </Caption>
                                      <View style={styles.expenseContent}>
                                        <Callout numberOfLines={1}>
                                          {expense.description || 'Sem descrição'}
                                          {installmentText && (
                                            <Caption color="secondary" style={{ marginLeft: spacing[0.5] }}>
                                              {installmentText}
                                            </Caption>
                                          )}
                                        </Callout>
                                      </View>
                                      <Callout weight="bold">{formatCurrency(displayAmount)}</Callout>
                                    </View>
                                  );
                                })}
                            </View>
                          </View>
                        )}

                        {/* Botões de ação */}
                        {(canShowPayButton || canShowRolloverButton) && (
                          <View style={styles.actionsContainer}>
                            {canShowPayButton && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.payButton]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  console.log('[CardInvoiceModal] Botão Pagar clicado para fatura:', invoice.startDate);
                                  if (onPayInvoice) {
                                    onPayInvoice(invoice);
                                  } else {
                                    setSelectedInvoice(invoice);
                                    setShowMarkAsPaidModal(true);
                                  }
                                }}
                              >
                                <CheckCircle size={18} color={colors.success.main} />
                                <Callout weight="semiBold" style={{ color: colors.success.main, marginLeft: spacing[1] }}>
                                  Pagar
                                </Callout>
                              </TouchableOpacity>
                            )}
                            {canShowRolloverButton && (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.rolloverButton]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  if (onRolloverInvoice) {
                                    onRolloverInvoice(invoice);
                                  } else {
                                    setSelectedInvoice(invoice);
                                    setShowRolloverModal(true);
                                  }
                                }}
                              >
                                <ArrowRight size={18} color={colors.error.main} />
                                <Callout weight="semiBold" style={{ color: colors.error.main, marginLeft: spacing[1] }}>
                                  Lançar saldo na próxima fatura
                                </Callout>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
                <Callout weight="semiBold" style={{ color: colors.brand.primary }}>
                  Fechar
                </Callout>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Modais renderizados fora do CardInvoiceModal para evitar problemas de z-index */}
      <RolloverInvoiceModal
        visible={showRolloverModal}
        onClose={() => {
          setShowRolloverModal(false);
          setSelectedInvoice(null);
        }}
        onConfirm={handleRolloverInvoice}
        invoice={selectedInvoice}
        card={card}
        remainingAmount={selectedInvoice ? (selectedInvoice.total - (selectedInvoice.paid_amount || 0)) : 0}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '98%',
    minHeight: 600,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.brand.bg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
    minHeight: 200,
  },
  contentContainer: {
    padding: spacing[3],
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  invoicesList: {
    gap: spacing[2],
  },
  invoiceCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  paidCard: {
    opacity: 0.6,
    backgroundColor: colors.neutral[50],
  },
  currentCycleCard: {
    borderWidth: 2,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.bg,
  },
  closedCard: {
    borderWidth: 2,
    borderColor: colors.warning.main,
    backgroundColor: colors.warning.bg,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceHeaderLeft: {
    flex: 1,
  },
  invoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  expandButton: {
    padding: spacing[0.5],
    marginLeft: spacing[1],
  },
  invoiceAmount: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  invoiceAmountText: {
    fontSize: 18,
  },
  expensesContainer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  expensesList: {
    gap: spacing[1],
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1.5],
  },
  expenseContent: {
    flex: 1,
    marginLeft: spacing[2],
    marginRight: spacing[2],
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  payButton: {
    borderColor: colors.success.main,
    backgroundColor: colors.success.bg,
  },
  rolloverButton: {
    borderColor: colors.error.main,
    backgroundColor: colors.error.bg,
  },
  footer: {
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.neutral[50],
  },
  closeFooterButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
});

