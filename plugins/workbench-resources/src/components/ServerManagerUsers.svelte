<script lang="ts">
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { systemAccountEmail } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { createQuery, isAdminUser } from '@hcengineering/presentation'
  import { Button, CheckBox, fetchMetadataLocalStorage, ticker } from '@hcengineering/ui'
  import Expandable from '@hcengineering/ui/src/components/Expandable.svelte'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { workspacesStore } from '../utils'

  const _endpoint: string = fetchMetadataLocalStorage(login.metadata.LoginEndpoint) ?? ''
  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  let endpoint = _endpoint.replace(/^ws/g, 'http')
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.substring(0, endpoint.length - 1)
  }

  async function fetchStats (time: number): Promise<void> {
    await fetch(endpoint + `/api/v1/statistics?token=${token}`, {})
      .then(async (json) => {
        data = await json.json()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  let data: any
  $: void fetchStats($ticker)

  interface StatisticsElement {
    find: number
    tx: number
  }

  $: activeSessions =
    (data?.statistics?.activeSessions as Record<
    string,
    {
      sessions: Array<{
        userId: string
        data?: Record<string, any>
        total: StatisticsElement
        mins5: StatisticsElement
        current: StatisticsElement
      }>
      name: string
      wsId: string
      sessionsTotal: number
      upgrading: boolean
      closing: boolean
    }
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
  let realUsers: boolean
</script>

<div class="p-6">
  <div class="flex-row-center">
    Uniq users: {Object.keys(activeSessions).length} of {data?.statistics?.totalClients} connections
  </div>
  <div class="flex-row-center">
    <CheckBox bind:checked={realUsers} />
    <div class="ml-1">Show only users</div>
  </div>
</div>
<div class="flex-column p-3 h-full" style:overflow="auto">
  {#each Object.entries(activeSessions) as act}
    {@const wsInstance = $workspacesStore.find((it) => it.workspaceId === act[0])}
    {@const totalFind = act[1].sessions.reduce((it, itm) => itm.total.find + it, 0)}
    {@const totalTx = act[1].sessions.reduce((it, itm) => itm.total.tx + it, 0)}

    {@const currentFind = act[1].sessions.reduce((it, itm) => itm.current.find + it, 0)}
    {@const currentTx = act[1].sessions.reduce((it, itm) => itm.current.tx + it, 0)}
    {@const employeeGroups = Array.from(new Set(act[1].sessions.map((it) => it.userId))).filter(
      (it) => systemAccountEmail !== it || !realUsers
    )}
    {@const realGroup = Array.from(new Set(act[1].sessions.map((it) => it.userId))).filter(
      (it) => systemAccountEmail !== it
    )}
    {#if employeeGroups.length > 0}
      <span class="flex-col">
        <Expandable contentColor expanded={false} expandable={true} bordered>
          <svelte:fragment slot="title">
            <div class="flex flex-row-center flex-between flex-grow p-1">
              <div class="fs-title" class:greyed={realGroup.length === 0}>
                Workspace: {wsInstance?.workspaceName ?? act[0]}: {employeeGroups.length} current 5 mins => {currentFind}/{currentTx},
                total => {totalFind}/{totalTx}
                {#if act[1].upgrading}
                  (Upgrading)
                {/if}
                {#if act[1].closing}
                  (Closing)
                {/if}
              </div>
              {#if isAdminUser()}
                <Button
                  label={getEmbeddedLabel('Force close')}
                  size={'small'}
                  kind={'ghost'}
                  on:click={() => {
                    void fetch(endpoint + `/api/v1/manage?token=${token}&operation=force-close&wsId=${act[1].wsId}`, {
                      method: 'PUT'
                    })
                  }}
                />
              {/if}
            </div>
          </svelte:fragment>
          <div class="flex-col">
            {#each employeeGroups as employeeId}
              {@const employee = employees.get(employeeId)}
              {@const connections = act[1].sessions.filter((it) => it.userId === employeeId)}

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
                        <div class="ml-1">{find} rx/{txes} tx</div>
                      </div>
                    </div>
                  </svelte:fragment>
                  {#each connections as user, i}
                    <div class="flex-row-center ml-10">
                      #{i}
                      {user.userId}
                      <div class="p-1">
                        Total: {user.total.find} rx/{user.total.tx} tx
                      </div>
                      <div class="p-1">
                        Previous 5 mins: {user.mins5.find} rx/{user.mins5.tx} tx
                      </div>
                      <div class="p-1">
                        Current 5 mins: {user.current.find} tx/{user.current.tx} tx
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

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
