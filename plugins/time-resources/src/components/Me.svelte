<script lang="ts">
  import PlanView from './PlanView.svelte'

  export let visibleNav: boolean = true
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'
</script>

<div class="hulyPanels-container">
  <PlanView {visibleNav} {navFloat} {appsDirection} on:change />
</div>
