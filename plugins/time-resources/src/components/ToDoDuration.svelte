<script lang="ts">
  import { themeStore } from '@hcengineering/ui'
  import { WorkSlot } from '@hcengineering/time'
  import { calculateEventsDuration, formatEventsDuration } from '../utils'

  export let events: WorkSlot[]

  let duration: string
  $: formatEventsDuration(calculateEventsDuration(events), $themeStore.language).then((res) => {
    duration = res
  })
</script>

{duration}
