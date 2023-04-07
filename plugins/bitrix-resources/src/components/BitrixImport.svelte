<script lang="ts">
  import { BitrixClient, BitrixEntityMapping } from '@hcengineering/bitrix'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card, createQuery } from '@hcengineering/presentation'
  import setting, { Integration } from '@hcengineering/setting'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import bitrix from '../plugin'
  import { bitrixQueue } from '../queue'
  import FieldMappingSynchronizer from './FieldMappingSynchronizer.svelte'

  const mappingQuery = createQuery()

  let mappings: BitrixEntityMapping[] = []

  mappingQuery.query(
    bitrix.class.EntityMapping,
    {},
    (res) => {
      mappings = res
    },
    {
      lookup: {
        _id: {
          fields: bitrix.class.FieldMapping
        }
      }
    }
  )
  const dispatch = createEventDispatcher()

  const q = createQuery()

  let integration: Integration | undefined

  q.query(setting.class.Integration, { type: bitrix.integrationType.Bitrix }, (res) => {
    integration = res.shift()
  })

  $: bitrixClient =
    integration !== undefined ? new BitrixClient(integration.value, (op) => bitrixQueue.add(op)) : undefined
  let loading = false
</script>

<Card
  label={getEmbeddedLabel('Bitrix Synchronization...')}
  canSave={!loading}
  fullSize={false}
  okAction={() => {
    dispatch('close')
  }}
  okLabel={getEmbeddedLabel('Close')}
  on:close
  on:changeContent
>
  {#if integration && bitrixClient}
    {#each mappings as mapping}
      <FieldMappingSynchronizer {mapping} {bitrixClient} bind:loading />
    {/each}
  {:else}
    <Label label={getEmbeddedLabel('No integration configured')} />
  {/if}
</Card>
