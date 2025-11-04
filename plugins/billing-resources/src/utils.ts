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
import { get } from 'svelte/store'

import login from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import billing from '@hcengineering/billing'
import {
  getClient as getAccountClientRaw,
  type AccountClient,
  type SubscriptionData
} from '@hcengineering/account-client'
import { getClient as getBillingClientRaw, type BillingClient } from '@hcengineering/billing-client'
import { getClient as getPaymentClientRaw, type PaymentClient } from '@hcengineering/payment-client'
import {
  type UsageStatus,
  type WorkspaceInfoWithStatus,
  AccountRole,
  getCurrentAccount,
  hasAccountRole
} from '@hcengineering/core'
import { showPopup } from '@hcengineering/ui'
import { type Tier } from '@hcengineering/billing'

import { setSubscriptionState, updateLimitExceeded, subscriptionStore } from './stores/subscription'
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

export async function isLimitExceeded (): Promise<boolean> {
  try {
    const accountClient = getAccountClient()
    if (accountClient == null) return false

    const workspaceInfo = await accountClient.getWorkspaceInfo(false)
    const usageInfo = workspaceInfo?.usageInfo ?? null

    if (usageInfo === null) {
      return false
    }

    const subscription = await getCurrentSubscription(accountClient)
    if (subscription == null) {
      return true
    }

    const tier = await getTierByPlan(subscription.plan)
    if (tier == null) {
      return true
    }

    return checkUsageAgainstLimits(usageInfo, tier)
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return false
  }
}

export async function checkWorkspaceLimits (): Promise<void> {
  try {
    const accountClient = getAccountClient()
    if (accountClient == null) {
      updateLimitExceeded(false)
      return
    }

    const workspaceInfo = await accountClient.getWorkspaceInfo(false)
    const usageInfo = workspaceInfo?.usageInfo ?? null

    const subscription = await getCurrentSubscription(accountClient)
    const tier = subscription != null ? await getTierByPlan(subscription.plan) : null

    // Update subscription store
    setSubscriptionState(subscription, tier ?? undefined, workspaceInfo)

    // Check limits
    if (usageInfo === null || subscription == null || tier == null) {
      updateLimitExceeded(subscription == null)
      return
    }

    const exceeded = checkUsageAgainstLimits(usageInfo, tier)
    updateLimitExceeded(exceeded)
  } catch (error) {
    console.error('Error checking workspace limits:', error)
    updateLimitExceeded(false)
  }
}

async function getTierByPlan (plan: string): Promise<Tier | null> {
  try {
    const client = getClient()
    const tiers = client.getModel().findAllSync(billing.class.Tier, {})

    return (
      tiers.find((tier) => {
        const tierPlan = getTierPlan(tier._id)
        return tierPlan === plan
      }) ?? null
    )
  } catch (error) {
    console.error('Error fetching tier by plan:', error)
    return null
  }
}

function getTierPlan (tierId: string): string {
  const parts = tierId.split(':')
  return parts.length >= 3 ? parts[2].toLowerCase() : ''
}

export function calculateLimits (tier: Tier | undefined): { storageLimit: number, trafficLimit: number } {
  const DEFAULT_STORAGE_GB = 10
  const DEFAULT_TRAFFIC_GB = 10

  return {
    storageLimit: (tier?.storageLimitGB ?? DEFAULT_STORAGE_GB) * 1e9,
    trafficLimit: (tier?.trafficLimitGB ?? DEFAULT_TRAFFIC_GB) * 1e9
  }
}

export function checkUsageAgainstLimits (usageInfo: UsageStatus | undefined, tier: Tier | undefined): boolean {
  if (usageInfo == null) return false
  const storageUsedBytes = usageInfo.usage.storageBytes ?? 0
  const trafficUsedBytes = usageInfo.usage.livekitTrafficBytes ?? 0

  const { storageLimit, trafficLimit } = calculateLimits(tier)

  return storageUsedBytes > storageLimit || trafficUsedBytes > trafficLimit
}

export async function getCurrentSubscription (accountClient: AccountClient): Promise<SubscriptionData | undefined> {
  const subscriptions = await accountClient.getSubscriptions()
  return subscriptions.find((p) => p.type === 'tier')
}

export async function getWorkspaceInfo (): Promise<WorkspaceInfoWithStatus | undefined> {
  const accountClient = getAccountClient()
  if (accountClient == null) return undefined
  return await accountClient.getWorkspaceInfo(false)
}

export async function upgradePlan (): Promise<void> {
  try {
    const currentAccount = getCurrentAccount()
    if (currentAccount == null) {
      return
    }

    const workspaceInfo = get(subscriptionStore).workspaceInfo ?? (await getWorkspaceInfo())

    const isBillingAccount =
      workspaceInfo?.billingAccount != null
        ? workspaceInfo?.billingAccount === currentAccount.uuid
        : hasAccountRole(currentAccount, AccountRole.Owner)

    showPopup(SubscriptionsModal, { isReadOnly: !isBillingAccount })
  } catch (error) {
    console.error('Failed to show upgrade plan modal:', error)
  }
}
