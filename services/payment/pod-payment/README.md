# Payment Service

Provider-agnostic payment service supporting multiple subscription providers (Polar.sh, Stripe, etc.).

## Architecture

```
Client (UI)
    ↓ POST /api/v1/subscriptions/:workspace/subscribe
Payment Service → Accounts Service (caller auth)
    ↓ Create checkout via provider API
Payment Provider (Polar.sh, Stripe, etc.)
    ↓ Webhook → POST /api/v1/webhooks/:provider
Payment Service → Accounts Service (upsert subscription)
```

## Subscription Creation Flow

### Step 1: Client Creates Checkout

**Request:**
```
POST /api/v1/subscriptions/:workspace/subscribe
Authorization: Bearer {token}

{
  "type": "tier" | "support",
  "plan": "common" | "rare" | "epic" | "legendary",
  "customerEmail"?: string,
  "customerName"?: string
}
```

**Response:**
```json
{
  "checkoutId": "checkout_abc123",
  "checkoutUrl": "https://checkout.polar.sh/session/abc123"
}
```

### Step 2: Payment

User is redirected to `checkoutUrl` and completes payment with the provider.

### Step 3: Success Redirect

After payment, user is redirected to the success URL with these query parameters:

```
FRONT_URL/workbench/setting/setting/billing?payment=success&checkout_id={CHECKOUT_ID}
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/subscriptions/:workspace/subscribe` | POST | Create subscription checkout |
| `/api/v1/subscriptions/:subscriptionId` | GET | Get subscription details (admin only) |
| `/api/v1/subscriptions/:subscriptionId/cancel` | POST | Cancel subscription |
| `/api/v1/webhooks/:provider` | POST | Receive webhook events from payment provider |

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port to listen on | `3040` |
| `ACCOUNTS_URL` | Accounts service URL | `http://huly.local:3000` |
| `FRONT_URL` | Frontend URL for redirects | `https://huly.local:8087` |

### Polar.sh Provider

To enable Polar.sh as the payment provider, set:

| Variable | Description | Example |
|----------|-------------|---------|
| `POLAR_ACCESS_TOKEN` | Polar.sh API access token | `polar_...` |
| `POLAR_WEBHOOK_SECRET` | Webhook signature secret | `whsec_...` |
| `POLAR_SUBSCRIPTION_PLANS` | Plan to product IDs mapping | `common@tier:prod_1a,prod_1b;rare@tier:prod_2;epic@tier:prod_3;legendary@tier:prod_4` |

**Format:** `{plan}@{type}:{productIds};...` where `productIds` are comma-separated uuids of products in your Polar.sh account.

**Webhook** endpoint is registered at `/api/v1/webhooks/polar`.

### Multiple Providers

To support additional providers (Stripe, Lemonsqueezy, etc.):

1. Add environment variables for that provider
2. Create provider implementation extending `PaymentProvider` interface
3. Register in `PaymentProviderFactory.create()`
4. Provider registers its webhook endpoint via `registerWebhookEndpoints()`
