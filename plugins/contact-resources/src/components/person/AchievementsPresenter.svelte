<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getMetadata } from '@hcengineering/platform'
  import { Ref } from '@hcengineering/core'
  import { Image } from '@hcengineering/ui'
  import AchievementsHeader from './AchievementsHeader.svelte'

  export let personId: Ref<Employee>
  export let withHeader: boolean = true

  const possibleAchievements = [contact.image.Achievement1, contact.image.Achievement2, contact.image.Achievement3]

  // TODO: Remove, it is just for achievements demonstration
  function hashStringToInt (str: string): number {
    let hash = 0
    if (str.length === 0) return hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to a 32-bit integer
    }
    return hash
  }

  $: personHash = hashStringToInt(personId)
  $: personAchievements = possibleAchievements.filter((_, index) => {
    return true
  })
</script>

{#if withHeader}
  <AchievementsHeader />
{/if}

<div class="achievements">
  {#each personAchievements as achievement}
    <Image src={getMetadata(achievement)} width="40px" height="60px" />
  {/each}
</div>

<style lang="scss">
  .achievements {
    display: flex;
    flex-wrap: wrap;
    padding: 10px 8px 0px 8px;

    order: 1;
  }
</style>
