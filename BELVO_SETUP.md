# Belvo Open Finance Setup Guide

## Overview

This guide will help you set up the Belvo Open Finance integration for FinTrack. The integration allows users to automatically sync their bank accounts, credit cards, and transactions via Belvo's secure API.

## Features

- **Hybrid Mode**: Support for both manual and Belvo-synced accounts/cards
- **Automatic Sync**: Real-time transaction synchronization via webhooks
- **Read-Only Enforcement**: Belvo accounts are automatically marked as read-only
- **Transaction Classification**: Smart classification of debits, credits, and transfers
- **Consent Management**: Built-in consent expiration tracking and renewal

## Prerequisites

1. A Belvo account (sandbox or production)
2. Belvo API credentials (Secret ID and Secret Password)
3. Running FinTrack instance
4. Supabase database with admin access

## Step 1: Database Migration

Execute the Belvo schema migration in your Supabase SQL Editor:

```bash
# Copy the migration file
cat docs/migrations/add-belvo-open-finance-support.sql

# Then paste and execute in Supabase SQL Editor
```

This will create:
- `belvo_links` - Stores connection information
- `belvo_webhooks_processed` - Prevents duplicate webhook processing
- `transfers` - Internal account transfers
- `credit_card_bills` - Credit card billing cycles
- Extended columns in `bank_accounts`, `cards`, `expenses`, `incomes`

## Step 2: Configure Environment Variables

1. Copy the example file:
```bash
cp .env.belvo.example .env.local
```

2. Fill in your Belvo credentials:
```env
BELVO_API_URL=https://sandbox.belvo.com  # or https://api.belvo.com for production
BELVO_SECRET_ID=your_secret_id
BELVO_SECRET_PASSWORD=your_secret_password
NEXT_PUBLIC_BELVO_APP_ID=your_app_id  # Optional, for My Belvo Portal
```

3. Ensure Supabase keys are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Configure Belvo Webhooks

1. Log in to your Belvo Dashboard
2. Navigate to **Settings > Webhooks**
3. Create a new webhook with your FinTrack URL:
   ```
   https://your-domain.com/api/belvo/webhooks
   ```
4. Subscribe to these events:
   - `historical_update` (ACCOUNTS)
   - `historical_update` (TRANSACTIONS)
   - `new_transactions_available`
   - `consent_expired`

## Step 4: Deploy to Vercel

1. Add environment variables to Vercel:
```bash
vercel env add BELVO_API_URL
vercel env add BELVO_SECRET_ID
vercel env add BELVO_SECRET_PASSWORD
vercel env add NEXT_PUBLIC_BELVO_APP_ID
```

2. Deploy:
```bash
vercel --prod
```

## API Endpoints

The following endpoints are now available:

### Widget & Connection
- `POST /api/belvo/widget-session` - Create widget access token
- `GET /api/belvo/links` - List user's connections
- `POST /api/belvo/links` - Create new connection record
- `GET /api/belvo/links/[id]` - Get specific connection
- `DELETE /api/belvo/links/[id]` - Revoke connection

### Sync & Data
- `POST /api/belvo/links/[id]/sync` - Manual sync trigger
- `POST /api/belvo/transactions/pull` - Fallback manual data pull
- `POST /api/belvo/webhooks` - Webhook receiver (called by Belvo)

## Usage Flow

### For Users

1. Navigate to **Bank Accounts** page
2. Click **"Conectar Banco"** in the Belvo Connections section
3. Select their bank from the Belvo widget
4. Authenticate with their bank credentials
5. Wait for sync to complete (~30-60 seconds)
6. Accounts and transactions appear automatically

### What Happens Behind the Scenes

1. **Widget Session**: Frontend requests access token from `/api/belvo/widget-session`
2. **User Connection**: User completes authentication in Belvo widget
3. **Link Creation**: Widget posts success event → creates `belvo_links` record
4. **Webhook Sync**: Belvo sends webhooks with accounts and transactions
5. **Data Processing**: 
   - Accounts → `bank_accounts` or `cards` (marked as `provider='belvo'`)
   - Transactions → `expenses`, `incomes`, or `transfers`
   - Deduplication via `belvo_transaction_id`
6. **Auto-categorization**: Transactions mapped to FinTrack categories
7. **Status Update**: Link status changes from `pending_sync` → `synced`

## Transaction Classification Logic

```
IF type == 'TRANSFER' OR category == 'transfer'
  → Create record in transfers table
  
ELSE IF type == 'INFLOW' OR category is income-related
  → Create record in incomes table
  
ELSE IF type == 'OUTFLOW'
  IF account is credit card
    → Create expense with payment_method='credit_card'
  ELSE
    → Create expense with payment_method='debit_card'
```

## Category Mapping

Belvo categories are automatically mapped to FinTrack categories:

| Belvo Category | FinTrack Category |
|---|---|
| food_and_groceries | Alimentação |
| transport_and_travel | Transporte |
| health_and_fitness | Saúde |
| entertainment | Lazer |
| bills_and_utilities | Contas |
| home | Casa |
| education | Educação |
| investments | Investimentos |
| salary, income | Salário |
| Other | Outros |

See `backend/utils/belvoCategoryMapper.js` for full mapping.

## Security Considerations

- ✅ User credentials never touch FinTrack servers
- ✅ All auth handled by Belvo's secure infrastructure
- ✅ Webhook idempotency prevents duplicate transactions
- ✅ Read-only enforcement on Belvo accounts
- ✅ Consent expiration tracking and notifications
- ✅ Support for My Belvo Portal for user consent management

## Testing

### Sandbox Testing

1. Use Belvo sandbox credentials
2. Test with sandbox bank: **Banco Sandbox**
3. Use test credentials provided by Belvo
4. Verify webhook reception in logs

### Production Checklist

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Webhooks configured in Belvo Dashboard
- [ ] Webhook URL is publicly accessible
- [ ] SSL certificate valid
- [ ] Test connection with real bank (small test account)
- [ ] Monitor first sync for errors
- [ ] Verify transaction classification accuracy
- [ ] Test consent expiration flow

## Troubleshooting

### Widget doesn't load
- Check `BELVO_SECRET_ID` and `BELVO_SECRET_PASSWORD`
- Verify CORS settings allow Belvo widget
- Check browser console for errors

### Webhooks not received
- Verify webhook URL is publicly accessible
- Check webhook configuration in Belvo Dashboard
- Verify firewall/security group rules
- Check server logs for incoming requests

### Transactions not syncing
- Check `belvo_webhooks_processed` table for errors
- Verify `belvo_links.status` is 'synced'
- Manually trigger sync via UI
- Check logs for webhook processing errors

### Duplicate transactions
- Ensure `belvo_transaction_id` unique constraints exist
- Check deduplication logic in webhook processor
- Verify idempotency is working

## Support

- Belvo Documentation: https://docs.belvo.com
- Belvo Support: support@belvo.com
- FinTrack Issues: [Your GitHub Issues URL]

## Regulatory Compliance

Belvo is certified under Brazil's Open Finance regulations. Key features:

- ✅ Secure consent management
- ✅ 90-day consent validity
- ✅ User-controlled data access
- ✅ My Belvo Portal for consent oversight
- ✅ Automatic consent expiration handling

For production use, ensure you comply with:
- LGPD (Lei Geral de Proteção de Dados)
- Brazilian Open Finance regulations
- Belvo's terms of service
