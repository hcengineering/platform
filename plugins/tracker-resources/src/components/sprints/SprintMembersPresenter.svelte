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
  import { Ref } from '@hcengineering/core'
  import { Sprint } from '@hcengineering/tracker'
  import { Button, showPopup, eventToHTMLElement } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import contact, { Employee } from '@hcengineering/contact'
  import { getClient, UsersPopup } from '@hcengineering/presentation'
  import { translate } from '@hcengineering/platform'
  import tracker from '../../plugin'

  export let value: Sprint
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'

  const client = getClient()

  let buttonTitle = ''

  $: translate(tracker.string.SprintMembersTitle, {}).then((res) => {
    buttonTitle = res
  })

  const handleSprinttMembersChanged = async (result: Ref<Employee>[] | undefined) => {
    if (result === undefined) {
      return
    }

    const memberToPull = value.members.filter((x) => !result.includes(x))[0]
    const memberToPush = result.filter((x) => !value.members.includes(x))[0]

    if (memberToPull) {
      await client.update(value, { $pull: { members: memberToPull } })
    }

    if (memberToPush) {
      await client.update(value, { $push: { members: memberToPush } })
    }
  }

  const handleSprintMembersEditorOpened = async (event: MouseEvent) => {
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Employee,
        selectedUsers: value.members,
        allowDeselect: true,
        multiSelect: true,
        docQuery: {
          active: true
        },
        placeholder: tracker.string.SprintMembersSearchPlaceholder
      },
      eventToHTMLElement(event),
      undefined,
      handleSprinttMembersChanged
    )
  }
</script>

<Button
  {kind}
  {size}
  {width}
  {justify}
  title={buttonTitle}
  icon={tracker.icon.ProjectMembers}
  on:click={handleSprintMembersEditorOpened}
/>
