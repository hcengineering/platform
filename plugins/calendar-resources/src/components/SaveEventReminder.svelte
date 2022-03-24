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
  import { Class,Ref } from '@anticrm/core'
  import presentation, { Card,createQuery,getClient } from '@anticrm/presentation'
  import { DatePicker,Grid } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let objectId: Ref<Event>
  export let objectClass: Ref<Class<Event>>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()
  query.query(objectClass, { _id: objectId }, (res) => {
    event = res[0]
    if (event !== undefined) {
      if (hierarchy.hasMixin(event, calendar.mixin.Reminder)) {
        const reminder = hierarchy.as(event, calendar.mixin.Reminder)
        startDate = new Date(event.date + reminder.shift)
      } else {
        startDate = new Date(event.date)
      }
    }
  })
  let startDate: Date = new Date()
  let event: Event | undefined

  const dispatch = createEventDispatcher()

  export function canClose (): boolean {
    return true
  }

  async function saveReminder () {
    if (event === undefined) return
    const shift = startDate.getTime() - event.date
    await client.updateMixin(event._id, event._class, event.space, calendar.mixin.Reminder, {
      shift,
      state: 'active'
    })
  }
</script>

<Card
  size={'medium'}
  label={calendar.string.SetReminder}
  okLabel={presentation.string.Save}
  canSave={event !== undefined}
  okAction={saveReminder}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.75}>
    <div class="antiComponentBox">
      <DatePicker title={calendar.string.Date} bind:value={startDate} withTime />
    </div>
  </Grid>
</Card>
