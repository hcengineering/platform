import Stripe from 'stripe'
import type { Request, Response } from 'express'
import { handleStripeWebhook } from '../webhook'
import { getAccountClient } from '../../../utils'
import { createSubscriptionEventFromInvoiceEvent, transformStripeSubscriptionToData } from '../utils'

jest.mock('stripe')
jest.mock('../../../utils', () => ({
  getAccountClient: jest.fn()
}))
jest.mock('../utils', () => ({
  transformStripeSubscriptionToData: jest.fn(),
  createSubscriptionEventFromInvoiceEvent: jest.fn()
}))

describe('handleStripeWebhook', () => {
  const accountsUrl = 'https://accounts.example.test'
  const serviceToken = 'service-token'
  const webhookSecret = 'whsec_123'
  const stripeApiKey = 'sk_test_123'

  let ctx: any
  let req: Partial<Request>
  let res: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock & ((code: number) => Response)

  beforeEach(() => {
    ctx = {
      info: jest.fn(),
      error: jest.fn()
    }

    jsonMock = jest.fn()
    statusMock = jest.fn().mockImplementation(() => {
      return {
        json: jsonMock
      } as any
    })

    req = {
      body: Buffer.from('payload'),
      headers: {
        'stripe-signature': 'sig_header'
      }
    }

    res = {
      status: statusMock as unknown as any
    }

    jest.clearAllMocks()
  })

  test('returns 400 when body is not a Buffer or empty', async () => {
    req.body = undefined as any

    await handleStripeWebhook(
      ctx,
      accountsUrl,
      serviceToken,
      webhookSecret,
      stripeApiKey,
      req as Request,
      res as Response
    )

    expect(ctx.error).toHaveBeenCalledWith('Invalid webhook body')
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid body' })
  })

  test('returns 400 when signature header is missing', async () => {
    req.headers = {}

    await handleStripeWebhook(
      ctx,
      accountsUrl,
      serviceToken,
      webhookSecret,
      stripeApiKey,
      req as Request,
      res as Response
    )

    expect(ctx.error).toHaveBeenCalledWith('Missing Stripe signature header')
    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing signature' })
  })

  test('returns 403 when Stripe signature verification fails', async () => {
    const constructEventMock = jest.fn(() => {
      throw new Error('bad signature')
    })

    ;(Stripe as unknown as jest.Mock).mockImplementation(() => ({
      webhooks: {
        constructEvent: constructEventMock
      }
    }))

    await handleStripeWebhook(
      ctx,
      accountsUrl,
      serviceToken,
      webhookSecret,
      stripeApiKey,
      req as Request,
      res as Response
    )

    expect(constructEventMock).toHaveBeenCalled()
    expect(ctx.error).toHaveBeenCalledWith('Invalid Stripe webhook signature', expect.any(Object))
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid signature' })
  })

  test('handles subscription-related events and returns 200', async () => {
    const event: Stripe.Event = {
      id: 'evt_123',
      type: 'customer.subscription.updated',
      created: Date.now() / 1000,
      data: {
        object: {
          id: 'sub_123',
          status: 'active'
        } as any
      },
      livemode: false,
      object: 'event',
      pending_webhooks: 0,
      request: {
        id: 'req_123',
        idempotency_key: null
      },
      api_version: '2025-02-24.acacia'
    }

    const constructEventMock = jest.fn(() => event)

    ;(Stripe as unknown as jest.Mock).mockImplementation(() => ({
      webhooks: {
        constructEvent: constructEventMock
      }
    }))

    const accountClient = {
      upsertSubscription: jest.fn()
    }

    ;(getAccountClient as jest.Mock).mockReturnValue(accountClient)
    ;(transformStripeSubscriptionToData as jest.Mock).mockReturnValue({
      id: 'sub_123',
      status: 'active',
      providerData: {}
    })

    await handleStripeWebhook(
      ctx,
      accountsUrl,
      serviceToken,
      webhookSecret,
      stripeApiKey,
      req as Request,
      res as Response
    )

    expect(constructEventMock).toHaveBeenCalledWith(req.body, 'sig_header', webhookSecret)

    expect(accountClient.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub_123', status: 'active' })
    )

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({ received: true })
  })

  test('fetches subscription for invoice events and upserts it (via helper)', async () => {
    const event: Stripe.Event = {
      id: 'evt_456',
      type: 'invoice.payment_succeeded',
      created: Date.now() / 1000,
      data: {
        object: {
          id: 'in_123',
          status: 'paid',
          subscription: 'sub_456'
        } as any
      },
      livemode: false,
      object: 'event',
      pending_webhooks: 0,
      request: {
        id: 'req_456',
        idempotency_key: null
      },
      api_version: '2025-02-24.acacia'
    }

    const constructEventMock = jest.fn(() => event)

    ;(Stripe as unknown as jest.Mock).mockImplementation(() => ({
      webhooks: {
        constructEvent: constructEventMock
      }
    }))

    const accountClient = {
      upsertSubscription: jest.fn()
    }

    ;(getAccountClient as jest.Mock).mockReturnValue(accountClient)
    ;(transformStripeSubscriptionToData as jest.Mock).mockReturnValue({
      id: 'sub_456',
      status: 'active',
      providerData: {}
    })

    const subscriptionEvent: Stripe.Event = {
      ...event,
      data: {
        ...event.data,
        object: {
          id: 'sub_456',
          status: 'active'
        } as any
      }
    }

    ;(createSubscriptionEventFromInvoiceEvent as jest.Mock).mockResolvedValue(subscriptionEvent)

    await handleStripeWebhook(
      ctx,
      accountsUrl,
      serviceToken,
      webhookSecret,
      stripeApiKey,
      req as Request,
      res as Response
    )

    expect(constructEventMock).toHaveBeenCalledWith(req.body, 'sig_header', webhookSecret)
    expect(createSubscriptionEventFromInvoiceEvent).toHaveBeenCalledWith(ctx, expect.anything(), event)
    expect(accountClient.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub_456', status: 'active' })
    )

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({ received: true })
  })

  test('logs and returns 200 for unhandled event types', async () => {
    const event: Stripe.Event = {
      id: 'evt_456',
      type: 'charge.succeeded',
      created: Date.now() / 1000,
      data: {
        object: {} as any
      },
      livemode: false,
      object: 'event',
      pending_webhooks: 0,
      request: {
        id: 'req_456',
        idempotency_key: null
      },
      api_version: '2025-02-24.acacia'
    }

    const constructEventMock = jest.fn(() => event)

    ;(Stripe as unknown as jest.Mock).mockImplementation(() => ({
      webhooks: {
        constructEvent: constructEventMock
      }
    }))

    await handleStripeWebhook(
      ctx,
      accountsUrl,
      serviceToken,
      webhookSecret,
      stripeApiKey,
      req as Request,
      res as Response
    )

    expect(ctx.info).toHaveBeenCalledWith('Unhandled Stripe webhook event type', {
      type: 'charge.succeeded'
    })

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({ received: true })
  })
})
