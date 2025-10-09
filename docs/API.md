# FinTrack API Documentation

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-backend.onrender.com`

## Endpoints

### 1. Health Check

Check if the API is running.

**Request:**
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

---

### 2. Pluggy Authentication Test

Test connection to Pluggy API.

**Request:**
```http
POST /auth
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "apiKey": "pk_test_abc..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Authentication failed: Invalid credentials"
}
```

---

### 3. Check Transactions

Fetch new transactions from Pluggy and save to Supabase.

**Request:**
```http
GET /check
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 15 transactions, 3 new expenses saved",
  "newExpenses": [
    {
      "id": 123,
      "date": "2025-10-09",
      "description": "UBER *TRIP",
      "amount": 25.50,
      "source": "pluggy",
      "owner": null,
      "split": false,
      "created_at": "2025-10-09T12:00:00.000Z"
    }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to fetch transactions: Connection timeout"
}
```

---

### 4. WhatsApp Webhook Verification

Verify webhook for WhatsApp Cloud API.

**Request:**
```http
GET /webhook?hub.mode=subscribe&hub.verify_token=fintrack_verify_token&hub.challenge=123456
```

**Response:**
```
123456
```

---

### 5. WhatsApp Webhook

Receive button responses from WhatsApp.

**Request:**
```http
POST /webhook
Content-Type: application/json
```

**Request Body:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "type": "interactive",
          "interactive": {
            "type": "button_reply",
            "button_reply": {
              "id": "123_felipe"
            }
          }
        }]
      }
    }]
  }]
}
```

**Response:**
```
200 OK
```

---

## Authentication

### Backend API

The backend uses **service role key** from Supabase to write to the database. No additional authentication is required for internal endpoints.

For production, you should add API key authentication:

```javascript
// Add to backend/index.js
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Frontend API

The frontend uses **Supabase Auth** with magic links. Protected routes check for valid session:

```javascript
const session = await supabase.auth.getSession();
if (!session) {
  router.push('/');
}
```

---

## Data Models

### Expense

```typescript
interface Expense {
  id: number;
  date: string;           // ISO date: "2025-10-09"
  description: string;    // Transaction description
  amount: number;         // Always positive (debit amount)
  owner: string | null;   // "Felipe" | "Letícia" | "Compartilhado" | null
  split: boolean;         // true if owner is "Compartilhado"
  source: string;         // "pluggy" | "manual"
  created_at: string;     // ISO timestamp
}
```

### Pluggy Transaction

```typescript
interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;         // Negative for debit
  date: string;
  accountId: string;
  category: string | null;
}
```

---

## Rate Limits

- **GitHub Actions Cron**: Every 10 minutes
- **Pluggy API**: 10 requests per second
- **WhatsApp API**: 1000 messages per day (free tier)

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Webhooks

### WhatsApp Webhook Setup

1. URL: `https://your-backend.onrender.com/webhook`
2. Verify Token: `fintrack_verify_token`
3. Subscribe to: `messages`

### Expected Events

**Button Reply:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "messages": [{
          "from": "5511999999999",
          "id": "wamid.XXX",
          "timestamp": "1633024800",
          "type": "interactive",
          "interactive": {
            "type": "button_reply",
            "button_reply": {
              "id": "123_felipe",
              "title": "Felipe"
            }
          }
        }]
      }
    }]
  }]
}
```

---

## Testing

### Using cURL

**Check transactions:**
```bash
curl -X GET https://your-backend.onrender.com/check
```

**Test Pluggy auth:**
```bash
curl -X POST https://your-backend.onrender.com/auth
```

**Health check:**
```bash
curl https://your-backend.onrender.com/health
```

### Using Postman

Import this collection:
```json
{
  "info": {
    "name": "FinTrack API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Check Transactions",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/check"
      }
    },
    {
      "name": "Test Auth",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth"
      }
    }
  ]
}
```

---

## Best Practices

1. **Always use HTTPS** in production
2. **Validate webhook signatures** from WhatsApp
3. **Implement rate limiting** for public endpoints
4. **Log all errors** for debugging
5. **Monitor API usage** to stay within limits
6. **Cache Pluggy API key** (valid for 1 hour)
7. **Handle duplicate transactions** gracefully

---

## Support

For issues or questions, please refer to the main [README.md](../README.md).

