import type { Express, Request, Response } from 'express'
import type Stripe from 'stripe'
import type { MeasureContext } from '@hcengineering/core'
import { AccountClient, SubscriptionType, type Subscription } from '@hcengineering/account-client'
import { StripeProvider } from '../provider'
import { StripeClient } from '../client'
import { transformStripeSubscriptionToData } from '../utils'
import { getPlanKey } from '../../../utils'
import * as webhookModule from '../webhook'

jest.mock('../client')
jest.mock('../utils', () => ({
  transformStripeSubscriptionToData: jest.fn()
}))
jest.mock('../../../utils', () => ({
  getPlanKey: jest.fn()
}))

describe('StripeProvider', () => {
  const apiKey = 'sk_test_123'
  const webhookSecret = 'whsec_123'
  const subscriptionPlans =
    'common@tier:price_common;rare@tier:price_rare;epic@tier:price_epic;legendary@tier:price_legendary'
  const frontUrl = 'https://front.example.test'

  let accountClient: jest.Mocked<AccountClient>
  let stripeClient: jest.Mocked<StripeClient>
  let ctx: jest.Mocked<MeasureContext>

  beforeEach(() => {
    accountClient = {
      getSubscriptions: jest.fn(),
      upsertSubscription: jest.fn()
    } as any

    stripeClient = {
      createCheckout: jest.fn(),
      getSubscription: jest.fn(),
      getCheckout: jest.fn(),
      getActiveSubscriptions: jest.fn(),
      cancelSubscription: jest.fn(),
      uncancelSubscription: jest.fn(),
      updateSubscription: jest.fn()
    } as any
    ;(StripeClient as unknown as jest.Mock).mockImplementation(() => stripeClient)

    ctx = {
      info: jest.fn(),
      error: jest.fn(),
      with: jest.fn()
    } as any

    jest.clearAllMocks()
  })

  test('createSubscription removes trailing slash from frontUrl to avoid double slashes in URLs', async () => {
    const frontUrlWithTrailingSlash = 'https://huly.app/'
    const provider = new StripeProvider(
      apiKey,
      webhookSecret,
      subscriptionPlans,
      frontUrlWithTrailingSlash,
      accountClient
    )

    const request = {
      type: SubscriptionType.Tier,
      plan: 'common',
      customerEmail: 'user@example.test',
      customerName: 'User'
    } as any

    const workspaceUuid = 'workspace-uuid' as any
    const workspaceUrl = 'tup'
    const accountUuid = 'account-uuid'

    ;(getPlanKey as jest.Mock).mockReturnValue('common@tier')

    // eslint-disable-next-line @typescript-eslint/unbound-method
    stripeClient.createCheckout.mockResolvedValue({
      checkoutId: 'cs_test_123',
      url: 'https://stripe.test/checkout'
    })

    await provider.createSubscription(ctx, request, workspaceUuid, workspaceUrl, accountUuid)

    const successUrl = (stripeClient.createCheckout as jest.Mock).mock.calls[0][1].successUrl
    const cancelUrl = (stripeClient.createCheckout as jest.Mock).mock.calls[0][1].cancelUrl

    expect(successUrl).toBe(
      'https://huly.app/workbench/tup/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_SESSION_ID}'
    )
    expect(cancelUrl).toBe('https://huly.app/workbench/tup/setting/setting/billing/subscriptions?payment=canceled')
    expect(successUrl).not.toContain('//workbench')
    expect(cancelUrl).not.toContain('//workbench')
  })

  test('createSubscription strips multiple trailing slashes from frontUrl', async () => {
    const frontUrlWithMultipleSlashes = 'https://huly.app///'
    const provider = new StripeProvider(
      apiKey,
      webhookSecret,
      subscriptionPlans,
      frontUrlWithMultipleSlashes,
      accountClient
    )

    const request = {
      type: SubscriptionType.Tier,
      plan: 'common',
      customerEmail: 'user@example.test',
      customerName: 'User'
    } as any

    const workspaceUuid = 'workspace-uuid' as any
    const workspaceUrl = 'ws1'
    const accountUuid = 'account-uuid'

    ;(getPlanKey as jest.Mock).mockReturnValue('common@tier')

    // eslint-disable-next-line @typescript-eslint/unbound-method
    stripeClient.createCheckout.mockResolvedValue({
      checkoutId: 'cs_test_123',
      url: 'https://stripe.test/checkout'
    })

    await provider.createSubscription(ctx, request, workspaceUuid, workspaceUrl, accountUuid)

    const successUrl = (stripeClient.createCheckout as jest.Mock).mock.calls[0][1].successUrl
    expect(successUrl).toBe(
      'https://huly.app/workbench/ws1/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_SESSION_ID}'
    )
  })

  test('createSubscription creates checkout with correct parameters', async () => {
    const provider = new StripeProvider(apiKey, webhookSecret, subscriptionPlans, frontUrl, accountClient)

    const request = {
      type: SubscriptionType.Tier,
      plan: 'common',
      customerEmail: 'user@example.test',
      customerName: 'User'
    } as any

    const workspaceUuid = 'workspace-uuid' as any
    const workspaceUrl = 'workspace-url'
    const accountUuid = 'account-uuid'

    ;(getPlanKey as jest.Mock).mockReturnValue('common@tier')

    // eslint-disable-next-line @typescript-eslint/unbound-method
    stripeClient.createCheckout.mockResolvedValue({
      checkoutId: 'cs_test_123',
      url: 'https://stripe.test/checkout'
    })

    const result = await provider.createSubscription(ctx, request, workspaceUuid, workspaceUrl, accountUuid)

    expect(getPlanKey).toHaveBeenCalledWith(request.type, request.plan)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(stripeClient.createCheckout).toHaveBeenCalledWith(ctx, {
      priceId: 'price_common',
      successUrl: `${frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=canceled`,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      metadata: {
        workspaceUuid,
        subscriptionType: request.type,
        subscriptionPlan: request.plan,
        accountUuid
      }
    })

    expect(result).toEqual({
      checkoutId: 'cs_test_123',
      checkoutUrl: 'https://stripe.test/checkout'
    })
  })

  test('getSubscriptionByCheckout returns null when checkout is not complete', async () => {
    const provider = new StripeProvider(apiKey, webhookSecret, subscriptionPlans, frontUrl, accountClient)

    stripeClient.getCheckout.mockResolvedValue({
      id: 'cs_test',
      status: 'open'
    } as any)

    const result = await provider.getSubscriptionByCheckout(ctx, 'cs_test')

    expect(result).toBeNull()
  })

  test('reconcileActiveSubscriptions upserts changed and stale subscriptions', async () => {
    const provider = new StripeProvider(apiKey, webhookSecret, subscriptionPlans, frontUrl, accountClient)

    const stripeSubActive: Stripe.Subscription = {
      id: 'sub_1',
      status: 'active'
    } as any

    const ourSub: Subscription = {
      providerSubscriptionId: 'sub_1',
      providerData: {
        modifiedAt: 1
      }
    } as any

    stripeClient.getActiveSubscriptions.mockResolvedValue([stripeSubActive])
    accountClient.getSubscriptions.mockResolvedValue([ourSub])
    ;(transformStripeSubscriptionToData as jest.Mock).mockImplementation((sub: Stripe.Subscription) => ({
      id: sub.id,
      status: sub.status,
      providerData: {
        modifiedAt: 2
      }
    }))

    await provider.reconcileActiveSubscriptions(ctx, 'https://accounts.test', 'token')

    expect(accountClient.upsertSubscription).toHaveBeenCalledWith({
      id: 'sub_1',
      status: 'active',
      providerData: {
        modifiedAt: 2
      }
    })
  })

  test('updateSubscriptionPlan creates checkout for free subscription with accountUuid in metadata', async () => {
    const provider = new StripeProvider(apiKey, webhookSecret, subscriptionPlans, frontUrl, accountClient)

    const subscriptionId = 'sub_free'
    const newPlan = 'epic'
    const workspaceUrl = 'workspace-url'
    const accountUuid = 'acc-upgrade-123'

    const currentSub: Stripe.Subscription = {
      id: subscriptionId,
      metadata: { workspaceUuid: 'ws-1' },
      items: {
        data: [
          {
            price: {
              unit_amount: 0
            }
          }
        ]
      }
    } as any

    stripeClient.getSubscription.mockResolvedValue(currentSub)
    ;(getPlanKey as jest.Mock).mockReturnValue('epic@tier')

    // eslint-disable-next-line @typescript-eslint/unbound-method
    stripeClient.createCheckout.mockResolvedValue({
      checkoutId: 'cs_test_new',
      url: 'https://stripe.test/checkout/new'
    })

    const result = await provider.updateSubscriptionPlan(ctx, subscriptionId, newPlan, workspaceUrl, accountUuid)

    expect(result).toEqual({
      checkoutId: 'cs_test_new',
      checkoutUrl: 'https://stripe.test/checkout/new'
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(stripeClient.createCheckout).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({
        priceId: 'price_epic',
        subscriptionId,
        metadata: expect.objectContaining({
          accountUuid,
          subscriptionPlan: newPlan
        })
      })
    )
  })

  test('registerWebhookEndpoints wires up express route with correct arguments', () => {
    const provider = new StripeProvider(apiKey, webhookSecret, subscriptionPlans, frontUrl, accountClient)

    const appPost = jest.fn()
    const app = {
      post: appPost
    } as any as Express

    const accountsUrl = 'https://accounts.test'
    const serviceToken = 'service-token'

    provider.registerWebhookEndpoints(app, ctx, accountsUrl, serviceToken)

    expect(appPost).toHaveBeenCalledWith('/api/v1/webhooks/stripe', expect.any(Function))

    const handler = appPost.mock.calls[0][1] as (req: Request, res: Response) => void

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const req = {} as Request
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const res = {} as Response

    const handleStripeWebhookSpy = jest.spyOn(webhookModule, 'handleStripeWebhook').mockResolvedValue(undefined as any)

    handler(req, res)

    expect(handleStripeWebhookSpy).toHaveBeenCalledWith(ctx, accountsUrl, serviceToken, webhookSecret, apiKey, req, res)
  })
})
