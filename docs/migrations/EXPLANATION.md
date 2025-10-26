# Explicação das Migrations

## Impacto no Sistema

### ✅ NÃO altera contas familiares

**Contas Familiares (`/create-organization`):**
1. Cria 2 cost centers **MANUALMENTE** via código:
   - Principal (100%)
   - Compartilhado (50%)
2. O trigger **NÃO dispara** porque já existem cost centers criados
3. **Nada muda** na lógica atual

### ✅ Afeta apenas contas solo

**Contas Solo (`/create-account`):**
1. **Antes:** Criava cost center manualmente (duplicação com trigger)
2. **Depois:** Apenas trigger cria (100%)
3. Evita duplicação

## Como funciona

### Trigger: `auto_create_cost_center_for_user()`

```sql
-- Só executa SE:
-- 1. user_id é vinculado a organization_id
-- 2. Role é 'admin' ou 'member'
-- 3. NÃO existe cost center vinculado a este usuário
```

**Para contas familiares:**
- Cost centers já foram criados manualmente
- Trigger verifica e NÃO cria (já existem)
- Nenhuma mudança

**Para contas solo:**
- Nenhum cost center existe ainda
- Trigger cria automaticamente com 100%
- Evita duplicação

## Conclusão

✅ **Seguro:** Não altera contas familiares  
✅ **Apenas fix:** Remove duplicação de cost centers em contas solo  
✅ **Escalável:** Funciona para todas as contas  

**Pode aplicar sem medo!**

