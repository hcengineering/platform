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

## Running Locally

To run the payment service locally:

```bash
rushx run-local
```

Make sure you have all required environment variables configured (see [Environment Configuration](#environment-configuration) below).

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

### Stripe Provider

To enable Stripe as the payment provider, set:

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_API_KEY` | Stripe API secret key | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |
| `STRIPE_SUBSCRIPTION_PLANS` | Plan to price ID mapping | `common@tier:price_1a;rare@tier:price_2;epic@tier:price_3;legendary@tier:price_4` |

**Format:** `{plan}@{type}:{priceId};...` where `priceId` is the Stripe Price ID (e.g., `price_1abc123`).

**Note:** Stripe uses Price IDs (not Product IDs like Polar.sh). You can find Price IDs in your Stripe Dashboard under Products.

**Webhook** endpoint is registered at `/api/v1/webhooks/stripe`.

**Important:** Only one provider can be active at a time. If Polar.sh is configured, Stripe will not be initialized. Remove Polar.sh environment variables to use Stripe instead.

### Multiple Providers

To support additional providers (Lemonsqueezy, etc.):

1. Add environment variables for that provider
2. Create provider implementation extending `PaymentProvider` interface
3. Register in `PaymentProviderFactory.create()`
4. Provider registers its webhook endpoint via `registerWebhookEndpoints()`
