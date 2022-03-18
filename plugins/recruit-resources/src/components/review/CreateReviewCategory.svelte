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
  import core from '@anticrm/core'
  import { getClient, SpaceCreateCard } from '@anticrm/presentation'
  import { EditBox, Grid } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'
  import Review from '../icons/Review.svelte'

  const dispatch = createEventDispatcher()

  let name: string = ''
  const description: string = ''

  export function canClose (): boolean {
    return name === ''
  }

  const client = getClient()

  async function createReviewCategory () {
    await client.createDoc(recruit.class.ReviewCategory, core.space.Space, {
      name,
      description,
      private: false,
      archived: false,
      members: []
    })
  }
</script>

<SpaceCreateCard 
  label={recruit.string.CreateReviewCategory} 
  okAction={createReviewCategory}
  canSave={!!name}
  on:close={() => { dispatch('close') }}
>
  <Grid column={1} rowGap={1.5}>
    <EditBox label={recruit.string.ReviewCategoryName} bind:value={name} icon={Review} placeholder={recruit.string.ReviewCategoryPlaceholder} maxWidth={'16rem'} focus/>
  </Grid>
</SpaceCreateCard>
