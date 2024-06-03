<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { TrainingRequest } from '@hcengineering/training'
  import { DocumentQuery } from '@hcengineering/core'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import type { ComponentProps } from 'svelte'
  import { getCurrentEmployeeRef } from '../utils'

  type $$Props = ComponentProps<SpecialView>
  $: ({ baseQuery, ...rest } = $$props as $$Props)

  let extendedBaseQuery: DocumentQuery<TrainingRequest>
  $: extendedBaseQuery = {
    ...((baseQuery ?? {}) as DocumentQuery<TrainingRequest>),
    trainees: getCurrentEmployeeRef(),
    canceledOn: null
  }
</script>

<SpecialView {...rest} baseQuery={extendedBaseQuery} />
