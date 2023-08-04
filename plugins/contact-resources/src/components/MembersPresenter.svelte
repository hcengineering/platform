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
  import { Doc, Ref } from '@hcengineering/core'
  import { Button, showPopup, eventToHTMLElement, themeStore } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import contact, { Employee } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'
  import { IntlString, translate } from '@hcengineering/platform'
  import UsersPopup from './UsersPopup.svelte'

  export let value: Doc
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let intlTitle: IntlString
  export let intlSearchPh: IntlString
  export let retrieveMembers: (doc: Doc) => Ref<Employee>[]
  export let shouldShowLabel: boolean = true

  const client = getClient()

  let buttonTitle = ''

  $: members = retrieveMembers(value)
  $: translate(intlTitle, {}, $themeStore.language).then((res) => {
    buttonTitle = res
  })

  const handleMembersChanged = async (result: Ref<Employee>[] | undefined) => {
    if (result === undefined) {
      return
    }

    const memberToPull = members.filter((x) => !result.includes(x))[0]
    const memberToPush = result.filter((x) => !members.includes(x))[0]

    if (memberToPull) {
      await client.update(value, { $pull: { members: memberToPull } })
    }

    if (memberToPush) {
      await client.update(value, { $push: { members: memberToPush } })
    }
  }

  const handleMembersEditorOpened = async (event: MouseEvent) => {
    showPopup(
      UsersPopup,
      {
        _class: contact.mixin.Employee,
        selectedUsers: members,
        allowDeselect: true,
        multiSelect: true,
        docQuery: {
          active: true
        },
        placeholder: intlSearchPh
      },
      eventToHTMLElement(event),
      undefined,
      handleMembersChanged
    )
  }
</script>

<Button
  {kind}
  {size}
  {width}
  {justify}
  label={shouldShowLabel ? contact.string.NumberMembers : undefined}
  labelParams={shouldShowLabel ? { count: members.length } : {}}
  title={buttonTitle}
  icon={contact.icon.ComponentMembers}
  on:click={handleMembersEditorOpened}
/>
