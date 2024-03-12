<script lang="ts" generics="T extends string">
  import TabList from './TabList.svelte'
  import { IModeSelector } from '../utils'

  export let props: IModeSelector
  export let kind: 'separated' | 'separated-free' = 'separated'
  export let expansion: 'stretch' | 'default' = 'default'
  export let padding: string | undefined = undefined

  $: modeList = props.config.map((c) => {
    return {
      id: c[0],
      labelIntl: c[1],
      labelParams: c[2],
      action: () => {
        props.onChange(c[0])
      }
    }
  })
</script>

<div class="ac-header withoutBackground tabs-start full" style:padding>
  <TabList
    items={modeList}
    selected={props.mode}
    {kind}
    {expansion}
    adaptiveShrink="sm"
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.action) result.detail.action()
    }}
  />
</div>
