# ⚠️ IMPORTANTE: Coluna de Telefone

## 📋 Coluna Correta

**Use sempre a coluna `phone` na tabela `users` para telefone/WhatsApp.**

```sql
-- ✅ CORRETO
SELECT id, name, phone FROM users;

-- ❌ ERRADO (coluna não existe mais)
SELECT id, name, whatsapp_phone FROM users;
```

## 🔄 Histórico

- **Antes**: Existia a coluna `whatsapp_phone` (removida)
- **Agora**: Use apenas a coluna `phone`
- **Migração**: A coluna `whatsapp_phone` foi removida em uma migração anterior

## 📝 Em Código

```javascript
// ✅ CORRETO
const { data: user } = await supabase
  .from('users')
  .select('id, name, phone')
  .eq('id', userId)
  .single();

if (!user.phone) {
  console.log('Usuário não tem telefone cadastrado');
}

// ❌ ERRADO
const { data: user } = await supabase
  .from('users')
  .select('id, name, whatsapp_phone') // Esta coluna não existe mais!
  .eq('id', userId)
  .single();
```

## 🚨 Se Você Ver `whatsapp_phone` em Documentação

Se encontrar referências a `whatsapp_phone` em:
- Arquivos de migração SQL antigos
- Documentação histórica
- Commits antigos

**Ignore essas referências** - elas são históricas. Use sempre `phone`.

## ✅ Verificação

Para verificar se a coluna existe no banco:

```sql
-- Verificar colunas da tabela users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('phone', 'whatsapp_phone');
```

Você deve ver apenas `phone`, não `whatsapp_phone`.

