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
  import { AttachmentStyleBoxCollabEditor } from '@hcengineering/attachment-resources'
  import { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import tags from '@hcengineering/tags'
  import { IssueTemplate, IssueTemplateChild, Project } from '@hcengineering/tracker'
  import { Button, EditBox, IconMoreH, Label, getCurrentResolvedLocation, navigate, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import tracker from '../../plugin'

  import SubIssueTemplates from './IssueTemplateChilds.svelte'
  import TemplateControlPanel from './TemplateControlPanel.svelte'

  export let _id: Ref<IssueTemplate>
  export let _class: Ref<Class<IssueTemplate>>
  export let embedded: boolean = false

  let lastId: Ref<Doc> = _id
  const query = createQuery()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let template: WithLookup<IssueTemplate> | undefined
  let currentProject: Project | undefined
  let title = ''
  let innerWidth: number

  let descriptionBox: AttachmentStyleBoxCollabEditor

  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      void notificationClient.then((client) => client.read(prev))
    }
  }

  onDestroy(async () => {
    void notificationClient.then((client) => client.read(_id))
  })

  $: _id !== undefined &&
    _class !== undefined &&
    query.query(
      _class,
      { _id },
      async (result) => {
        ;[template] = result
        title = template.title
        currentProject = template.$lookup?.space
      },
      { lookup: { space: tracker.class.Project, labels: tags.class.TagElement } }
    )

  $: canSave = title.trim().length > 0

  let saved = false

  async function save (): Promise<void> {
    if (template === undefined || !canSave) {
      return
    }

    const trimmedTitle = title.trim()

    if (trimmedTitle.length > 0 && trimmedTitle !== template.title?.trim()) {
      await client.update(template, { title: trimmedTitle })
    }
  }

  function showMenu (ev?: Event): void {
    if (template !== undefined) {
      showPopup(
        ContextMenu,
        { object: template, excludedActions: [view.action.Open] },
        (ev as MouseEvent).target as HTMLElement
      )
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
  $: descriptionKey = client.getHierarchy().getAttribute(tracker.class.IssueTemplate, 'description')
</script>

{#if template !== undefined}
  <Panel
    title={template.title}
    object={template}
    isHeader={false}
    isAside={true}
    isSub={false}
    {embedded}
    withoutActivity={false}
    bind:innerWidth
    on:open
    on:close={() => dispatch('close')}
  >
    <EditBox bind:value={title} placeholder={tracker.string.IssueTitlePlaceholder} kind="large-style" on:blur={save} />
    <div class="w-full mt-6">
      <AttachmentStyleBoxCollabEditor
        focusIndex={30}
        object={template}
        key={{ key: 'description', attr: descriptionKey }}
        bind:this={descriptionBox}
        placeholder={tracker.string.IssueDescriptionPlaceholder}
        on:saved={(evt) => {
          saved = evt.detail
        }}
      />
    </div>
    <div class="mt-6">
      {#key template._id !== undefined && currentProject !== undefined}
        {#if currentProject !== undefined}
          <SubIssueTemplates
            maxHeight="limited"
            project={template.space}
            bind:children={template.children}
            on:create-issue={createIssue}
            on:update-issue={updateIssue}
            on:update-issues={updateIssues}
          />
        {/if}
      {/key}
    </div>

    <svelte:fragment slot="pre-utils">
      {#if saved}
        <Label label={tracker.string.Saved} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="utils">
      <Button icon={IconMoreH} iconProps={{ size: 'medium' }} kind={'icon'} on:click={showMenu} />
      <Button
        icon={setting.icon.Setting}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        showTooltip={{ label: setting.string.ClassSetting }}
        on:click={(ev) => {
          ev.stopPropagation()
          const loc = getCurrentResolvedLocation()
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
      {#if template !== undefined && currentProject}
        <TemplateControlPanel issue={template} />
      {/if}
    </svelte:fragment>
  </Panel>
{/if}
