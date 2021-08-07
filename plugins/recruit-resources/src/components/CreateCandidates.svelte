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
  import { TextArea, EditBox, Dialog, ToggleWithLabel, Grid } from '@anticrm/ui'

  import { getClient } from '@anticrm/presentation'

  import recruit from '../plugin'
  import core from '@anticrm/core'

  const dispatch = createEventDispatcher()

  let name: string = ''
  let description: string = ''

  const client = getClient()

  function createCandidates() {
    client.createDoc(recruit.class.Candidates, core.space.Model, {
      name,
      description,
      private: false,
      members: []
    })
  }
</script>

<Dialog label={recruit.string.CreateCandidates} 
        okLabel={recruit.string.CreateCandidates} 
        okAction={createCandidates}
        on:close={() => { dispatch('close') }}>
  <Grid column={1}>
    <EditBox label={recruit.string.CandidatesName} bind:value={name} focus/>
    <TextArea label={recruit.string.CandidatesDescription} bind:value={description}/>
    <ToggleWithLabel label={recruit.string.MakePrivate} description={recruit.string.MakePrivateDescription}/>
  </Grid>
</Dialog>
