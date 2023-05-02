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
  import contact, { Employee } from '@hcengineering/contact'
  import { UsersPopup } from '@hcengineering/contact-resources'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Issue, IssueTemplate } from '@hcengineering/tracker'
  import { eventToHTMLElement, showPopup, IconSize } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter } from '@hcengineering/view-resources'
  import tracker from '../../plugin'

  export let value: Employee | Ref<Employee> | null | undefined
  export let object: Issue | IssueTemplate
  export let defaultClass: Ref<Class<Doc>> | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let defaultName: IntlString | undefined = undefined
  export let avatarSize: IconSize = 'x-small'

  const client = getClient()

  let presenter: AttributeModel | undefined

  $: if (value || defaultClass) {
    if (value) {
      getObjectPresenter(client, typeof value === 'string' ? contact.class.Employee : value._class, { key: '' }).then(
        (p) => {
          presenter = p
        }
      )
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

    const newAssignee = result === null ? null : result._id

    await client.update(object, { assignee: newAssignee })
  }

  const handleAssigneeEditorOpened = async (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    event?.preventDefault()
    event?.stopPropagation()

    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        selected: typeof value === 'string' ? value : value?._id,
        docQuery: {
          active: true
        },
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
    {avatarSize}
    isInteractive={true}
    shouldShowPlaceholder={true}
    shouldShowName={shouldShowLabel}
    onEmployeeEdit={handleAssigneeEditorOpened}
    tooltipLabels={{ personLabel: tracker.string.AssignedTo, placeholderLabel: tracker.string.Unassigned }}
  />
{/if}
