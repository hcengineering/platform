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
  import { Button, Label, showPopup, getEventPositionElement } from '@hcengineering/ui'
  import { ObjectBoxPopup } from '@hcengineering/view-resources'
  import { Ref } from '@hcengineering/core'
  import { MasterTag } from '@hcengineering/card'
  import card from '../../plugin'
  export let value: Ref<MasterTag>[]

  function openPopup (ev: MouseEvent): void {
    showPopup(
      ObjectBoxPopup,
      {
        _class: card.class.MasterTag,
        selectedObjects: value,
        multiSelect: true,
        docQuery: { extends: card.class.Card },
        searchField: 'label'
      },
      getEventPositionElement(ev),
      undefined,
      (res) => {
        if (res !== undefined) {
          value = res
        }
      }
    )
  }
</script>

<Button kind={'regular'} size={'large'} justify={'left'} width={'min-content'} on:click={openPopup}>
  <svelte:fragment slot="content">
    {#if value?.length > 0}
      <div class="flex-row-center flex-nowrap pointer-events-none">
        <span class="label nowrap">
          <Label label={card.string.NumberTypes} params={{ count: value.length }} />
        </span>
      </div>
    {:else}
      <Label label={card.string.MasterTags} />
    {/if}
  </svelte:fragment>
</Button>
