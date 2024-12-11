<script lang="ts">
  import contact from '@hcengineering/contact'
  import { groupByArray } from '@hcengineering/core'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { isAdminUser, type OverviewStatistics } from '@hcengineering/presentation'
  import { Button, CheckBox, ticker } from '@hcengineering/ui'
  import Expandable from '@hcengineering/ui/src/components/Expandable.svelte'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import { workspacesStore } from '../utils'

  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  const endpoint = getMetadata(presentation.metadata.StatsUrl)

  async function fetchStats (time: number): Promise<void> {
    await fetch(endpoint + `/api/v1/overview?token=${token}`, {})
      .then(async (json) => {
        data = await json.json()
      })
      .catch((err) => {
        console.error(err)
      })
  }
  let data: OverviewStatistics | undefined
  $: void fetchStats($ticker)
  $: employees = $employeeByIdStore
  let realUsers: boolean

  $: byService = groupByArray(data?.workspaces ?? [], (it) => it.service)
</script>

<div class="p-6">
  <div class="flex-row-center">
    Uniq users: {data?.usersTotal} of {data?.connectionsTotal} connections
  </div>
  <div class="flex-row-center">
    <CheckBox bind:checked={realUsers} />
    <div class="ml-1">Show only users</div>
  </div>
</div>
<div class="flex-column p-3 h-full" style:overflow="auto">
  {#each byService.keys() as s}
    Service: {s}
    {#each byService.get(s) ?? [] as act}
      {@const wsInstance = $workspacesStore.find((it) => it.workspaceId === act.wsId)}
      {@const totalFind = act.sessions.reduce((it, itm) => itm.total.find + it, 0)}
      {@const totalTx = act.sessions.reduce((it, itm) => itm.total.tx + it, 0)}

      {@const currentFind = act.sessions.reduce((it, itm) => itm.current.find + it, 0)}
      {@const currentTx = act.sessions.reduce((it, itm) => itm.current.tx + it, 0)}
      {@const employeeGroups = Array.from(new Set(act.sessions.map((it) => it.userId)))}
      {#if employeeGroups.length > 0}
        <span class="flex-col">
          <Expandable contentColor expanded={false} expandable={true} bordered>
            <svelte:fragment slot="title">
              <div class="flex flex-row-center flex-between flex-grow p-1">
                <div class="fs-title">
                  Workspace: {wsInstance?.workspaceName ?? act.wsId}: {employeeGroups.length} current 5 mins => {currentFind}/{currentTx},
                  total => {totalFind}/{totalTx}
                </div>
                {#if isAdminUser()}
                  <Button
                    label={getEmbeddedLabel('Force close')}
                    size={'small'}
                    kind={'ghost'}
                    on:click={() => {
                      void fetch(endpoint + `/api/v1/manage?token=${token}&operation=force-close&wsId=${act.wsId}`, {
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
                {@const connections = act.sessions.filter((it) => it.userId === employeeId)}

                {@const find = connections.reduce((it, itm) => itm.current.find + it, 0)}
                {@const txes = connections.reduce((it, itm) => itm.current.tx + it, 0)}
                <div class="p-1 flex-col ml-4">
                  <Expandable>
                    <svelte:fragment slot="title">
                      <div class="flex-row-center p-1">
                        {#if employee}
                          <ObjectPresenter
                            _class={contact.mixin.Employee}
                            objectId={employee}
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
  {/each}
</div>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
