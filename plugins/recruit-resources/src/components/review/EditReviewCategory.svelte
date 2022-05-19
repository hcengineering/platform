<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Attachments } from '@anticrm/attachment-resources'
  import type { Ref } from '@anticrm/core'
  import { AttributesBar, createQuery, getClient } from '@anticrm/presentation'
  import { ReviewCategory } from '@anticrm/recruit'
  import { TextEditor } from '@anticrm/text-editor'
  import { Panel } from '@anticrm/panel'
  import { EditBox, Grid, Label, ToggleWithLabel } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'

  export let _id: Ref<ReviewCategory>

  let object: ReviewCategory

  const dispatch = createEventDispatcher()

  const client = getClient()

  const query = createQuery()
  const clazz = client.getHierarchy().getClass(recruit.class.ReviewCategory)
  $: query.query(recruit.class.ReviewCategory, { _id }, (result) => {
    object = result[0]
  })

  // const tabs: IntlString[] = ['General' as IntlString, 'Members' as IntlString, 'Activity' as IntlString]
  let textEditor: TextEditor

  function onChange (key: string, value: any): void {
    client.updateDoc(object._class, object.space, object._id, { [key]: value })
  }
</script>

{#if object}
  <Panel
    icon={clazz.icon}
    title={object.name}
    subtitle={object.description}
    isHeader={false}
    isAside={true}
    {object}
    isFullSize
    on:fullsize
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if dir === 'column'}
        <div class="flex-row-center subtitle">
          <AttributesBar {object} keys={[]} vertical />
        </div>
      {/if}
    </svelte:fragment>

    <Grid column={1} rowGap={1.5}>
      <EditBox
        label={recruit.string.ReviewCategoryName}
        bind:value={object.name}
        placeholder={recruit.string.ReviewCategoryPlaceholder}
        maxWidth="39rem"
        focus
        on:change={() => {
          onChange('name', object.name)
        }}
      />
      <EditBox
        label={recruit.string.Description}
        bind:value={object.description}
        placeholder={recruit.string.ReviewCategoryDescription}
        maxWidth="39rem"
        focus
        on:change={() => {
          onChange('description', object.description)
        }}
      />
    </Grid>
    <div class="mt-10">
      <span class="title">Description</span>
      <div class="description-container">
        <TextEditor
          bind:this={textEditor}
          bind:content={object.fullDescription}
          on:blur={textEditor.submit}
          on:content={() => {
            onChange('fullDescription', object.fullDescription)
          }}
        />
      </div>
    </div>
    <div class="mt-10">
      <Attachments objectId={object._id} _class={object._class} space={object.space} />
    </div>
    <div class="mt-10">
      <span class="title"><Label label={recruit.string.Members} /></span>
      <ToggleWithLabel
        label={recruit.string.ThisReviewCategoryIsPrivate}
        description={recruit.string.MakePrivateDescription}
      />
    </div>
  </Panel>
{/if}

<style lang="scss">
  .title {
    margin-right: 0.75rem;
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }

  .description-container {
    display: flex;
    justify-content: space-between;
    overflow-y: auto;
    height: 100px;
    padding: 0px 16px;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-top: 20px solid transparent;
    border-bottom: 20px solid transparent;
    border-radius: 0.75rem;
    margin-top: 1.5rem;
  }
</style>
