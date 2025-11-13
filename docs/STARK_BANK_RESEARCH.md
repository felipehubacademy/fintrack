# 🏦 Stark Bank - Pesquisa Open Banking

**Data:** 12 de Novembro de 2025  
**Objetivo:** Avaliar viabilidade de integração com Open Banking para FinTrack

---

## 📋 Resumo Executivo

**Stark Bank** é um banco digital brasileiro focado em **médias e grandes empresas (B2B)**, oferecendo APIs robustas para automação financeira. A instituição possui licença do Banco Central para atuar como **Iniciador de Pagamentos** no ecossistema Open Finance.

### ✅ Pontos Positivos:
- ✅ Banco 100% brasileiro, regulado pelo BC
- ✅ APIs bem documentadas com SDKs em múltiplas linguagens (Node.js, Python, Java, .NET)
- ✅ Webhooks para notificações em tempo real
- ✅ Suporte a Pix, boletos, transferências, extratos
- ✅ Licença de Iniciador de Pagamentos (Open Finance)
- ✅ Segurança robusta (ECDSA secp256k1)

### ⚠️ Pontos de Atenção:
- ⚠️ **Foco em B2B** (médias e grandes empresas)
- ⚠️ **Preços não públicos** - necessário contato comercial
- ⚠️ Pode não ser ideal para startups/pequenas empresas
- ⚠️ Sem plano gratuito ou tier inicial público

---

## 💰 Modelo de Preços

### 🔍 Informações Encontradas:
- **Modelo:** Não há informações públicas sobre preços
- **Contato:** Necessário solicitar proposta comercial
- **Público-alvo:** Médias e grandes empresas

### ❌ Não Encontrado:
- Preço por transação
- Preço por conexão
- Plano inicial/starter
- Tier gratuito
- Pay-as-you-go público

### 📊 Comparação com Concorrentes:

| Provedor | Modelo | Preço Base | Público-Alvo |
|----------|--------|------------|--------------|
| **Pluggy** | Plano fixo | R$ 2.000/mês | Empresas médias |
| **Belvo** | Pay-as-you-go | ~US$ 0,10/link | Startups/Empresas |
| **Stark Bank** | Sob consulta | ❓ | Médias/Grandes empresas |

---

## 🔧 Funcionalidades Técnicas

### APIs Disponíveis:
1. **Open Finance (Iniciador de Pagamentos)**
   - Pagamentos via Pix sem copiar chaves
   - Experiência fluida para usuário final
   - Integração direta com bancos

2. **Pix Automático** (Lançado em Junho/2025)
   - Cobranças recorrentes via Pix
   - Autorização prévia do cliente
   - Sem necessidade de convênios bancários

3. **Extratos e Transações**
   - Consulta de saldo em tempo real
   - Download de extratos via API
   - Conciliação automática com ERP

4. **Webhooks**
   - Notificações em tempo real
   - Atualização automática de transações
   - Reduz necessidade de polling

### SDKs Disponíveis:
- **Node.js:** [npmjs.com/package/starkbank](https://www.npmjs.com/package/starkbank)
- **Python:** [pypi.org/project/starkbank](https://pypi.org/project/starkbank)
- **.NET:** [nuget.org/packages/starkbank](https://www.nuget.org/packages/starkbank)
- **Java:** [github.com/starkbank/sdk-java](https://github.com/starkbank/sdk-java)

### Autenticação:
- **Método:** ECDSA com curva secp256k1
- **Chaves:** Privada (cliente) + Pública (registrada no Stark)
- **Segurança:** Assinatura de todas as requisições

---

## 🎯 Avaliação para FinTrack

### ✅ Vantagens:
1. **Regulamentação:** Banco regulado pelo BC, maior confiança
2. **Tecnologia:** APIs modernas, webhooks, SDKs completos
3. **Inovação:** Pix Automático, Open Finance
4. **Suporte:** Documentação em português, suporte local

### ❌ Desvantagens:
1. **Custo:** Preços não públicos, provavelmente alto para startups
2. **Público-alvo:** Foco em B2B médio/grande porte
3. **Barreira de entrada:** Necessário contato comercial
4. **Sem tier gratuito:** Não há plano para testes/MVP

---

## 🔄 Alternativas Recomendadas

### 1. **Belvo** ⭐ RECOMENDADO PARA MVP
- **Preço:** ~US$ 0,10 por conexão/mês (~R$ 0,50)
- **Modelo:** Pay-as-you-go
- **Mínimo:** Nenhum
- **Cobertura:** América Latina (Brasil incluído)
- **Ideal para:** Startups, MVPs, escala gradual

**Projeção de custos:**
```
10 usuários:   10 × R$ 0,50 = R$ 5/mês
100 usuários:  100 × R$ 0,50 = R$ 50/mês
1.000 usuários: 1.000 × R$ 0,50 = R$ 500/mês
```

### 2. **Pluggy**
- **Preço:** R$ 2.000/mês (plano inicial)
- **Modelo:** Plano fixo
- **Cobertura:** 300+ instituições brasileiras
- **Ideal para:** Empresas com volume garantido (>4.000 usuários)

### 3. **Stark Bank**
- **Preço:** Sob consulta
- **Modelo:** Customizado
- **Ideal para:** Empresas consolidadas, alto volume

---

## 📞 Próximos Passos

### Para Usar Stark Bank:
1. ✅ Acessar: [starkbank.com](https://starkbank.com)
2. ✅ Solicitar proposta comercial
3. ✅ Avaliar custos vs. volume esperado
4. ✅ Comparar com Belvo/Pluggy

### Para Implementar Open Banking (Geral):
1. ✅ Escolher provedor (Belvo recomendado para MVP)
2. ✅ Criar conta de desenvolvedor
3. ✅ Testar em sandbox (gratuito)
4. ✅ Implementar webhooks para atualização automática
5. ✅ Integrar SDK no backend
6. ✅ Criar fluxo de autorização para usuários
7. ✅ Monitorar custos conforme escala

---

## 🎯 Recomendação Final

### Para FinTrack (Startup/MVP):

**NÃO usar Stark Bank inicialmente** ❌

**Motivos:**
- Foco em empresas médias/grandes
- Preços não públicos (provavelmente alto)
- Barreira de entrada comercial
- Sem tier gratuito para testes

**Usar Belvo** ✅

**Motivos:**
- Pay-as-you-go (R$ 0,50/usuário/mês)
- Sem custo fixo
- Ideal para MVP e escala gradual
- Fácil integração
- Documentação completa

**Migrar para Stark Bank quando:**
- Atingir 5.000+ usuários ativos
- Necessitar funcionalidades B2B avançadas
- Custo fixo se tornar mais vantajoso
- Precisar de suporte enterprise

---

## 📚 Links Úteis

- **Stark Bank:** https://starkbank.com
- **Stark Bank Help:** https://starkbank.com/help
- **Stark Bank API Docs:** https://help-center.atlasbeta.so/stark-bank/categories/498554-api-documentation
- **Belvo:** https://belvo.com
- **Pluggy:** https://pluggy.ai
- **Open Finance Brasil:** https://openbankingbrasil.org.br

---

## ✅ Conclusão

**Stark Bank** é uma solução robusta e confiável para **Open Banking no Brasil**, mas é mais adequada para **empresas estabelecidas** com volume significativo. Para o **FinTrack (MVP)**, recomenda-se iniciar com **Belvo** (pay-as-you-go) e considerar migração futura para Stark Bank quando o volume justificar.

**Atualização automática:** ✅ SIM, é possível via webhooks em qualquer provedor (Stark, Belvo, Pluggy).

---

**Preparado por:** AI Assistant  
**Revisão:** Pendente  
**Status:** Pesquisa Completa ✅

