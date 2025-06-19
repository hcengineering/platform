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
  import { ActivityTypeUpdate } from '@hcengineering/communication-types'
  import cardPlugin, { MasterTag } from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import { IconEdit, Icon, Label, Component } from '@hcengineering/ui'

  import communication from '../../../plugin'

  export let update: ActivityTypeUpdate

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: clazz = hierarchy.getClass(update.newType) as MasterTag
</script>

<div class="type overflow-label flex-gap-1 no-pointer no-word-wrap">
  <span class="mr-1"><Icon icon={IconEdit} size="small" /></span>
  <Label label={communication.string.Set} />
  <span class="lower">
    <Label label={cardPlugin.string.MasterTag} />
    <Label label={communication.string.To} />
  </span>

  <Component is={cardPlugin.component.CardTagColored} props={{ labelIntl: clazz.label, color: clazz.background }} />
</div>

<style lang="scss">
  .type {
    display: flex;
    align-items: center;
  }
</style>
