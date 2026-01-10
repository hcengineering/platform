<!--
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
-->
<script lang="ts">
  import { AnyAttribute, AttributePermission } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'

  export let value: AttributePermission
  export let inline: boolean = false

  const client = getClient()
  $: attr = client.getModel().findObject(value?.attribute) as AnyAttribute
</script>

{#if value}
  <div class="flex-presenter" class:inline-presenter={inline}>
    <Label label={value.label} />
    {#if attr}
      <Label label={attr.label} />
    {/if}
  </div>
{/if}
