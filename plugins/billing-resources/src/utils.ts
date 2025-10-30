//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import login from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import presentation, { MessageBox } from '@hcengineering/presentation'
import billing from '@hcengineering/billing'
import { getClient as getAccountClientRaw, type AccountClient } from '@hcengineering/account-client'
import { getClient as getBillingClientRaw, type BillingClient } from '@hcengineering/billing-client'
import { getClient as getPaymentClientRaw, type PaymentClient } from '@hcengineering/payment-client'
import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
import { showPopup } from '@hcengineering/ui'
import SubscriptionsModal from './components/SubscriptionsModal.svelte'

export function getAccountClient (): AccountClient | null {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl) ?? ''
  const token = getMetadata(presentation.metadata.Token) ?? ''
  if (accountsUrl === '' || token === '') {
    return null
  }

  return getAccountClientRaw(accountsUrl, token)
}

export function getBillingClient (): BillingClient | null {
  const billingUrl = getMetadata(billing.metadata.BillingURL) ?? ''
  const token = getMetadata(presentation.metadata.Token) ?? ''
  if (billingUrl === '' || token === '') {
    return null
  }
  return getBillingClientRaw(billingUrl, token)
}

export function getPaymentClient (): PaymentClient | null {
  const paymentUrl = getMetadata(presentation.metadata.PaymentUrl) ?? ''
  const token = getMetadata(presentation.metadata.Token) ?? ''
  if (paymentUrl === '' || token === '') {
    return null
  }

  return getPaymentClientRaw(paymentUrl, token)
}

export function upgradePlan (): void {
  const currentAccount = getCurrentAccount()
  if (currentAccount == null) {
    return
  }

  const isOwnerOrMaintainer = hasAccountRole(currentAccount, AccountRole.Owner) ||
                              hasAccountRole(currentAccount, AccountRole.Maintainer)

  if (isOwnerOrMaintainer) {
    // Show subscriptions modal for owner/maintainer
    showPopup(SubscriptionsModal, {})
  } else {
    // Show modal with suggestion to ask owner or maintainer
    showPopup(MessageBox, {
      label: billing.string.UpgradePlan,
      message: billing.string.LimitReached,
      params: {}
    })
  }
}
