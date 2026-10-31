<script lang="ts">
  export let label = ''
  export let disabled = false
</script>

<button {disabled} on:click>{label}</button>
