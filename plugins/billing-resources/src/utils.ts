import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getClient as getBillingClientRaw, type BillingClient } from '@hcengineering/billing-client'
import billingPlugin from '@hcengineering/billing'

export function getBillingClient (): BillingClient | null {
  const billingUrl = getMetadata(billingPlugin.metadata.BillingURL)
  if (billingUrl === undefined || billingUrl === '') {
    return null
  }
  const token = getMetadata(presentation.metadata.Token)
  return getBillingClientRaw(billingUrl, token)
}
