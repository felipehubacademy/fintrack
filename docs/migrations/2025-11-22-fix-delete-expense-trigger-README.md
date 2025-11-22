# Correção: Erro ao Deletar Despesas de Cartão

## 🔍 Problema Identificado

Ao tentar deletar uma despesa de cartão de crédito, ocorria o seguinte erro:

```
DELETE https://...supabase.co/rest/v1/expenses?id=eq.2289 403 (Forbidden)
Erro: new row violates row-level security policy for table "card_invoices"
```

## 🎯 Causa Raiz

1. **Trigger automático**: Quando uma despesa é deletada, o trigger `sync_card_invoice_trigger` é executado
2. **Tentativa de INSERT/UPDATE**: O trigger chama a função `sync_card_invoice()` que tenta criar/atualizar a tabela `card_invoices`
3. **Violação de RLS**: A função estava executando sem `SECURITY DEFINER`, então quando o trigger rodava, `auth.uid()` não estava disponível, violando a política RLS de INSERT:
   ```sql
   WITH CHECK (
     organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
     AND user_id = auth.uid()  -- ← Falha aqui porque auth.uid() é NULL no contexto do trigger
   )
   ```
4. **Bug adicional**: O trigger retornava `NEW` em DELETE, quando deveria retornar `OLD`

## ✅ Solução Implementada

### Arquivo: `docs/migrations/2025-11-22-fix-delete-expense-trigger.sql`

**1. Adicionado `SECURITY DEFINER` à função `sync_card_invoice()`**
   - Permite que a função execute com privilégios do owner
   - Bypassa as políticas RLS quando chamada por triggers
   - Mantém segurança pois valida organização internamente

**2. Corrigido o RETURN do trigger**
   - Agora retorna `OLD` quando é DELETE
   - Retorna `NEW` quando é INSERT/UPDATE
   - Evita erros de referência a linha inexistente

**3. Garantias de Segurança**
   - Não afeta as mudanças de edição de parcelas de ontem ✅
   - Não modifica políticas RLS de expenses/incomes ✅
   - Mantém validação de organização na função ✅
   - Usuários da mesma org continuam podendo editar/deletar ✅

## 🚀 Como Aplicar

1. Abrir o **SQL Editor** do Supabase
2. Copiar e colar o conteúdo de: `docs/migrations/2025-11-22-fix-delete-expense-trigger.sql`
3. Executar
4. Testar deletando uma despesa de cartão

## 📋 O que NÃO foi alterado (preservado)

- ✅ Função `update_installment_group()` (já tem SECURITY DEFINER)
- ✅ Função `create_installments()` (já tem SECURITY DEFINER)
- ✅ Políticas RLS de expenses (UPDATE/DELETE por organização)
- ✅ Políticas RLS de incomes (UPDATE/DELETE por organização)
- ✅ Funcionalidade de editar parcelas sem duplicar

## ✨ Resultado Esperado

Após aplicar a migração:
- ✅ Deletar despesas de cartão funcionará normalmente
- ✅ Deletar despesas normais continuará funcionando
- ✅ Editar parcelas continuará funcionando (sem criar duplicatas)
- ✅ Usuários da mesma org podem editar/deletar despesas de outros
- ✅ O trigger continuará sincronizando faturas automaticamente

---

**Data**: 22/11/2025  
**Status**: Pronto para aplicar  
**Impacto**: Baixo - Apenas corrige bug de deleção  
**Risco**: Baixíssimo - Não afeta outras funcionalidades

