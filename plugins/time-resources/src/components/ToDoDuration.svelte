<script lang="ts">
  import { themeStore, formatDuration } from '@hcengineering/ui'
  import { WorkSlot } from '@hcengineering/time'
  import { calculateEventsDuration } from '../utils'

  export let events: WorkSlot[]

  let duration: string
  $: formatDuration(calculateEventsDuration(events), $themeStore.language).then((res) => {
    duration = res
  })
</script>

{duration}
