<script lang="ts">
  import TabList from './TabList.svelte'
  import { IModeSelector } from '../utils'

  export let props: IModeSelector

  $: modeList = props.config.map((c) => {
    return {
      id: c[0],
      labelIntl: c[1],
      labelParams: c[2],
      action: () => props.onChange(c[0])
    }
  })
</script>

<div class="ac-header withoutBackground tabs-start full">
  <TabList
    items={modeList}
    selected={props.mode}
    kind={'separated'}
    adaptiveShrink={'sm'}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.action) result.detail.action()
    }}
  />
</div>
