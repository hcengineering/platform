<script lang="ts">
  import LineChart from './Chart/LineChart.svelte'
  export let data: { date: Date, value: number }[] = []
</script>

<div class="stats-big-card">
  <LineChart {data} />
</div>

<style lang="scss">
  .stats-big-card {
    flex: 2 0 calc(100% - 16px);
    min-width: 24rem;
    min-height: 10rem;
    padding: 20px;
    box-sizing: border-box;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;

    display: flex;

    overflow: hidden;
    word-break: break-word;
  }
</style>
