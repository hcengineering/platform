<script lang="ts">
  import core, { Space, WithLookup } from '@hcengineering/core'
  import { SpaceSelector, createQuery, getClient } from '@hcengineering/presentation'
  import { RelatedIssueTarget } from '@hcengineering/tracker'
  import { Button, Icon, IconArrowRight, IconDelete, Label } from '@hcengineering/ui'
  import { FixedColumn } from '@hcengineering/view-resources'
  import tracker from '../plugin'

  export let value: Space | undefined

  const targetQuery = createQuery()

  let targets: WithLookup<RelatedIssueTarget>[] = []
  $: targetQuery.query(
    tracker.class.RelatedIssueTarget,
    {},
    (res) => {
      targets = res.toSorted((a, b) => a.rule.kind.localeCompare(b.rule.kind))
    },
    {
      lookup: {
        target: tracker.class.Project
      }
    }
  )
  const client = getClient()

  $: showCreate =
    value !== undefined &&
    targets.find((it) => it.rule.kind === 'spaceRule' && it.rule.space === value?._id) === undefined
</script>

<div class="flex-col" class:p-4={value === undefined}>
  <div class="p-3">
    <Label label={tracker.string.RelatedIssueTargetDescription} />
  </div>
  {#each targets as target, i}
    <div class="flex-row p-1">
      <div class="flex-row-center bordered">
        <FixedColumn key={'rule-name'}>
          {#if target.rule.kind === 'classRule'}
            {@const documentClass = client.getHierarchy().getClass(target.rule.ofClass)}

            <div class="flex-row-center">
              <Button
                label={documentClass.label}
                icon={documentClass.icon}
                disabled={true}
                size={'medium'}
                kind={'link'}
              />
            </div>
          {:else if target.rule.kind === 'spaceRule'}
            <SpaceSelector
              label={core.string.Space}
              _class={core.class.Space}
              space={target.rule.space}
              readonly={true}
              kind={'link'}
              size={'medium'}
            />
          {/if}
        </FixedColumn>
        <span class="p-1 mr-2"> <Icon icon={IconArrowRight} size={'medium'} /> </span>

        <FixedColumn key={'space-value'}>
          <SpaceSelector
            label={tracker.string.Project}
            _class={tracker.class.Project}
            space={target.target ?? undefined}
            autoSelect={false}
            allowDeselect
            kind={'list'}
            on:change={(evt) => {
              client.update(target, { target: evt.detail || null })
            }}
          />
        </FixedColumn>
        {#if target.rule.kind === 'spaceRule'}
          <div class="flex-grow flex flex-reverse">
            <Button
              icon={IconDelete}
              on:click={() => {
                client.remove(target)
              }}
            />
          </div>
        {/if}
      </div>
    </div>
  {/each}
  {#if showCreate && value !== undefined}
    {@const space = value._id}
    <div class="flex-row-center bordered">
      <FixedColumn key={'rule-name'}>
        <SpaceSelector
          label={core.string.Space}
          _class={core.class.Space}
          space={value._id}
          readonly={true}
          kind={'link'}
          size={'medium'}
        />
      </FixedColumn>
      <span class="p-1"> => </span>

      <FixedColumn key={'space-value'}>
        <SpaceSelector
          label={tracker.string.Project}
          _class={tracker.class.Project}
          space={undefined}
          autoSelect={false}
          allowDeselect
          kind={'list'}
          on:change={(evt) => {
            client.createDoc(tracker.class.RelatedIssueTarget, space, {
              target: evt.detail || null,
              rule: {
                kind: 'spaceRule',
                space
              }
            })
          }}
        />
      </FixedColumn>
    </div>
  {/if}
</div>

<style lang="scss">
  .bordered {
    padding: 0.25rem 0.5rem;
    background-color: var(--theme-comp-header-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
  }
</style>
