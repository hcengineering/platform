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
  import { Ref } from '@anticrm/core'
  import { TagElement } from '@anticrm/tags'
  import { Icon } from '@anticrm/ui'
  import tags from '../plugin'

  export let value: TagElement
  export let tagElements: Map<Ref<TagElement>, { count: number; modifiedOn: number }> | undefined
  export let onTag: ((tag: TagElement) => void) | undefined = undefined
</script>

{#if (tagElements?.get(value._id)?.count ?? 0) > 0}
  <div class="sm-tool-icon" on:click={() => onTag?.(value)}>
    <span class="icon"><Icon icon={tags.icon.Tags} size={'small'} /> </span>
    &nbsp;{tagElements?.get(value._id)?.count ?? 0}
  </div>
{/if}
