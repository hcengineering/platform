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
  import { Tag } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { MethodParams, Step } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let step: Step<Tag>
  export let params: MethodParams<Tag>

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]

  $: tag = params._id as Ref<Tag> | undefined
  $: selected = tag && client.getModel().findObject(tag)
</script>

<div class="flex-row-center flex-gap-1">
  <Label label={method.label} />:
  <div class="title">
    {#if selected}
      <Label label={selected.label} />
    {/if}
  </div>
</div>

<style lang="scss">
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--theme-caption-color);
  }
</style>
