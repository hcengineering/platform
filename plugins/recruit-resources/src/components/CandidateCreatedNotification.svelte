<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Button, Notification, NotificationToast } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { openDocFromRef } from '@hcengineering/view-resources'
  import recruit from '../plugin'

  export let notification: Notification
  export let onRemove: () => void

  function handleOpen (): void {
    const candidateId = notification.params?.candidateId
    if (candidateId !== undefined) {
      void openDocFromRef(recruit.mixin.Candidate, candidateId)
    }
    onRemove()
  }
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    <span class="overflow-label">{notification.subTitle}</span>
  </svelte:fragment>

  <svelte:fragment slot="buttons">
    <Button label={view.string.Open} on:click={handleOpen} />
  </svelte:fragment>
</NotificationToast>
