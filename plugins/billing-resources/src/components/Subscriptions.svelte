<!--
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
-->
<script lang="ts">
  import { type Subscription, SubscriptionType, getClient as getAccountClient } from '@hcengineering/account-client'
  import {
    type SubscribeRequest,
    type CheckoutStatus,
    getClient as getPaymentClient
  } from '@hcengineering/payment-client'
  import { type Ref, SortingOrder } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import {
    IconCheckmark,
    Label,
    Loading,
    Scroller,
    Button,
    getPlatformColorByName,
    themeStore,
    getLocation,
    navigate
  } from '@hcengineering/ui'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Tier } from '@hcengineering/billing'
  import { getMetadata } from '@hcengineering/platform'
  import { onMount, onDestroy } from 'svelte'

  import plugin from '../plugin'

  const client = getClient()

  const tiers = client.getModel().findAllSync(plugin.class.Tier, {}, { sort: { index: SortingOrder.Ascending } })
  const tierByPlan = tiers.reduce<Record<string, Tier>>((acc, tier) => {
    const { plan } = getTypeAndPlan(tier._id)
    acc[plan] = tier
    return acc
  }, {})

  let subscriptions: Subscription[] = []
  let currentTier = tiers[0]
  let currentSubscription: Subscription | undefined = undefined
  let loading = true
  let pollingCheckoutId: string | null = null
  let isPolling = false
  let pollAttempts = 0
  let pollTimer: number | undefined
  const MAX_POLL_ATTEMPTS = 120
  const POLL_INTERVAL = 2000

  async function handleUpgrade (tierId: Ref<Tier>): Promise<void> {
    const paymentUrl = getMetadata(presentation.metadata.PaymentUrl)
    const token = getMetadata(presentation.metadata.Token)
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid)
    if (workspace === undefined) {
      console.warn('Workspace metadata not available')
      return
    }

    try {
      const request: SubscribeRequest = getTypeAndPlan(tierId)
      const client = getPaymentClient(paymentUrl, token)
      const { checkoutUrl } = await client.createSubscription(workspace, request)
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('error while upgrading plan:', error)
    }
  }

  async function updateSubscriptions (): Promise<void> {
    const accountsUrl = getMetadata(login.metadata.AccountsUrl)
    const token = getMetadata(presentation.metadata.Token)

    try {
      loading = true
      const accountClient = getAccountClient(accountsUrl, token)
      subscriptions = await accountClient.getSubscriptions()
      currentSubscription = subscriptions.find((p) => p.type === 'tier' && p.status === 'active')
      const plan = currentSubscription?.plan
      currentTier = plan !== undefined ? tierByPlan[plan] : tiers[0]
    } catch (err) {
      console.error('error fetching current plan:', err)
    } finally {
      loading = false
    }
  }

  function formatSize (gb: number): { limit: number, unit: string } {
    return gb < 1000 ? { limit: gb, unit: 'GB' } : { limit: Math.floor(gb / 1000), unit: 'TB' }
  }

  async function pollCheckoutStatus (checkoutId: string): Promise<void> {
    const paymentUrl = getMetadata(presentation.metadata.PaymentUrl)
    const token = getMetadata(presentation.metadata.Token)

    if (isPolling || pollAttempts >= MAX_POLL_ATTEMPTS) {
      return
    }

    isPolling = true
    pollAttempts++

    try {
      const paymentClient = getPaymentClient(paymentUrl, token)
      const status: CheckoutStatus = await paymentClient.getCheckoutStatus(checkoutId)

      if (status.status === 'completed') {
        // Subscription is ready, refresh subscriptions and clean up URL
        console.info('Checkout completed, subscription ready:', status.subscriptionId)
        await updateSubscriptions()

        // Clean up the checkout_id from URL using navigate
        const loc = getLocation()
        const cleanedLoc = { ...loc, query: {} }
        navigate(cleanedLoc)

        pollingCheckoutId = null
        pollAttempts = 0
      } else {
        // Still pending, poll again after delay
        pollTimer = setTimeout(() => {
          void pollCheckoutStatus(checkoutId)
        }, POLL_INTERVAL)
      }
    } catch (err) {
      console.error('error polling checkout status:', err)
      // Retry on error (up to max attempts)
      if (pollAttempts < MAX_POLL_ATTEMPTS) {
        pollTimer = setTimeout(() => {
          void pollCheckoutStatus(checkoutId)
        }, POLL_INTERVAL)
      }
    } finally {
      isPolling = false
    }
  }

  function checkForCheckoutParam (): void {
    const loc = getLocation()
    const checkoutId = loc.query?.checkout_id as string | undefined
    const paymentStatus = loc.query?.payment as string | undefined

    if (checkoutId !== undefined && paymentStatus === 'success') {
      // Check if we already have a tier subscription that matches this checkout
      const matchingSubscription = subscriptions.find(
        (sub) => sub.type === 'tier' && sub.providerCheckoutId === checkoutId
      )

      if (matchingSubscription === undefined) {
        // No matching subscription found, start polling
        pollingCheckoutId = checkoutId
        pollAttempts = 0
        void pollCheckoutStatus(checkoutId)
      } else {
        // Subscription already exists and matches this checkout, just clean up the URL
        const cleanedLoc = { ...loc, query: {} }
        navigate(cleanedLoc)
      }
    }
  }

  $: isCheckoutPolling = pollingCheckoutId !== null

  function formatEndDate (endDate: number): string {
    const date = new Date(endDate)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function getTypeAndPlan (tierId: Ref<Tier>): { type: SubscriptionType, plan: string } {
    const parts = tierId.split(':')
    if (parts.length !== 3) {
      throw new Error(`Invalid tier id: ${tierId}`)
    }

    return {
      type: parts[1] as SubscriptionType,
      plan: parts[2].toLowerCase()
    }
  }

  onMount(() => {
    void (async () => {
      // First, load current subscriptions
      await updateSubscriptions()

      // Then check if we need to poll for a new subscription from checkout
      checkForCheckoutParam()
    })()
  })

  onDestroy(() => {
    // Clean up any pending polling timer when component is destroyed
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer)
    }
  })
</script>

{#if tiers.length > 0}
  <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
    <div class="hulyComponent-content gapV-8">
      <div class="flex-col flex-gap-4">
        <div class="section-title">
          <Label label={plugin.string.ActivePlan} />
        </div>
        <div class="current-tier-card w-full flex-gap-4">
          {#if loading || isCheckoutPolling}
            <Loading />
            {#if isCheckoutPolling}
              <div class="processing"><Label label={plugin.string.ProcessingPayment} /></div>
            {/if}
          {:else}
            <div class="current-tier-card-title">
              <div class="flex-row-center">
                <div class="fs-title"><Label label={currentTier.label} /></div>
                {#if currentSubscription?.status === 'active'}
                  <div class="status-badge ml-2 text-md"><Label label={plugin.string.Active} /></div>
                {/if}
              </div>
              {#if currentSubscription?.amount}
                <div class="flex-row-center items-end">
                  <span class="fs-title text-xl">
                    ${currentSubscription?.amount / 100}
                  </span>
                  <span class="ml-1 lower">
                    <Label label={plugin.string.Monthly} />
                  </span>
                </div>
              {/if}
            </div>

            {#if currentSubscription?.periodEnd}
              {@const date = formatEndDate(currentSubscription.periodEnd)}
              <div><Label label={plugin.string.SubscriptionEnds} params={{ date }} /></div>
            {/if}
          {/if}
        </div>
      </div>

      <div class="flex-col flex-gap-4">
        <div class="section-title"><Label label={plugin.string.AllPlans} /></div>
        <Scroller contentDirection="horizontal" buttons={false} showOverflowArrows shrink={false} noFade={false}>
          <div class="flex-row-top flex-gap-4 flex-no-shrink mb-3">
            {#each tiers as tier}
              {@const color = tier.color ? getPlatformColorByName(tier.color, $themeStore.dark) : undefined}
              {@const bgAttr = $themeStore.dark ? 'background' : 'background-color'}
              <div class="tier-card" style={color ? `${bgAttr}: ${color?.background};` : ''}>
                <div class="tier-card-content">
                  <div class="fs-title text-lg">
                    <Label label={tier.label} />
                  </div>
                  <div class="flex-row-center items-end">
                    <span class="fs-title text-xl">
                      ${tier.priceMonthly}
                    </span>
                    <span class="ml-1 lower">
                      <Label label={plugin.string.Monthly} />
                    </span>
                  </div>
                  <div class="mb-2 h-16">
                    <Label label={tier.description} />
                  </div>

                  <div class="tier-features">
                    <div class="feature-item">
                      <span class="feature-bullet"><IconCheckmark size="small" /></span>
                      <Label label={plugin.string.UnlimitedUsers} />
                    </div>
                    <div class="feature-item">
                      <span class="feature-bullet"><IconCheckmark size="small" /></span>
                      <Label label={plugin.string.UnlimitedObjects} />
                    </div>
                    <div class="feature-item">
                      <span class="feature-bullet"><IconCheckmark size="small" /></span>
                      <Label label={plugin.string.StorageLimit} params={{ ...formatSize(tier.storageLimitGB) }} />
                    </div>
                    <div class="feature-item">
                      <span class="feature-bullet"><IconCheckmark size="small" /></span>
                      <Label label={plugin.string.TrafficLimit} params={{ ...formatSize(tier.trafficLimitGB) }} />
                    </div>
                  </div>
                </div>
                <div class="tier-card-footer">
                  {#if currentTier._id !== tier._id}
                    <Button
                      label={plugin.string.ChangePlan}
                      size={'large'}
                      kind={'primary'}
                      disabled={loading || isCheckoutPolling}
                      width={'100%'}
                      on:click={() => {
                        void handleUpgrade(tier._id)
                      }}
                    />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </Scroller>
      </div>
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .section-title {
    font-weight: 500;
    font-size: 1rem;
  }

  .current-tier-card {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    width: 31rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    padding: var(--spacing-2);
  }

  .current-tier-card-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-badge {
    color: var(--theme-state-positive-color);
    background-color: var(--theme-state-positive-background-color);
    border-radius: var(--small-BorderRadius);
    padding: 0.125rem 0.5rem;
  }

  .tier-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-shrink: 0;
    width: 15rem;
    // max-height: 22rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    padding: var(--spacing-2);
    background-color: var(--theme-button-default);
  }

  .tier-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    min-height: 0;
  }

  .tier-features {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .feature-item {
    display: flex;
    gap: var(--spacing-0_5);
    font-size: 0.8125rem;
  }

  .feature-bullet {
    color: var(--theme-state-positive-color);
    font-weight: 600;
    flex-shrink: 0;
  }

  .tier-card-footer {
    display: flex;
    flex-direction: row-reverse;
    margin-top: var(--spacing-3);
    height: 2.25rem;
  }

  .processing {
    text-align: center;
  }
</style>
