<script lang="ts">
  export let content: any
</script>

<pre>
  {JSON.stringify(content, undefined, 2)}
</pre>

<style lang="scss">
  pre {
    overflow: auto;
    max-height: 500px;
  }
</style>
