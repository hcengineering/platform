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
  import { type Subscription, getClient as getAccountClient } from '@hcengineering/account-client'
  // import { type SubscribeRequest, getClient as getPaymentClient } from '@hcengineering/payment-client'
  import { SortingOrder } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import {
    Label,
    Scroller,
    Button,
    getPlatformColorByName,
    themeStore,
    Loading,
    DatePresenter
  } from '@hcengineering/ui'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { getMetadata } from '@hcengineering/platform'
  import { onMount } from 'svelte'

  import plugin from '../plugin'

  const client = getClient()

  const tiers = client.getModel().findAllSync(plugin.class.Tier, {}, { sort: { index: SortingOrder.Ascending } })
  let subscriptions: Subscription[] = []
  let currentTier = tiers[0]
  let currentSubscription: Subscription | undefined = undefined
  let loading = true

  async function handleUpgrade (tierId: string): Promise<void> {
    // const paymentUrl = getMetadata(presentation.metadata.PaymentUrl)
    // const token = getMetadata(presentation.metadata.Token)
    // const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    // const request: SubscribeRequest = {
    //   type: 'tier',
    //   plan: tierId
    // }
    // try {
    // const client = getPaymentClient(paymentUrl, token)
    // const res = await client.createSubscription(workspace, request)
    // TODO redirect to checkoutUrl
    // } catch (error) {
    // console.error('error while upgrading plan:', error)
    // return
    // }
  }

  async function updateSubscriptions (): Promise<void> {
    const accountsUrl = getMetadata(login.metadata.AccountsUrl)
    const token = getMetadata(presentation.metadata.Token)

    try {
      loading = true
      const accountClient = getAccountClient(accountsUrl, token)
      subscriptions = await accountClient.getSubscriptions()
      currentSubscription = subscriptions.find((p) => p.type === 'tier')
      currentTier = tiers.find((p) => p._id === currentSubscription?.plan) ?? tiers[0]
    } catch (err) {
      console.error('error fetching current plan:', err)
    } finally {
      loading = false
    }
  }

  function formatEndDate (endDate: number): string {
    const date = new Date(endDate)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  onMount(() => {
    void updateSubscriptions()
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
          {#if loading}
            <Loading />
          {:else}
            <div class="fs-title"><Label label={currentTier.label} /></div>
            <div><Label label={currentTier.description} /></div>

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
          <div class="flex-row-top flex-gap-4 flex-no-shrink mb-4">
            {#each tiers as tier}
              {@const color = tier.color ? getPlatformColorByName(tier.color, $themeStore.dark) : undefined}
              <div class="tier-card" style={color ? `background-color: ${color?.background};` : ''}>
                <div class="tier-card-content">
                  <div class="fs-title text-lg">
                    <Label label={tier.label} />
                  </div>
                  <div class="flex-row-center items-end">
                    <span class="fs-title text-xl">
                      ${tier.priceMonthly}
                    </span>
                    <span class="ml-2 lower"><Label label={plugin.string.Monthly} /></span>
                  </div>
                  <div class="mb-2 h-12">
                    <Label label={tier.description} />
                  </div>

                  <div class="tier-features">
                    <div class="feature-item">
                      <span class="feature-bullet">•</span>
                      <Label label={plugin.string.UnlimitedUsers} />
                    </div>
                    <div class="feature-item">
                      <span class="feature-bullet">•</span>
                      <Label label={plugin.string.UnlimitedObjects} />
                    </div>
                    <div class="feature-item">
                      <span class="feature-bullet">•</span>
                      <Label label={plugin.string.StorageLimit} params={{ limit: tier.storageLimitGB }} />
                    </div>
                    <div class="feature-item">
                      <span class="feature-bullet">•</span>
                      <Label label={plugin.string.TrafficLimit} params={{ limit: tier.trafficLimitGB }} />
                    </div>
                  </div>
                </div>
                <div class="tier-card-footer">
                  {#if currentTier._id !== tier._id}
                    <Button
                      label={plugin.string.Upgrade}
                      size={'large'}
                      kind={'regular'}
                      disabled={loading}
                      on:click={() => {
                        handleUpgrade(tier._id)
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
    flex-direction: column;
    width: 100%;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    padding: var(--spacing-2);
  }

  .tier-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-shrink: 0;
    width: 15rem;
    height: 24rem;
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
    align-items: baseline;
    gap: var(--spacing-2);
    font-size: 0.8125rem;
  }

  .feature-bullet {
    color: var(--theme-content-color);
    font-weight: 600;
    flex-shrink: 0;
  }

  .tier-card-footer {
    display: flex;
    flex-direction: row-reverse;
    margin-top: var(--spacing-3);
  }
</style>
