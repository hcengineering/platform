<script lang="ts">
  import { translate } from '@anticrm/platform'

  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'
  import EditWithIcon from './EditWithIcon.svelte'
  import IconSearch from './icons/Search.svelte'

  export let value: string = ''

  $: _search = value
  const dispatch = createEventDispatcher()
  let placeholder = ''

  translate(ui.string.Search, {}).then((v) => {
    placeholder = v
  })
</script>

<EditWithIcon
  icon={IconSearch}
  placeholder={placeholder}
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
