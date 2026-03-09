import Stripe from 'stripe'
import type { MeasureContext } from '@hcengineering/core'

import { createSubscriptionEventFromInvoiceEvent } from '../utils'

describe('Stripe utils - createSubscriptionEventFromInvoiceEvent', () => {
  const stripeApiKey = 'sk_test_123'

  let ctx: MeasureContext

  beforeEach(() => {
    ctx = {
      info: jest.fn(),
      error: jest.fn()
    } as any
  })

  test('returns null and logs when invoice has no subscription', async () => {
    const event: Stripe.Event = {
      id: 'evt_no_sub',
      type: 'invoice.payment_succeeded',
      created: Date.now() / 1000,
      data: {
        object: {
          id: 'in_123',
          status: 'paid',
          subscription: null
        } as any
      },
      livemode: false,
      object: 'event',
      pending_webhooks: 0,
      request: {
        id: null,
        idempotency_key: null
      },
      api_version: '2025-02-24.acacia'
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: '2025-02-24.acacia' })
    jest.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({} as any)

    const result = await createSubscriptionEventFromInvoiceEvent(ctx, stripe, event)

    expect(result).toBeNull()
    expect((ctx.info as jest.Mock).mock.calls[0][0]).toBe('Invoice event without subscription, skipping')
  })

  test('fetches subscription and returns subscription event for invoice with subscription', async () => {
    const event: Stripe.Event = {
      id: 'evt_1T8HuWLfExample',
      type: 'invoice.payment_succeeded',
      created: 1772878598,
      data: {
        object: {
          id: 'in_1T8HuSLfExample',
          status: 'paid',
          subscription: 'sub_1T8HuSLfExample'
        } as any
      },
      livemode: true,
      object: 'event',
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null
      },
      api_version: '2024-11-20.acacia'
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: '2025-02-24.acacia' })
    const retrieveMock = jest
      .spyOn(stripe.subscriptions, 'retrieve')
      .mockResolvedValue({ id: 'sub_1T8HuSLfExample', status: 'active' } as any)

    const result = await createSubscriptionEventFromInvoiceEvent(ctx, stripe, event)

    expect(retrieveMock).toHaveBeenCalledWith('sub_1T8HuSLfExample')
    expect(result).not.toBeNull()
    expect(result?.data.object).toEqual(expect.objectContaining({ id: 'sub_1T8HuSLfExample', status: 'active' }))
  })
})
