<script lang="ts">
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { metricsToRows } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, IconArrowRight, Loading, Panel, Scroller, TabItem, TabList, ticker } from '@hcengineering/ui'
  import EditBox from '@hcengineering/ui/src/components/EditBox.svelte'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'

  export let endpoint: string
  export let token: string

  let data: any
  let admin = false
  onDestroy(
    ticker.subscribe(() => {
      fetch(endpoint + `/api/v1/statistics?token=${token}`, {}).then(async (json) => {
        data = await json.json()
        admin = data?.admin ?? false
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
      labelIntl: getEmbeddedLabel('Statistics')
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
      {
        userId: string
        total: StatisticsElement
        mins5: StatisticsElement
        current: StatisticsElement
      }[]
    >) ?? {}

  const employeeQuery = createQuery()

  let employees: Map<string, PersonAccount> = new Map()

  employeeQuery.query(contact.class.PersonAccount, {}, (res) => {
    const emp: Map<string, PersonAccount> = new Map()
    for (const r of res) {
      emp.set(r.email, r)
    }
    employees = emp
  })
  const toNum = (value: any) => value as number

  let warningTimeout = 15
</script>

<Panel on:close isFullSize useMaxWidth={true}>
  <svelte:fragment slot="header">
    {#if data}
      Mem: {data.statistics.memoryUsed} / {data.statistics.memoryTotal} CPU: {data.statistics.cpuUsage}
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="navigator">
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
                fetch(endpoint + `/api/v1/manage?token=${token}&operation=maintenance&timeout=${warningTimeout}`, {
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
                fetch(endpoint + `/api/v1/manage?token=${token}&operation=reboot`, {
                  method: 'PUT'
                })
              }}
            />
          </div>
        </div>
      {/if}
    {:else if selectedTab === 'users'}
      <div class="flex-column p-3 h-full" style:overflow="auto">
        {#each Object.entries(activeSessions) as act}
          <span class="flex-col">
            <div class="fs-title">
              Workspace: {act[0]}: {act[1].length}
            </div>

            <div class="flex-col">
              {#each act[1] as user}
                {@const employee = employees.get(user.userId)}
                <div class="p-1 flex-row-center">
                  {#if employee}
                    <ObjectPresenter
                      _class={contact.mixin.Employee}
                      objectId={employee.person}
                      props={{ shouldShowAvatar: true }}
                    />
                  {:else}
                    {user.userId}
                  {/if}
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
              {/each}
            </div>
          </span>
        {/each}
      </div>
    {:else if selectedTab === 'statistics'}
      <Scroller>
        <table class="antiTable" class:highlightRows={true}>
          <thead class="scroller-thead">
            <tr>
              <th><div class="p-1">Name</div> </th>
              <th>Average</th>
              <th>Total</th>
              <th>Ops</th>
            </tr>
          </thead>
          <tbody>
            {#each metricsToRows(data.metrics, 'System') as row}
              <tr class="antiTable-body__row">
                <td>
                  <span style={`padding-left: ${toNum(row[0]) + 0.5}rem;`}>
                    {row[1]}
                  </span>
                </td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>{row[4]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Scroller>
    {/if}
  {:else}
    <Loading />
  {/if}
</Panel>
