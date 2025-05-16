<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { AvatarType } from '@hcengineering/contact'
  import { combineName } from '@hcengineering/contact'
  import { EditableAvatar } from '@hcengineering/contact-resources'
  import { EditBox, Button, ActionIcon } from '@hcengineering/ui'
  import recruit from '../../plugin'
  import IconShuffle from '../icons/Shuffle.svelte'

  export let object: any
  export let loading = false
  export let avatarEditor: EditableAvatar

  function swapNames(): void {
    const first = object.firstName
    object.firstName = object.lastName
    object.lastName = first
  }
</script>

<div class="flex-between">
  <div class="flex-col">
    <EditBox
      disabled={loading}
      placeholder={recruit.string.PersonFirstNamePlaceholder}
      bind:value={object.firstName}
      kind={'large-style'}
      autoFocus
      maxWidth={'30rem'}
      focusIndex={1}
    />
    <EditBox
      disabled={loading}
      placeholder={recruit.string.PersonLastNamePlaceholder}
      bind:value={object.lastName}
      maxWidth={'30rem'}
      kind={'large-style'}
      focusIndex={2}
    />
    <div class="mt-1">
      <EditBox
        disabled={loading}
        placeholder={recruit.string.Title}
        bind:value={object.title}
        kind={'small-style'}
        focusIndex={3}
        maxWidth={'30rem'}
      />
    </div>
    <EditBox
      disabled={loading}
      placeholder={recruit.string.Location}
      bind:value={object.city}
      kind={'small-style'}
      focusIndex={4}
      maxWidth={'30rem'}
    />
  </div>
  <div class="flex-col items-center flex-gap-2 ml-4">
    <EditableAvatar
      disabled={loading}
      bind:this={avatarEditor}
      bind:direct={object.avatar}
      person={{
        avatarType: AvatarType.COLOR
      }}
      size={'large'}
      name={combineName(object?.firstName?.trim() ?? '', object?.lastName?.trim() ?? '')}
    />
    <ActionIcon
      icon={IconShuffle}
      label={recruit.string.SwapFirstAndLastNames}
      size={'medium'}
      action={swapNames}
    />
  </div>
</div> 