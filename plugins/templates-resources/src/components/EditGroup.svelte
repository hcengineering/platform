<!--
//
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
  import { SpaceMembers } from '@hcengineering/contact-resources'
  import contact from '@hcengineering/contact-resources/src/plugin'
  import core from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { TemplateCategory } from '@hcengineering/templates'
  import { EditBox, Grid, Label } from '@hcengineering/ui'
  import { BooleanPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import templates from '../plugin'

  export let object: TemplateCategory

  const dispatch = createEventDispatcher()

  const client = getClient()
  const rawName = object.name

  async function changeName (value: string): Promise<void> {
    if (object) {
      await client.updateDoc(object._class, object.space, object._id, { name: value })
    }
  }
</script>

<Card
  label={templates.string.TemplateCategory}
  okAction={() => {
    dispatch('close')
  }}
  okLabel={presentation.string.Close}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <Grid rowGap={1}>
    <Label label={core.string.Name} />
    <div class="flex-col flex-no-shrink">
      <EditBox
        bind:value={object.name}
        on:blur={() => {
          if (rawName !== object.name) changeName(object.name)
        }}
      />
    </div>
    <Label label={core.string.Private} />
    <BooleanPresenter value={object.private} />
  </Grid>
  <div class="flex-col mt-10 flex-no-shrink">
    <span class="fs-title text-xl overflow-label mb-2 flex-no-shrink">
      <Label label={contact.string.Members} />
    </span>
    <SpaceMembers space={object} withAddButton={true} />
  </div>
</Card>
