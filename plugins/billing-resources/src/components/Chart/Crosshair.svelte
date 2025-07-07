<script lang="ts">
  export let xAccessorScaled
  export let yAccessorScaled
  export let xLabel
  export let yLabel
  export let innerHeight
  export let innerWidth
</script>

<g transform={`translate(${xAccessorScaled} 0)`}>
  <text class="text" y={innerHeight + 10} dy="0.8em" text-anchor="middle">
    {xLabel}
  </text>
  <line class="line" x1={0} x2={0} y1={0} y2={innerHeight} />
</g>

<g transform={`translate(0 ${yAccessorScaled})`}>
  <text class="text" dx={-10} dy="0.34em" text-anchor="end">
    {yLabel}
  </text>
  <line class="line" x1={innerWidth} x2={0} y1={0} y2={0} />
</g>

<style lang="scss">
  .text {
    fill: currentColor;
  }

  .line {
    stroke-dasharray: 4;
    stroke: currentColor;
    stroke-width: 1;
  }
</style>
