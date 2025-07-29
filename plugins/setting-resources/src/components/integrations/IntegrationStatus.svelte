<!-- IntegrationStatus.svelte -->
<script lang="ts">
  import { IntegrationStatus } from '@hcengineering/integration'

  // TODO: Add translations, standardize colors

  export let status: IntegrationStatus = 'unknown'

  // Map status to color and label
  const statusMap: Record<IntegrationStatus, { color: string, label: string }> = {
    active: { color: '#22c55e', label: 'Active' },
    inactive: { color: '#64748b', label: 'Inactive' },
    connecting: { color: '#fbbf24', label: 'Connecting' },
    disconnecting: { color: '#fbbf24', label: 'Disconnecting' },
    error: { color: '#ef4444', label: 'Error' },
    unknown: { color: '#a3a3a3', label: 'Unknown' }
  }
</script>

<span class="status-indicator" style="background-color: {statusMap[status].color};" title={statusMap[status].label}
></span>
<span class="status-label">{statusMap[status].label}</span>

<style>
  .status-indicator {
    display: inline-block;
    width: 0.9em;
    height: 0.9em;
    border-radius: 50%;
    margin-right: 0.5em;
    vertical-align: middle;
  }
  .status-label {
    vertical-align: middle;
    font-weight: 500;
    font-size: 1em;
    color: #222;
  }
</style>
