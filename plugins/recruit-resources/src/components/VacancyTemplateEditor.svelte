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
  import { AttributesBar, getClient } from '@hcengineering/presentation'
  import { KanbanTemplate } from '@hcengineering/task'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import tracker from '@hcengineering/tracker'
  import { Button, Component, EditBox, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { getFiltredKeys } from '@hcengineering/view-resources'
  import recruit from '../plugin'

  export let template: KanbanTemplate

  const client = getClient()

  const hierarchy = client.getHierarchy()
  const customKeys = getFiltredKeys(hierarchy, template._class, []).filter((key) => key.attr.isCustom)

  async function onDescriptionChange (value: string) {
    await client.update(template, { description: value })
  }

  async function onShortDescriptionChange (value: string) {
    await client.update(template, { shortDescription: value })
  }
</script>

<div class="flex-no-shrink flex-between trans-title uppercase">
  <Label label={recruit.string.Description} />
</div>
<div class="mt-3">
  <EditBox
    kind={'small-style'}
    bind:value={template.shortDescription}
    on:change={() => onShortDescriptionChange(template.shortDescription ?? '')}
  />
</div>
<div class="mt-9">
  <div class="flex-no-shrink flex-between trans-title uppercase">
    <Label label={recruit.string.FullDescription} />
  </div>
  <div class="mt-3">
    {#key template._id}
      <StyledTextBox
        kind={'emphasized'}
        alwaysEdit
        showButtons={false}
        content={template.description ?? ''}
        on:value={(evt) => onDescriptionChange(evt.detail)}
      />
    {/key}
  </div>
</div>
<div class="antiSection mt-9 mb-9">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={recruit.icon.Issue} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={tracker.string.RelatedIssues} />
    </span>
    <div class="buttons-group small-gap">
      <Button
        id="add-sub-issue"
        width="min-content"
        icon={IconAdd}
        label={undefined}
        labelParams={{ subIssues: 0 }}
        kind={'ghost'}
        size={'small'}
        on:click={() => showPopup(tracker.component.CreateIssueTemplate, { relatedTo: template })}
      />
    </div>
  </div>
  <div class="flex-row">
    <Component is={tracker.component.RelatedIssueTemplates} props={{ object: template }} />
  </div>
</div>
{#if customKeys && customKeys.length > 0}
  <div class="antiSection mb-9">
    <AttributesBar object={template} _class={template._class} keys={customKeys} />
  </div>
{/if}
