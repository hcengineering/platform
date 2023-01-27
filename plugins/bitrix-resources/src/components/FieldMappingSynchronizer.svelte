<script lang="ts">
  import {
    BitrixClient,
    BitrixEntityMapping,
    BitrixFieldMapping,
    performSynchronization,
    toClassRef
  } from '@hcengineering/bitrix'
  import contact from '@hcengineering/contact'
  import core, { Class, Doc, Ref, Space, WithLookup } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import { getClient, SpaceSelect } from '@hcengineering/presentation'
  import { Button, Expandable, Icon, Label } from '@hcengineering/ui'
  import DropdownLabels from '@hcengineering/ui/src/components/DropdownLabels.svelte'
  import { NumberEditor } from '@hcengineering/view-resources'
  import FieldMappingPresenter from './FieldMappingPresenter.svelte'

  export let mapping: WithLookup<BitrixEntityMapping>
  export let bitrixClient: BitrixClient

  const client = getClient()

  $: fieldMapping = (mapping.$lookup?.fields as BitrixFieldMapping[]) ?? []
  $: fieldsByClass = fieldMapping.reduce((p, c) => {
    p[c.ofClass] = [...(p[c.ofClass] ?? []), c]
    return p
  }, {} as Record<Ref<Class<Doc>>, BitrixFieldMapping[]>)

  let direction: 'ASC' | 'DSC' = 'ASC'
  let limit = 1
  let space: Ref<Space> | undefined

  export let loading = false
  let state = ''

  let docsProcessed = 0

  async function doSync (): Promise<void> {
    loading = true
    const uploadUrl = (window.location.origin + getMetadata(login.metadata.UploadUrl)) as string
    const token = (getMetadata(login.metadata.LoginToken) as string) ?? ''
    try {
      await performSynchronization({
        bitrixClient,
        client,
        direction,
        limit,
        space,
        mapping,
        loginInfo: {
          token,
          email: '',
          endpoint: ''
        },
        frontUrl: uploadUrl,
        monitor: (total: number) => {
          docsProcessed++
          state = `processed: ${docsProcessed}/${total ?? 1}`
        }
      })
    } catch (err: any) {
      state = err.message
      console.error(err)
    } finally {
      loading = false
    }
  }
</script>

<Expandable label={getEmbeddedLabel(mapping.type)}>
  <svelte:fragment slot="tools">
    <SpaceSelect
      _class={core.class.Space}
      label={core.string.Space}
      bind:value={space}
      on:change={(evt) => {
        space = evt.detail
      }}
      autoSelect
      spaceQuery={{ _id: { $in: [contact.space.Contacts] } }}
    />
    <DropdownLabels
      label={getEmbeddedLabel('Direction')}
      items={[
        { id: 'ASC', label: 'Ascending' },
        { id: 'DSC', label: 'Descending' }
      ]}
      bind:selected={direction}
    />
    <div class="fs-title">
      <NumberEditor
        kind={'button'}
        value={limit}
        focus={false}
        placeholder={getEmbeddedLabel('Limit')}
        onChange={(val) => {
          if (val) {
            limit = val
          }
        }}
      />
    </div>
    <div class="buttons-divider" />
    <div class="flex-row-center">
      <div class="p-1">
        {state}
      </div>
      <Button size={'large'} label={getEmbeddedLabel('Synchronize')} {loading} on:click={doSync} />
    </div>
  </svelte:fragment>
  <div class="flex-row flex-grow bottom-divider p-2">
    {#each Object.entries(fieldsByClass) as field, i}
      {@const cl = client.getHierarchy().getClass(toClassRef(field[0]))}
      <div class="fs-title flex-row-center">
        {#if cl.icon}
          <div class="mr-1">
            <Icon icon={cl.icon} size={'large'} />
          </div>
        {/if}
        <Label label={cl.label} />
      </div>
      <div class="flex-row">
        {#each field[1] as cfield, i}
          <div class="fs-title flex-row-center ml-4">
            {i + 1}.
            <FieldMappingPresenter {mapping} value={cfield} />
          </div>
        {/each}
      </div>
    {/each}
  </div>
</Expandable>
