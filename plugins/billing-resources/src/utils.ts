import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getClient as getBillingClientRaw, type BillingClient } from '@hcengineering/billing-client'
import { getClient as getPaymentClientRaw, type PaymentClient } from '@hcengineering/payment-client'
import billingPlugin from '@hcengineering/billing'

export function getBillingClient (): BillingClient | null {
  const billingUrl = getMetadata(billingPlugin.metadata.BillingURL)
  if (billingUrl === undefined || billingUrl === '') {
    return null
  }
  const token = getMetadata(presentation.metadata.Token)
  return getBillingClientRaw(billingUrl, token)
}

export function getPaymentClient (): PaymentClient | null {
  const paymentUrl = getMetadata(presentation.metadata.PaymentUrl)
  if (paymentUrl === undefined || paymentUrl === '') {
    return null
  }

  const token = getMetadata(presentation.metadata.Token)
  return getPaymentClientRaw(paymentUrl, token)
}
