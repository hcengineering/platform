<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { TabList } from '@hcengineering/ui'

  export let mode: string
  export let config: [string, IntlString, object][]
  export let onChange: (_mode: string) => void

  $: modeList = config.map((c) => {
    return {
      id: c[0],
      labelIntl: c[1],
      labelParams: c[2],
      action: () => onChange(c[0])
    }
  })
</script>

<div class="ac-header tabs-start full divide">
  <TabList
    items={modeList}
    selected={mode}
    kind={'plain'}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.action) result.detail.action()
    }}
  />
</div>
