<script lang="ts">
  import { translate } from '@hcengineering/platform'
  import { DAY, HOUR, MINUTE, themeStore } from '@hcengineering/ui'
  import { WorkSlot } from '@hcengineering/time'
  import time from '../plugin'

  export let events: WorkSlot[]

  $: duration = events.reduce((acc, curr) => acc + curr.dueDate - curr.date, 0)

  let res: string = ''

  async function formatTime (value: number) {
    res = ''
    const days = Math.floor(value / DAY)
    if (days > 0) {
      res += await translate(time.string.Days, { days }, $themeStore.language)
    }
    const hours = Math.floor((value % DAY) / HOUR)
    if (hours > 0) {
      res += ' '
      res += await translate(time.string.Hours, { hours }, $themeStore.language)
    }
    const minutes = Math.floor((value % HOUR) / MINUTE)
    if (minutes > 0) {
      res += ' '
      res += await translate(time.string.Minutes, { minutes }, $themeStore.language)
    }
    res = res.trim()
  }

  $: formatTime(duration)
</script>

{res}
