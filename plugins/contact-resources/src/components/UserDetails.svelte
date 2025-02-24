<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { IconSize } from '@hcengineering/ui'
  import { Person, getName } from '@hcengineering/contact'

  import Avatar from './Avatar.svelte'

  export let person: Person
  export let avatarSize: IconSize = 'x-small'
  export let showStatus = true

  const client = getClient()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="flex-row-center" on:click>
  <Avatar {person} size={avatarSize} name={person.name} on:accent-color {showStatus} />
  <div class="flex-col min-w-0 {avatarSize === 'tiny' || avatarSize === 'inline' ? 'ml-1' : 'ml-3'}">
    <div class="label overflow-label text-left">{getName(client.getHierarchy(), person)}</div>
  </div>
</div>

<style lang="scss">
  .label {
    color: var(--global-primary-TextColor);
    font-weight: 500;
  }
</style>
