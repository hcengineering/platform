<script lang="ts">
  import { Floor, Room } from '@hcengineering/love'
  import { Component } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import core, { WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'

  import lovePlg from '../plugin'

  export let floor: Floor
  export let rooms: Room[] = []

  const client = getClient()
  let viewlet: WithLookup<Viewlet> | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined

  const preferenceQuery = createQuery()

  void client
    .findAll(
      view.class.Viewlet,
      { _id: lovePlg.viewlet.TableMeetingMinutes },
      { lookup: { descriptor: view.class.ViewletDescriptor } }
    )
    .then((res) => {
      viewlet = res[0]
    })

  $: preferenceQuery.query(
    view.class.ViewletPreference,
    {
      space: core.space.Workspace,
      attachedTo: lovePlg.viewlet.TableMeetingMinutes
    },
    (res) => {
      preference = res[0]
    },
    { limit: 1 }
  )
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: lovePlg.class.MeetingMinutes,
      config: preference?.config ?? viewlet.config,
      options: viewlet.options,
      query: { attachedTo: { $in: rooms.map((p) => p._id) } },
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      enableChecking: false
    }}
  />
{/if}
