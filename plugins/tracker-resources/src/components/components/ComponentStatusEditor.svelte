<script lang="ts">
  import { Component } from '@hcengineering/tracker'
  import ComponentStatusPresenter from './ComponentStatusPresenter.svelte'

  export let object: Component
</script>

<ComponentStatusPresenter value={object} shouldShowLabel />
