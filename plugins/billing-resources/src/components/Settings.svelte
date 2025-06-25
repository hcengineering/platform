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
  import { Breadcrumb, Header, Loading, Scroller, formatDuration, themeStore } from '@hcengineering/ui'
  import { getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import billingPlugin from '@hcengineering/billing'
  import filesize from 'filesize'
  import StatsCard from './StatsCard.svelte'
  import drivePlugin from '@hcengineering/drive'
  import Category from './Category.svelte'
  import love from '@hcengineering/love'
  import ChartCard from './ChartCard.svelte'

  const billingClient = getBillingClient()

  let totalDatalakeSize = 0
  let totalDatalakeCount = 0
  let totalSessionsDuration = 0
  let totalSessionsBandwidth = 0
  let totalEgressDuration = 0
  let sessionsDurationByDay: { date: number, value: number }[] = []
  let sessionsBandwidthByDay: { date: number, value: number }[] = []
  let egressDurationByDay: { date: number, value: number }[] = []

  async function loadBillingData (): Promise<void> {
    if (billingClient == null) return
    const billingStats = await billingClient.getBillingStats(getCurrentWorkspaceUuid())
    totalDatalakeSize = billingStats.datalakeStats.size
    totalDatalakeCount = billingStats.datalakeStats.count
    totalSessionsDuration = billingStats.liveKitStats.sessions.reduce((sum, s) => sum + s.minutes, 0) * 60000
    totalSessionsBandwidth = billingStats.liveKitStats.sessions.reduce((sum, s) => sum + s.bandwidth, 0)
    totalEgressDuration = billingStats.liveKitStats.egress.reduce((sum, e) => sum + e.minutes, 0) * 60000

    sessionsDurationByDay = billingStats.liveKitStats.sessions.map((s) => {
      const date = new Date(Date.parse(s.day))
      date.setHours(0, 0, 0, 0)
      return { date: date.getTime(), value: s.minutes * 60000 }
    })

    sessionsBandwidthByDay = billingStats.liveKitStats.sessions.map((s) => {
      const date = new Date(Date.parse(s.day))
      date.setHours(0, 0, 0, 0)
      return { date: date.getTime(), value: s.bandwidth }
    })

    egressDurationByDay = billingStats.liveKitStats.egress.map((s) => {
      const date = new Date(Date.parse(s.day))
      date.setHours(0, 0, 0, 0)
      return { date: date.getTime(), value: s.minutes * 60000 }
    })
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
              <StatsCard label={billingPlugin.string.DriveSize} text={filesize(totalDatalakeSize, { spacer: ' ' })} />
              <StatsCard label={billingPlugin.string.DriveCount} text={totalDatalakeCount.toString()} />
            </div>
          </Category>
          <Category icon={love.icon.Love} label={love.string.Office}>
            <div class="row">
              <StatsCard
                label={billingPlugin.string.OfficeSessionsDuration}
                text={formatDuration(totalSessionsDuration, $themeStore.language)}
              />
              <StatsCard
                label={billingPlugin.string.OfficeSessionsBandwidth}
                text={filesize(totalSessionsBandwidth, { spacer: ' ' })}
              />
              <StatsCard
                label={billingPlugin.string.OfficeEgressDuration}
                text={formatDuration(totalEgressDuration, $themeStore.language)}
              />
            </div>
            <div class="row">
              <ChartCard
                label={billingPlugin.string.OfficeSessionsDuration}
                valueFormatter={(v) => formatDuration(v, $themeStore.language)}
                data={sessionsDurationByDay}
              />
            </div>
            <div class="row">
              <ChartCard
                label={billingPlugin.string.OfficeSessionsBandwidth}
                valueFormatter={(v) => Promise.resolve(filesize(v, { spacer: ' ' }))}
                data={sessionsBandwidthByDay}
              />
            </div>
            <div class="row">
              <ChartCard
                label={billingPlugin.string.OfficeEgressDuration}
                valueFormatter={(v) => formatDuration(v, $themeStore.language)}
                data={egressDurationByDay}
              />
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
