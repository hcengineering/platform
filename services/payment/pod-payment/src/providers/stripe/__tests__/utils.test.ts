import Stripe from 'stripe'
import type { MeasureContext } from '@hcengineering/core'

import { createSubscriptionEventFromInvoiceEvent, transformStripeSubscriptionToData } from '../utils'

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

describe('Stripe utils - transformStripeSubscriptionToData', () => {
  test('returns SubscriptionData when all required metadata is present', () => {
    const subscription: Stripe.Subscription = {
      id: 'sub_123',
      status: 'active',
      metadata: {
        workspaceUuid: 'ws-123',
        subscriptionType: 'common',
        subscriptionPlan: 'pro'
      },
      customer: {
        id: 'cus_123',
        deleted: false,
        metadata: {}
      } as any,
      items: {
        data: [
          {
            price: {
              unit_amount: 9999
            } as any
          } as any
        ]
      } as any,
      current_period_start: 1700000000,
      current_period_end: 1700003600,
      trial_end: null,
      canceled_at: null,
      created: 1700000000,
      cancel_at_period_end: false,
      cancellation_details: {
        comment: null,
        feedback: null,
        reason: null
      },
      latest_invoice: 'in_123' as any
    } as any

    const result = transformStripeSubscriptionToData(subscription)

    expect(result).not.toBeNull()
    expect(result).toEqual(
      expect.objectContaining({
        id: 'stripe_sub_123',
        workspaceUuid: 'ws-123',
        accountUuid: 'cus_123',
        providerSubscriptionId: 'sub_123',
        type: 'common',
        plan: 'pro',
        status: 'active',
        amount: 9999
      })
    )
  })

  test('returns null and logs when required metadata is missing', () => {
    const subscription: Stripe.Subscription = {
      id: 'sub_missing',
      status: 'active',
      metadata: {},
      customer: 'cus_999' as any,
      items: {
        data: []
      } as any,
      current_period_start: 1700000000,
      current_period_end: 1700003600,
      trial_end: null,
      canceled_at: null,
      created: 1700000000,
      cancel_at_period_end: false,
      cancellation_details: {
        comment: null,
        feedback: null,
        reason: null
      },
      latest_invoice: 'in_999' as any
    } as any

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const result = transformStripeSubscriptionToData(subscription)

    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      'Stripe subscription missing required metadata, ignoring update',
      expect.objectContaining({
        subscriptionId: 'sub_missing',
        missingFields: expect.arrayContaining(['accountUuid', 'workspaceUuid', 'subscriptionType', 'subscriptionPlan'])
      })
    )

    warnSpy.mockRestore()
  })

  test('returns null when subscription status maps to an irrelevant state', () => {
    const subscription: Stripe.Subscription = {
      id: 'sub_incomplete',
      status: 'incomplete',
      metadata: {
        workspaceUuid: 'ws-123',
        subscriptionType: 'common',
        subscriptionPlan: 'pro'
      },
      customer: 'cus_123' as any,
      items: {
        data: []
      } as any,
      current_period_start: 1700000000,
      current_period_end: 1700003600,
      trial_end: null,
      canceled_at: null,
      created: 1700000000,
      cancel_at_period_end: false,
      cancellation_details: {
        comment: null,
        feedback: null,
        reason: null
      },
      latest_invoice: 'in_123' as any
    } as any

    const result = transformStripeSubscriptionToData(subscription)

    expect(result).toBeNull()
  })
})
