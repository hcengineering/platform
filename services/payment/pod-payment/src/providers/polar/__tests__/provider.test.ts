import type { MeasureContext } from '@hcengineering/core'
import { AccountClient, SubscriptionType } from '@hcengineering/account-client'
import { PolarProvider } from '../provider'
import { getPlanKey } from '../../../utils'

const mockCreateCheckout = jest.fn()
jest.mock('../client', () => ({
  PolarClient: jest.fn().mockImplementation(() => ({
    createCheckout: mockCreateCheckout
  }))
}))
jest.mock('../../../utils', () => ({
  getPlanKey: jest.fn()
}))

describe('PolarProvider', () => {
  const accessToken = 'polar_token'
  const webhookSecret = 'whsec_123'
  const subscriptionPlans =
    'common@tier:prod_common;rare@tier:prod_rare;epic@tier:prod_epic;legendary@tier:prod_legendary'

  let accountClient: jest.Mocked<AccountClient>
  let ctx: jest.Mocked<MeasureContext>

  beforeEach(() => {
    accountClient = {
      getSubscriptions: jest.fn(),
      upsertSubscription: jest.fn()
    } as any

    jest.clearAllMocks()

    ctx = {
      info: jest.fn(),
      error: jest.fn(),
      with: jest.fn()
    } as any

    jest.clearAllMocks()
  })

  test('createSubscription removes trailing slash from frontUrl to avoid double slashes in URLs', async () => {
    const frontUrlWithTrailingSlash = 'https://huly.app/'
    const provider = new PolarProvider(
      accessToken,
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

    mockCreateCheckout.mockResolvedValue({
      id: 'checkout_123',
      url: 'https://polar.sh/checkout'
    } as any)

    await provider.createSubscription(ctx, request, workspaceUuid, workspaceUrl, accountUuid)

    const successUrl = mockCreateCheckout.mock.calls[0][1].successUrl
    const returnUrl = mockCreateCheckout.mock.calls[0][1].returnUrl

    expect(successUrl).toBe(
      'https://huly.app/workbench/tup/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_ID}'
    )
    expect(returnUrl).toBe('https://huly.app/workbench/tup/setting/setting/billing/subscriptions?payment=canceled')
    expect(successUrl).not.toContain('//workbench')
    expect(returnUrl).not.toContain('//workbench')
  })

  test('createSubscription strips multiple trailing slashes from frontUrl', async () => {
    const frontUrlWithMultipleSlashes = 'https://huly.app///'
    const provider = new PolarProvider(
      accessToken,
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

    mockCreateCheckout.mockResolvedValue({
      id: 'checkout_123',
      url: 'https://polar.sh/checkout'
    } as any)

    await provider.createSubscription(ctx, request, workspaceUuid, workspaceUrl, accountUuid)

    const successUrl = mockCreateCheckout.mock.calls[0][1].successUrl
    expect(successUrl).toBe(
      'https://huly.app/workbench/ws1/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_ID}'
    )
  })
})
