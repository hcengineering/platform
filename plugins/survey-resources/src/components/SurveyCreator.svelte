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
  import { Card } from '@hcengineering/presentation'
  import survey from '../plugin'
  import { createEventDispatcher } from 'svelte'
  import { surveyInit } from '../functions/surveyInit'
  import { surveyCreate } from '../functions/surveyCreate'

  const manager = createFocusManager()
  const dispatch = createEventDispatcher()
  const object = surveyInit()
</script>

<FocusHandler {manager} />

<Card
  label={survey.string.Survey}
  canSave={object.name.length > 0}
  okAction={() => { void surveyCreate(object) }}
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
