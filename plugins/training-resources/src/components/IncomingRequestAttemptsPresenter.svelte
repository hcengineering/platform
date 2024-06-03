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
  import { createQuery } from '@hcengineering/presentation'
  import type { TrainingRequest } from '@hcengineering/training'
  import { queryLatestOwnAttempt } from '../utils'
  import TrainingRequestMaxAttemptsPresenter from './TrainingRequestMaxAttemptsPresenter.svelte'

  export let value: TrainingRequest

  const query = createQuery()
  let attempts = 0
  $: {
    queryLatestOwnAttempt(query, value, (attempt) => {
      attempts = attempt?.seqNumber ?? 0
    })
  }
</script>

<span>{attempts}/<TrainingRequestMaxAttemptsPresenter value={value.maxAttempts} /></span>
