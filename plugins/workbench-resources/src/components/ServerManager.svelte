<script lang="ts">
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { Metrics, systemAccountEmail } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import {
    Button,
    CheckBox,
    IconArrowRight,
    Loading,
    Panel,
    TabItem,
    TabList,
    fetchMetadataLocalStorage,
    ticker
  } from '@hcengineering/ui'
  import EditBox from '@hcengineering/ui/src/components/EditBox.svelte'
  import Expandable from '@hcengineering/ui/src/components/Expandable.svelte'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import { workspacesStore } from '../utils'
  import MetricsInfo from './statistics/MetricsInfo.svelte'

  const _endpoint: string = fetchMetadataLocalStorage(login.metadata.LoginEndpoint) ?? ''
  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  let endpoint = _endpoint.replace(/^ws/g, 'http')
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.substring(0, endpoint.length - 1)
  }

  let data: any
  let dataFront: any
  let admin = false
  onDestroy(
    ticker.subscribe(() => {
      void fetch(endpoint + `/api/v1/statistics?token=${token}`, {})
        .then(async (json) => {
          data = await json.json()
          admin = data?.admin ?? false
        })
        .catch((err) => {
          console.error(err)
        })

      void fetch(`/api/v1/statistics?token=${token}`, {})
        .then(async (json) => {
          dataFront = await json.json()
        })
        .catch((err) => {
          console.error(err)
        })
    })
  )
  const tabs: TabItem[] = [
    {
      id: 'general',
      labelIntl: getEmbeddedLabel('General')
    },
    {
      id: 'statistics',
      labelIntl: getEmbeddedLabel('Server')
    },
    {
      id: 'statistics-front',
      labelIntl: getEmbeddedLabel('Front')
    },
    {
      id: 'users',
      labelIntl: getEmbeddedLabel('Users')
    }
  ]
  let selectedTab: string = tabs[0].id

  interface StatisticsElement {
    find: number
    tx: number
  }

  $: activeSessions =
    (data?.statistics?.activeSessions as Record<
    string,
    Array<{
      userId: string
      data?: Record<string, any>
      total: StatisticsElement
      mins5: StatisticsElement
      current: StatisticsElement
    }>
    >) ?? {}

  const employeeQuery = createQuery()

  let employees = new Map<string, PersonAccount>()

  employeeQuery.query(contact.class.PersonAccount, {}, (res) => {
    const emp = new Map<string, PersonAccount>()
    for (const r of res) {
      emp.set(r.email, r)
    }
    employees = emp
  })
  let warningTimeout = 15

  $: metricsData = data?.metrics as Metrics | undefined

  $: metricsDataFront = dataFront?.metrics as Metrics | undefined

  $: totalStats = Array.from(Object.entries(activeSessions).values()).reduce(
    (cur, it) => {
      const totalFind = it[1].reduce((it, itm) => itm.current.find + it, 0)
      const totalTx = it[1].reduce((it, itm) => itm.current.tx + it, 0)
      return {
        find: cur.find + totalFind,
        tx: cur.tx + totalTx
      }
    },
    { find: 0, tx: 0 }
  )

  let realUsers: boolean
</script>

<Panel on:close isFullSize useMaxWidth={true}>
  <svelte:fragment slot="header">
    {#if data}
      <div class="flex-col">
        <span>
          Mem: {data.statistics.memoryUsed} / {data.statistics.memoryTotal} CPU: {data.statistics.cpuUsage}
        </span>
        <span>
          TotalFind: {totalStats.find} / Total Tx: {totalStats.tx}
        </span>
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="title">
    <span class="p-3"> Server manager </span>
    <TabList
      items={tabs}
      bind:selected={selectedTab}
      kind={'separated'}
      on:select={(result) => {
        selectedTab = result.detail.id
      }}
    />
  </svelte:fragment>
  {#if data}
    {#if selectedTab === 'general'}
      {#if admin}
        <div class="flex flex-col">
          <div class="flex-row-center p-1">
            <div class="p-3">1.</div>
            <Button
              icon={IconArrowRight}
              label={getEmbeddedLabel('Set maintenance warning')}
              on:click={() => {
                void fetch(endpoint + `/api/v1/manage?token=${token}&operation=maintenance&timeout=${warningTimeout}`, {
                  method: 'PUT'
                })
              }}
            />
            <div class="flex-col p-1">
              <div class="flex-row-center p-1">
                <EditBox kind={'underline'} format={'number'} bind:value={warningTimeout} /> min
              </div>
            </div>
          </div>

          <div class="flex-row-center p-1">
            <div class="p-3">2.</div>
            <Button
              icon={IconArrowRight}
              label={getEmbeddedLabel('Reboot server')}
              on:click={() => {
                void fetch(endpoint + `/api/v1/manage?token=${token}&operation=reboot`, {
                  method: 'PUT'
                })
              }}
            />
          </div>
        </div>
      {/if}
    {:else if selectedTab === 'users'}
      <div class="ml-4 p-1 flex-row-center">
        <CheckBox bind:checked={realUsers} />
        <div class="ml-1">Show only users</div>
      </div>
      <div class="flex-column p-3 h-full" style:overflow="auto">
        {#each Object.entries(activeSessions) as act}
          {@const wsInstance = $workspacesStore.find((it) => it.workspaceId === act[0])}
          {@const totalFind = act[1].reduce((it, itm) => itm.current.find + it, 0)}
          {@const totalTx = act[1].reduce((it, itm) => itm.current.tx + it, 0)}
          {@const employeeGroups = Array.from(new Set(act[1].map((it) => it.userId))).filter(
            (it) => systemAccountEmail !== it || !realUsers
          )}
          {@const realGroup = Array.from(new Set(act[1].map((it) => it.userId))).filter(
            (it) => systemAccountEmail !== it
          )}
          {#if employeeGroups.length > 0}
            <span class="flex-col">
              <Expandable contentColor expanded={false} expandable={true} bordered>
                <svelte:fragment slot="title">
                  <div class="fs-title" class:greyed={realGroup.length === 0}>
                    Workspace: {wsInstance?.workspaceName ?? act[0]}: {employeeGroups.length} current 5 mins => {totalFind}/{totalTx}
                  </div>
                </svelte:fragment>
                <div class="flex-col">
                  {#each employeeGroups as employeeId}
                    {@const employee = employees.get(employeeId)}
                    {@const connections = act[1].filter((it) => it.userId === employeeId)}

                    {@const find = connections.reduce((it, itm) => itm.current.find + it, 0)}
                    {@const txes = connections.reduce((it, itm) => itm.current.tx + it, 0)}
                    <div class="p-1 flex-col ml-4">
                      <Expandable>
                        <svelte:fragment slot="title">
                          <div class="flex-row-center p-1">
                            {#if employee}
                              <ObjectPresenter
                                _class={contact.mixin.Employee}
                                objectId={employee.person}
                                props={{ shouldShowAvatar: true, disabled: true }}
                              />
                            {:else}
                              {employeeId}
                            {/if}
                            : {connections.length}
                            <div class="ml-4">
                              <div class="ml-1">{find}/{txes}</div>
                            </div>
                          </div>
                        </svelte:fragment>
                        {#each connections as user, i}
                          <div class="flex-row-center ml-10">
                            #{i}
                            {user.userId}
                            <div class="p-1">
                              Total: {user.total.find}/{user.total.tx}
                            </div>
                            <div class="p-1">
                              Previous 5 mins: {user.mins5.find}/{user.mins5.tx}
                            </div>
                            <div class="p-1">
                              Current 5 mins: {user.current.find}/{user.current.tx}
                            </div>
                          </div>
                          <div class="p-1 flex-col ml-10">
                            {#each Object.entries(user.data ?? {}) as [k, v]}
                              <div class="p-1">
                                {k}: {JSON.stringify(v)}
                              </div>
                            {/each}
                          </div>
                        {/each}
                      </Expandable>
                    </div>
                  {/each}
                </div>
              </Expandable>
            </span>
          {/if}
        {/each}
      </div>
    {:else if selectedTab === 'statistics'}
      <div class="flex-column p-3 h-full" style:overflow="auto">
        {#if metricsData !== undefined}
          <MetricsInfo metrics={metricsData} />
        {/if}
      </div>
    {:else if selectedTab === 'statistics-front'}
      <div class="flex-column p-3 h-full" style:overflow="auto">
        {#if metricsDataFront !== undefined}
          <MetricsInfo metrics={metricsDataFront} />
        {/if}
      </div>
    {/if}
  {:else}
    <Loading />
  {/if}
</Panel>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
