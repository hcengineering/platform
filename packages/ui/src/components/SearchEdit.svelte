<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import EditWithIcon from './EditWithIcon.svelte'
  import IconSearch from './icons/Search.svelte'
  import plugin from '../plugin'

  export let value: string = ''

  $: _search = value
  const dispatch = createEventDispatcher()
</script>

<EditWithIcon
  icon={IconSearch}
  width={'12rem'}
  placeholder={plugin.string.Search}
  bind:value={_search}
  on:change={() => {
    if (_search === '') {
      value = ''
      dispatch('change', '')
    }
  }}
  on:input={() => {
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
