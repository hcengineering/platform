<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import EditWithIcon from './EditWithIcon.svelte'
  import IconSearch from './icons/Search.svelte'
  import plugin from '../plugin'

  export let value: string = ''
  export let width: string = '12rem'

  $: _search = value
  const dispatch = createEventDispatcher()
  let timer: any

  function restartTimer () {
    clearTimeout(timer)
    timer = setTimeout(() => {
      value = _search
      dispatch('change', _search)
    }, 500)
  }
</script>

<EditWithIcon
  icon={IconSearch}
  {width}
  placeholder={plugin.string.Search}
  bind:value={_search}
  on:change={() => {
    if (_search === '') {
      value = ''
      dispatch('change', '')
    }
  }}
  on:input={() => {
    restartTimer()
    if (_search === '') {
      value = ''
      dispatch('change', '')
    }
  }}
  on:keydown={(evt) => {
    if (evt.key === 'Enter') {
      value = _search
      dispatch('change', _search)
    }
  }}
/>
