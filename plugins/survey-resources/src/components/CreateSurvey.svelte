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
  import { Data, generateId } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { Survey } from '@hcengineering/survey'
  import { createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import survey from '../plugin'

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()
  const client = getClient()

  let name = ''

  const id = generateId()

  export function canClose (): boolean {
    return name === ''
  }

  async function createSurvey (): Promise<void> {
    const data: Data<Survey> = {
      name,
      prompt: ''
    }

    const surveyId = await client.createDoc(survey.class.Survey, survey.space.Survey, data, id)

    dispatch('close', surveyId)
  }
</script>

<FocusHandler {manager} />

<Card
  label={survey.string.CreateSurvey}
  okAction={createSurvey}
  canSave={name.trim().length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center">
    <div class="flex-grow flex-col">
      <EditBox placeholder={survey.string.Name} bind:value={name} kind={'large-style'} autoFocus focusIndex={1} />
    </div>
  </div>
</Card>
