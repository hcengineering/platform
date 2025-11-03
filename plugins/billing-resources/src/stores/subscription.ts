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

import { writable, derived, get } from 'svelte/store'
import { type SubscriptionData } from '@hcengineering/account-client'
import { type Tier } from '@hcengineering/billing'
import { type UsageStatus, type WorkspaceInfoWithStatus } from '@hcengineering/core'
import { checkUsageAgainstLimits } from '../utils'

export interface SubscriptionState {
  currentSubscription: SubscriptionData | undefined
  currentTier: Tier | undefined
  workspaceInfo: WorkspaceInfoWithStatus | undefined
  usageInfo: UsageStatus | undefined
  limitExceeded: boolean
}

const initialState: SubscriptionState = {
  currentSubscription: undefined,
  currentTier: undefined,
  workspaceInfo: undefined,
  usageInfo: undefined,
  limitExceeded: false
}

// Main subscription store
export const subscriptionStore = writable<SubscriptionState>(initialState)

export const limitExceeded = derived(subscriptionStore, ($store) => $store.limitExceeded)

export function updateLimitExceeded (limit: boolean): void {
  subscriptionStore.update((store) => ({
    ...store,
    limitExceeded: limit
  }))
}

export function setSubscriptionState (
  subscription: SubscriptionData | undefined,
  tier: Tier | undefined,
  workspaceInfo?: WorkspaceInfoWithStatus | undefined
): void {
  const usage = workspaceInfo?.usageInfo ?? get(subscriptionStore).usageInfo
  const workspace = workspaceInfo ?? get(subscriptionStore).workspaceInfo
  subscriptionStore.update((store) => ({
    ...store,
    currentSubscription: subscription,
    currentTier: tier,
    usageInfo: usage,
    workspaceInfo: workspace,
    limitExceeded: checkUsageAgainstLimits(usage, tier)
  }))
}

export function resetSubscriptionStore (): void {
  subscriptionStore.set(initialState)
}
