<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { TagReference } from '@hcengineering/tags'
  import { Button, ButtonKind, Icon, Label, getEventPopupPositionElement, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tagsPlugin from '../plugin'
  import DraftTagsPopup from './DraftTagsPopup.svelte'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagIcon from './icons/TagIcon.svelte'

  export let tags: TagReference[] = []
  export let targetClass: Ref<Class<Doc>>
  export let kind: ButtonKind = 'ghost'

  const dispatch = createEventDispatcher()

  function removeTag (tag: TagReference) {
    tags = tags.filter((t) => t !== tag)
    dispatch('change', tags)
  }

  function click (evt: MouseEvent) {
    showPopup(DraftTagsPopup, { targetClass, tags }, getEventPopupPositionElement(evt), undefined, (res) => {
      tags = res
      dispatch('change', tags)
    })
  }
</script>

<div>
  <Button {kind} padding={'0rem;'} on:click={click}>
    <div slot="content" class="flex-row-center flex-gap-1">
      <Icon icon={TagIcon} size={'medium'} />
      <span class="overflow-label label"><Label label={tagsPlugin.string.AddLabel} /></span>
    </div>
  </Button>
  {#if tags.length}
    <div class="flex-row-center flex-wrap">
      {#each tags as value}
        <div class="step-container clear-mins">
          <TagReferencePresenter
            attr={undefined}
            isEditable
            {value}
            kind={'list'}
            on:remove={(res) => removeTag(res.detail)}
          />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .step-container {
    margin: 0.375rem 0.375rem 0 0;
  }
</style>
