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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags, { TagReference } from '@hcengineering/tags'
  import { Button, ButtonKind, Icon, Label, getEventPopupPositionElement, showPopup } from '@hcengineering/ui'
  import tagsPlugin from '../plugin'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'
  import TagIcon from './icons/TagIcon.svelte'

  export let object: Doc
  export let targetClass: Ref<Class<Doc>>
  export let kind: ButtonKind = 'ghost'

  let items: TagReference[] = []
  const query = createQuery()
  const client = getClient()

  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    items = result
  })

  async function click (evt: MouseEvent): Promise<void> {
    showPopup(TagsEditorPopup, { object, targetClass }, getEventPopupPositionElement(evt))
  }

  async function removeTag (tag: TagReference): Promise<void> {
    if (tag !== undefined) await client.remove(tag)
  }
</script>

<div>
  <Button {kind} padding={'0rem;'} on:click={click}>
    <div slot="content" class="flex-row-center flex-gap-1">
      <Icon icon={TagIcon} size={'medium'} />
      <span class="overflow-label label"><Label label={tagsPlugin.string.AddLabel} /></span>
    </div>
  </Button>
  {#if items.length}
    <div class="flex-row-center flex-wrap">
      {#each items as value}
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
