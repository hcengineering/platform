<script lang="ts" generics="T extends string">
  import Switcher from './Switcher.svelte'
  import { IModeSelector } from '../utils'

  export let props: IModeSelector
  export let kind: 'nuance' | 'subtle' = 'nuance'
  export let onlyIcons: boolean = false
  export let expansion: 'stretch' | 'default' = 'default'
  export let padding: string | undefined = undefined

  $: modeList =
    props.config != null
      ? props.config.map((c) => {
        return {
          id: c[0],
          labelIntl: c[1],
          labelParams: c[2],
          action: () => {
            props.onChange(c[0])
          }
        }
      })
      : []
</script>

{#if modeList.length > 0}
  <Switcher
    name={'modeSelector'}
    items={modeList}
    selected={props.mode}
    {kind}
    {onlyIcons}
    on:select={(result) => {
      if (result.detail !== undefined && result.detail.action) result.detail.action()
    }}
  />
{/if}
