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
  import { ObjectMention } from '@hcengineering/view-resources'
  import { Floor } from '@hcengineering/love'
  import { Ref } from '@hcengineering/core'

  import { floors } from '../stores'

  export let value: Ref<Floor>
  export let inline: boolean = false

  $: floor = $floors.find((f) => f._id === value)
</script>

{#if floor}
  {#if inline}
    <ObjectMention object={floor} />
  {:else}
    <div class="flex-presenter overflow-label sm-tool-icon ml-3">
      {floor.name}
    </div>
  {/if}
{/if}
