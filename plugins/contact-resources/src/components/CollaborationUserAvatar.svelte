<!--
//
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
//
-->

<script lang="ts">
  import { CollaborationUser } from '@hcengineering/text-editor'
  import { IconSize } from '@hcengineering/ui'

  import { personByPersonIdStore } from '../utils'
  import Avatar from './Avatar.svelte'

  export let user: CollaborationUser
  export let lastUpdate: number
  export let size: IconSize = 'x-small'

  let avatar: Avatar | undefined
  $: lastUpdate !== 0 && avatar?.pulse()

  $: person = $personByPersonIdStore.get(user.id)
</script>

{#if person}
  <Avatar bind:this={avatar} {size} {person} name={person.name} borderColor={user.color} />
{/if}
