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
  import { getBillingClient } from '../utils'
  import {
    Breadcrumb,
    Header,
    Loading,
    Scroller,
    formatDuration,
    themeStore
  } from '@hcengineering/ui'
  import { getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import { BillingStats } from '@hcengineering/billing-client'
  import billingPlugin from '@hcengineering/billing'
  import filesize from 'filesize'
  import LineChart from './Chart/LineChart.svelte'
  import StatsCard from './StatsCard.svelte'
  import drivePlugin from '@hcengineering/drive'
  import Category from './Category.svelte'
  import love from '@hcengineering/love'
  import ChartCard from './ChartCard.svelte'

  const testData = [
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) },
    { date: new Date(Date.now()), value: Math.round(Math.random() * 999) }
  ]

  const billingClient = getBillingClient()
  let billingStats: BillingStats

  async function loadBillingData (): Promise<void> {
    billingStats = await billingClient.getBillingStats(getCurrentWorkspaceUuid())
    console.log(billingStats)
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={billingPlugin.icon.Billing} label={billingPlugin.string.Billing} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    {#await loadBillingData()}
      <Loading />
    {:then _}
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content gapV-8">
          <Category icon={drivePlugin.icon.DriveApplication} label={drivePlugin.string.Drive}>
            <div class="row">
              <StatsCard label={billingPlugin.string.DriveSize} text={filesize(billingStats.datalakeStats.size, { spacer: ' ' })}/>
              <StatsCard label={billingPlugin.string.DriveCount} text={billingStats.datalakeStats.count.toString()}/>
            </div>
          </Category>
          <Category icon={love.icon.Love} label={love.string.Office}>
            <div class="row">
              <StatsCard label={billingPlugin.string.OfficeSessionsDuration} text={formatDuration(billingStats.liveKitStats.sessions.minutes * 60000, $themeStore.language)}/>
              <StatsCard label={billingPlugin.string.OfficeSessionsBandwidth} text={filesize(billingStats.liveKitStats.sessions.bandwidth, { spacer: ' ' })}/>
              <StatsCard label={billingPlugin.string.OfficeEgressDuration} text={formatDuration(billingStats.liveKitStats.egress.minutes * 60000, $themeStore.language)}/>
            </div>
            <div class="row">
              <ChartCard data={testData} />
            </div>
          </Category>
        </div>
      </Scroller>
    {/await}
  </div>
</div>

<style lang="scss">
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
</style>
