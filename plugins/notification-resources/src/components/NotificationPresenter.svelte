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
  import { Doc } from '@anticrm/core'
  import { getPlatformColor } from '@anticrm/ui'
  import { NotificationClient } from '../utils'

  export let value: Doc

  const notificationClient = NotificationClient.getClient()
  const lastViews = notificationClient.getLastViews()

  $: lastView = $lastViews.get(value._id)
  $: hasNotification = lastView !== undefined && lastView < value.modifiedOn
</script>

{#if hasNotification}
  <div class="color" style="background-color: {getPlatformColor(11)}" />
{/if}

<style lang="scss">
  .color {
    width: .5rem;
    height: .5rem;
    border-radius: .5rem;
  }
</style>