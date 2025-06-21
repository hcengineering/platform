import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getClient as getBillingClientRaw, type BillingClient } from '@hcengineering/billing-client'

export function getBillingClient (): BillingClient {
  const billingUrl = 'http://huly.local:4050'
  const token = getMetadata(presentation.metadata.Token)
  return getBillingClientRaw(billingUrl, token)
}
