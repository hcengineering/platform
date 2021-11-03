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
  import { createEventDispatcher } from 'svelte'
  import { TextArea, EditBox, ToggleWithLabel, Grid, IconFolder } from '@anticrm/ui'
  import { SpacePanel } from '@anticrm/presentation'
  import type { Ref, Space, Doc, Class } from '@anticrm/core'

  import recruit from '../plugin'

  export let _id: Ref<Doc>
  export let spaceClass: Ref<Class<Space>>

  const dispatch = createEventDispatcher()

  let name: string
  let description: string
</script>

<SpacePanel label={'Open'} 
            icon={recruit.icon.RecruitApplication}
            on:close={() => { dispatch('close') }}>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={recruit.string.CandidatesName} icon={IconFolder} bind:value={name} placeholder={'The Boring Pool'} focus/>
    <!-- <TextArea label={recruit.string.CandidatesDescription} bind:value={description}/> -->
    <ToggleWithLabel label={recruit.string.MakePrivate} description={recruit.string.MakePrivateDescription}/>
  </Grid>
</SpacePanel>
