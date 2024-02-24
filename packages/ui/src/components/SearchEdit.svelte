<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import EditWithIcon from './EditWithIcon.svelte'
  import IconSearch from './icons/Search.svelte'
  import plugin from '../plugin'

  export let value: string = ''
  export let width: string = '12rem'

  $: _search = value
  const dispatch = createEventDispatcher()
  let timer: any

  function restartTimer (): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      value = _search
      dispatch('change', _search)
    }, 500)
  }
  onDestroy(() => {
    clearTimeout(timer)
  })
</script>

<EditWithIcon
  icon={IconSearch}
  {width}
  placeholder={plugin.string.Search}
  bind:value={_search}
  on:change={() => {
    restartTimer()
  }}
  on:input={() => {
    restartTimer()
  }}
  on:keydown={(evt) => {
    if (evt.key === 'Enter') {
      clearTimeout(timer)
      value = _search
      dispatch('change', _search)
    }
  }}
/>
