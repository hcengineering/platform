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
  import contact, { Employee } from '@anticrm/contact'
  import { Class, Doc, Ref } from '@anticrm/core'
  import { Issue, Team } from '@anticrm/tracker'
  import { UsersPopup, getClient } from '@anticrm/presentation'
  import { AttributeModel } from '@anticrm/view'
  import { eventToHTMLElement, showPopup } from '@anticrm/ui'
  import { getObjectPresenter } from '@anticrm/view-resources'
  import { IntlString } from '@anticrm/platform'
  import tracker from '../../plugin'

  export let value: Employee | null
  export let issueId: Ref<Issue>
  export let defaultClass: Ref<Class<Doc>> | undefined = undefined
  export let currentSpace: Ref<Team> | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let defaultName: IntlString | undefined = undefined

  const client = getClient()

  let presenter: AttributeModel | undefined

  $: if (value || defaultClass) {
    if (value) {
      getObjectPresenter(client, value._class, { key: '' }).then((p) => {
        presenter = p
      })
    } else if (defaultClass) {
      getObjectPresenter(client, defaultClass, { key: '' }).then((p) => {
        presenter = p
      })
    }
  }

  const handleAssigneeChanged = async (result: Employee | null | undefined) => {
    if (!isEditable || result === undefined) {
      return
    }

    const currentIssue = await client.findOne(tracker.class.Issue, { space: currentSpace, _id: issueId })

    if (currentIssue === undefined) {
      return
    }

    const newAssignee = result === null ? null : result._id

    await client.update(currentIssue, { assignee: newAssignee })
  }

  const handleAssigneeEditorOpened = async (event: MouseEvent) => {
    if (!isEditable) {
      return
    }

    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        selected: value?._id,
        allowDeselect: true,
        placeholder: tracker.string.AssignTo
      },
      eventToHTMLElement(event),
      handleAssigneeChanged
    )
  }
</script>

{#if presenter}
  <svelte:component
    this={presenter.presenter}
    {value}
    {defaultName}
    avatarSize={'tiny'}
    isInteractive={true}
    shouldShowPlaceholder={true}
    shouldShowName={shouldShowLabel}
    onEmployeeEdit={handleAssigneeEditorOpened}
    tooltipLabels={{ personLabel: tracker.string.AssignedTo, placeholderLabel: tracker.string.AssignTo }}
  />
{/if}
