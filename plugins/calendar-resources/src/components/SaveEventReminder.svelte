<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Event } from '@anticrm/calendar'
  import { Class,Ref, Timestamp } from '@anticrm/core'
  import presentation, { Card,createQuery,getClient } from '@anticrm/presentation'
  import { Grid, TimeShiftPicker } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let objectId: Ref<Event>
  export let objectClass: Ref<Class<Event>>

  const client = getClient()
  const query = createQuery()
  query.query(objectClass, { _id: objectId }, (res) => {
    event = res[0]
  })
  let shift: Timestamp = -30 * 60 * 1000
  let event: Event | undefined

  const dispatch = createEventDispatcher()

  export function canClose (): boolean {
    return true
  }

  async function saveReminder () {
    if (event === undefined) return
    await client.updateMixin(event._id, event._class, event.space, calendar.mixin.Reminder, {
      shift,
      state: 'active'
    })
  }
</script>

<Card
  label={calendar.string.RemindMeAt}
  okLabel={presentation.string.Save}
  canSave={event !== undefined}
  okAction={saveReminder}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.75}>
    <div class="antiComponentBox">
      <TimeShiftPicker title={calendar.string.RemindMeAt} bind:value={shift} />
    </div>
  </Grid>
</Card>
