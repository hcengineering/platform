<script lang="ts">
  import TabList from './TabList.svelte'
  import { IModeSelector } from '../utils'
  import { getCurrentLocation } from '../location'
  import { onDestroy, onMount } from 'svelte'

  export let props: IModeSelector

  $: modeList = props.config.map((c) => {
    return {
      id: c[0],
      labelIntl: c[1],
      labelParams: c[2],
      action: () => {
        props.onChange(c[0])
        sessionStorage.setItem('last_mode', JSON.stringify(getCurrentLocation()))
      }
    }
  })
  onMount(() => {
    props.onChange(props.config[0][0])
    sessionStorage.setItem('last_mode', JSON.stringify(getCurrentLocation()))
  })

  onDestroy(() => {
    sessionStorage.removeItem('last_mode')
  })
</script>

<div class="ac-header tabs-start full">
  <TabList
    items={modeList}
    selected={props.mode}
    kind={'separated'}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.action) result.detail.action()
    }}
  />
</div>
