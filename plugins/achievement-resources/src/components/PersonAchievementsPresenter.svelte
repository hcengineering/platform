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
  import { Doc, Ref } from '@hcengineering/core'
  import { Image } from '@hcengineering/ui'
  import { getMetadata } from '@hcengineering/platform'

  import AchievementsHeader from './AchievementsHeader.svelte'
  import { getPersonAchievements } from '../utils'

  export let personId: Ref<Doc>
  export let withHeader: boolean = true

  $: personAchievements = getPersonAchievements(personId)
</script>

{#if personAchievements.length > 0}
  {#if withHeader}
    <AchievementsHeader />
  {/if}
  <div class="achievements">
    {#each personAchievements as achievement}
      <div class="icon">
        <Image src={getMetadata(achievement.icon)} width="40px" height="60px" />
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .achievements {
    display: flex;
    flex-wrap: wrap;
    padding: 0.625rem 0.5rem 0 0.5rem;

    order: 1;
    margin-bottom: -0.5rem;
  }
</style>
