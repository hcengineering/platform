<script lang="ts">
  export let id: string | undefined = undefined
  export let label: string = ''
  export let title: string | undefined = undefined
  export let disabled = false
  export let loading = false
</script>

<!-- Synthetic native control: assertions cover Card's props and handlers, not the production Button's rendering. -->
<button type="button" {id} {title} {disabled} data-loading={loading} on:click>{label}</button>
