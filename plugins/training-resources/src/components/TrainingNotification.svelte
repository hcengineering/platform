<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import { createQuery } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { Button, navigate, Notification, NotificationToast } from '@hcengineering/ui'
  import type { Training } from '@hcengineering/training'
  import { trainingRoute } from '../routing/routes/trainingRoute'
  import PanelTitle from './PanelTitle.svelte'
  import training from '../plugin'

  export let notification: Notification
  export let onRemove: () => void

  let trainingObject: Training | null = null
  const query = createQuery()
  $: query.query(
    training.class.Training,
    {
      _id: notification.params?.id
    },
    (result) => {
      trainingObject = result[0] ?? null
    }
  )

  function onClick (): void {
    if (trainingObject === null) {
      return
    }
    navigate(
      trainingRoute.build({
        id: trainingObject._id,
        tab: null
      })
    )
    onRemove()
  }
</script>

{#if trainingObject !== null}
  <NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
    <svelte:fragment slot="content">
      <PanelTitle training={trainingObject} />
    </svelte:fragment>

    <svelte:fragment slot="buttons">
      <Button label={view.string.Open} on:click={onClick} />
    </svelte:fragment>
  </NotificationToast>
{/if}
