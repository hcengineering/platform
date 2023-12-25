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
  import { DirectMessage } from '@hcengineering/chunter'
  import { getClient } from '@hcengineering/presentation'
  import { Person } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'

  import { getDmPersons } from '../utils'

  export let value: DirectMessage

  const client = getClient()
  let persons: Person[] = []

  $: getDmPersons(client, value).then((res) => {
    persons = res
  })
</script>

{#each persons as person}
  {#if person}
    <div class="icon">
      <Avatar size="x-small" avatar={person.avatar} name={person.name} />
    </div>
  {/if}
{/each}
