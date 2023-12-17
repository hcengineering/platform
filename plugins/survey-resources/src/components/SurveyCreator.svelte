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
  import { FocusHandler, createFocusManager, EditBox } from '@hcengineering/ui'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import survey from '../plugin'
  import { createEventDispatcher } from 'svelte'
  import { DocData, fillDefaults, generateId, getCurrentAccount, type Ref } from '@hcengineering/core'
  import type { Survey } from '@hcengineering/survey'

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()
  const client = getClient()
  const object = initSurvey()

  const query = createQuery()
  query.query(survey.class.Survey, {}, (res) => {
    console.log('queried surveys', res)
  })

  function initSurvey (): DocData<Survey> {
    const hierarchy = client.getHierarchy()

    let object: DocData<Survey> = {
      name: '',
      description: '',
      private: true,
      members: [],
      questions: 0,
      archived: false
    }

    object = fillDefaults<Survey>(hierarchy, object, survey.class.Survey)

    return object
  }

  async function createSurvey (object: DocData<Survey>): Promise<Ref<Survey>> {
    const owner = getCurrentAccount()
    const id = generateId<Survey>()

    return await client.createDoc(
      survey.class.Survey,
      survey.space.Surveys,
      {
        ...object,
        questions: 0,
        description: `Survey ${object.name}`,
        members: [owner._id],
        private: true,
        archived: false
      },
      id
    )
  }
</script>

<FocusHandler {manager} />

<Card
  label={survey.string.Survey}
  canSave={object.name.length > 0}
  okAction={() => {
    void createSurvey(object)
  }}
  okLabel={survey.string.SurveyCreate}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <EditBox
    focusIndex={1}
    bind:value={object.name}
    placeholder={survey.string.SurveyNamePlaceholder}
    kind="large-style"
    autoFocus
    fullSize
  />
</Card>
