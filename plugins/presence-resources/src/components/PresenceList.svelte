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
  import { Person, formatName } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'
  import { IconSize, Scroller } from '@hcengineering/ui'

  export let persons: Person[]
  export let size: IconSize
</script>

<Scroller padding={'.25rem'} gap={'flex-gap-2'}>
  {#each persons as person}
    <div class="flex-row-center flex-no-shrink flex-gap-2">
      <div class="min-w-6">
        <Avatar name={person.name} {size} {person} />
      </div>
      {formatName(person.name)}
    </div>
  {/each}
</Scroller>
