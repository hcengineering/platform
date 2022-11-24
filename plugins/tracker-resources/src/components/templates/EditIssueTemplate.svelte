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
  import { AttachmentDocList, AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { Class, Data, Doc, Ref, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import presentation, { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import type { IssueTemplate, IssueTemplateChild, Team } from '@hcengineering/tracker'
  import tags from '@hcengineering/tags'
  import {
    Button,
    EditBox,
    getCurrentLocation,
    IconAttachment,
    IconEdit,
    IconMoreH,
    Label,
    navigate,
    Scroller,
    showPopup
  } from '@hcengineering/ui'
  import { ContextMenu, UpDownNavigator } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import tracker from '../../plugin'

  import SubIssueTemplates from './IssueTemplateChilds.svelte'
  import TemplateControlPanel from './TemplateControlPanel.svelte'

  export let _id: Ref<IssueTemplate>
  export let _class: Ref<Class<IssueTemplate>>

  let lastId: Ref<Doc> = _id
  let lastClass: Ref<Class<Doc>> = _class
  const query = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let template: WithLookup<IssueTemplate> | undefined
  let currentTeam: Team | undefined
  let title = ''
  let description = ''
  let innerWidth: number
  let isEditing = false
  let descriptionBox: AttachmentStyledBox

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      const prevClass = lastClass
      lastId = _id
      lastClass = _class
      notificationClient.then((client) => client.updateLastView(prev, prevClass))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.updateLastView(_id, _class))
  })

  $: _id &&
    _class &&
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[template] = result
        title = template.title
        description = template.description
        currentTeam = template.$lookup?.space
      },
      { lookup: { space: tracker.class.Team, labels: tags.class.TagElement } }
    )

  $: canSave = title.trim().length > 0
  $: isDescriptionEmpty = !new DOMParser().parseFromString(description, 'text/html').documentElement.innerText?.trim()

  function edit (ev: MouseEvent) {
    ev.preventDefault()

    isEditing = true
  }

  function cancelEditing (ev: MouseEvent) {
    ev.preventDefault()

    isEditing = false

    if (template) {
      title = template.title
      description = template.description
    }
  }

  async function save (ev: MouseEvent) {
    ev.preventDefault()

    if (!template || !canSave) {
      return
    }

    const updates: Partial<Data<IssueTemplate>> = {}
    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 0 && trimmedTitle !== template.title) {
      updates.title = trimmedTitle
    }

    if (description !== template.description) {
      updates.description = description
    }

    if (Object.keys(updates).length > 0) {
      await client.update(template, updates)
    }
    await descriptionBox.createAttachments()
    isEditing = false
  }

  function showMenu (ev?: Event): void {
    if (template) {
      showPopup(ContextMenu, { object: template }, (ev as MouseEvent).target as HTMLElement)
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
  const createIssue = async (evt: CustomEvent<IssueTemplateChild>): Promise<void> => {
    if (template === undefined) {
      return
    }
    await client.update(template, {
      $push: { children: evt.detail }
    })
  }
  const updateIssue = async (evt: CustomEvent<Partial<IssueTemplateChild>>): Promise<void> => {
    if (template === undefined) {
      return
    }
    await client.update(template, {
      $update: {
        children: {
          $query: { id: evt.detail.id },
          $update: evt.detail
        }
      }
    })
  }
  const updateIssues = async (evt: CustomEvent<IssueTemplateChild[]>): Promise<void> => {
    if (template === undefined) {
      return
    }
    await client.update(template, {
      children: evt.detail
    })
  }
</script>

{#if template !== undefined}
  <Panel
    object={template}
    isHeader
    isAside={true}
    isSub={false}
    withoutActivity={isEditing}
    bind:innerWidth
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={template} />
    </svelte:fragment>
    <svelte:fragment slot="header">
      <span class="fs-title">
        {template.title}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      {#if isEditing}
        <Button kind={'transparent'} label={presentation.string.Cancel} on:click={cancelEditing} />
        <Button disabled={!canSave} label={presentation.string.Save} on:click={save} />
      {:else}
        <Button icon={IconEdit} kind={'transparent'} size={'medium'} on:click={edit} />
        <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
      {/if}
    </svelte:fragment>

    {#if isEditing}
      <Scroller>
        <div class="popupPanel-body__main-content py-10 clear-mins content">
          <EditBox
            bind:value={title}
            maxWidth="53.75rem"
            placeholder={tracker.string.IssueTitlePlaceholder}
            kind="large-style"
          />
          <div class="flex-between mt-6">
            <div class="flex-grow">
              <AttachmentStyledBox
                bind:this={descriptionBox}
                objectId={_id}
                _class={tracker.class.Issue}
                space={template.space}
                alwaysEdit
                showButtons
                maxHeight={'card'}
                bind:content={description}
                placeholder={tracker.string.IssueDescriptionPlaceholder}
              />
            </div>

            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="tool"
              on:click={() => {
                descriptionBox.attach()
              }}
            >
              <IconAttachment size={'large'} />
            </div>
          </div>
        </div>
      </Scroller>
    {:else}
      <span class="title select-text">{title}</span>
      <div class="mt-6 description-preview select-text">
        {#if isDescriptionEmpty}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div class="placeholder" on:click={edit}>
            <Label label={tracker.string.IssueDescriptionPlaceholder} />
          </div>
        {:else}
          <MessageViewer message={description} />
        {/if}
      </div>
      <div class="mt-6">
        {#key template._id && currentTeam !== undefined}
          {#if currentTeam !== undefined}
            <SubIssueTemplates
              bind:children={template.children}
              on:create-issue={createIssue}
              on:update-issue={updateIssue}
              on:update-issues={updateIssues}
            />
          {/if}
        {/key}
      </div>
      <div class="mt-6">
        <AttachmentDocList value={template} />
      </div>
    {/if}

    <span slot="actions-label"> ID </span>
    <svelte:fragment slot="actions">
      <div class="flex-grow" />
      <!-- {#if issueId}
        <CopyToClipboard issueUrl={generateIssueShortLink(issueId)} {issueId} />
      {/if} -->
      <Button
        icon={setting.icon.Setting}
        kind={'transparent'}
        showTooltip={{ label: setting.string.ClassSetting }}
        on:click={(ev) => {
          ev.stopPropagation()
          const loc = getCurrentLocation()
          loc.path[2] = settingId
          loc.path[3] = 'setting'
          loc.path[4] = 'classes'
          loc.path.length = 5
          loc.query = { _class }
          loc.fragment = undefined
          navigate(loc)
        }}
      />
    </svelte:fragment>

    <svelte:fragment slot="custom-attributes">
      {#if template && currentTeam}
        <TemplateControlPanel issue={template} />
      {/if}

      <div class="divider" />
      <!-- <IssueStatusActivity issue={template} /> -->
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .title {
    font-weight: 500;
    font-size: 1.125rem;
    color: var(--theme-caption-color);
  }

  .content {
    height: auto;
  }

  .description-preview {
    color: var(--theme-content-color);
    line-height: 150%;

    .placeholder {
      color: var(--theme-content-trans-color);
    }
  }
  .divider {
    margin-top: 1rem;
    margin-bottom: 1rem;
    grid-column: 1 / 3;
    height: 1px;
    background-color: var(--divider-color);
  }

  .tool {
    align-self: start;
    width: 20px;
    height: 20px;
    opacity: 0.3;
    cursor: pointer;
    &:hover {
      opacity: 1;
    }
  }
</style>
