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
  import { ExecutionLog } from '@hcengineering/process'
  import { Notification, NotificationToast } from '@hcengineering/ui'
  import LogActionPresenter from './LogActionPresenter.svelte'
  import TransitionRefPresenter from './settings/TransitionRefPresenter.svelte'
  import { CardPresenter } from '@hcengineering/card-resources'

  export let notification: Notification
  export let onRemove: () => void

  $: val = notification?.params?.event as ExecutionLog
</script>

{#if val}
  <NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
    <svelte:fragment slot="content">
      <div class="fs-title">
        <CardPresenter value={val.card} shouldShowAvatar />
      </div>
      <div class="flex-row-center flex-wrap gap-2 reverse">
        <LogActionPresenter value={val.action} />
        {#if val.transition}
          <TransitionRefPresenter value={val.transition} />
        {/if}
      </div>
    </svelte:fragment>
  </NotificationToast>
{/if}
