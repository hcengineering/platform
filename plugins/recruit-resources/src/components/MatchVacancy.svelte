<script lang="ts">
  import contact from '@hcengineering/contact'
  import core, { Doc, DocIndexState, FindOptions, Ref } from '@hcengineering/core'
  import presentation, {
    Card,
    createQuery,
    getClient,
    IndexedDocumentCompare,
    MessageViewer,
    SpaceSelect
  } from '@hcengineering/presentation'
  import { Applicant, ApplicantMatch, Candidate, Vacancy } from '@hcengineering/recruit'
  import { Button, IconActivity, IconAdd, Label, resizeObserver, showPopup, Spinner, tooltip } from '@hcengineering/ui'
  import Scroller from '@hcengineering/ui/src/components/Scroller.svelte'
  import { MarkupPreviewPopup, ObjectPresenter } from '@hcengineering/view-resources'
  import { calcSørensenDiceCoefficient, cosinesim } from '@hcengineering/view-resources/src/utils'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'
  import VacancyCard from './VacancyCard.svelte'
  import VacancyOrgPresenter from './VacancyOrgPresenter.svelte'

  export let objects: Candidate[] | Candidate

  $: _objects = Array.isArray(objects) ? objects : [objects]

  const orgOptions: FindOptions<Vacancy> = {
    lookup: {
      company: contact.class.Organization
    }
  }
  let _space: Ref<Vacancy> | undefined
  let vacancy: Vacancy | undefined

  const vacancyQuery = createQuery()
  $: vacancyQuery.query(recruit.class.Vacancy, { _id: _space }, (res) => {
    ;[vacancy] = res
  })

  const indexDataQuery = createQuery()
  let state: Map<Ref<Doc>, DocIndexState> = new Map()
  $: indexDataQuery.query(
    core.class.DocIndexState,
    {
      _id: {
        $in: [_space as unknown as Ref<DocIndexState>, ..._objects.map((it) => it._id as unknown as Ref<DocIndexState>)]
      }
    },
    (res) => {
      state = new Map(res.map((it) => [it._id, it] ?? []))
    }
  )

  $: vacancyState = state.get(_space as unknown as Ref<DocIndexState>)

  $: scoreState = new Map(
    _objects.map((it) => [
      it._id,
      Math.round(
        calcSørensenDiceCoefficient(state.get(it._id)?.fullSummary ?? '', vacancyState?.fullSummary ?? '') * 100
      ) / 100
    ])
  )

  $: _sortedObjects = [..._objects].sort((a, b) => (scoreState.get(b._id) ?? 0) - (scoreState.get(a._id) ?? 0))

  const matchQuery = createQuery()
  let matches: Map<Ref<Doc>, ApplicantMatch> = new Map()

  $: matchQuery.query(
    recruit.class.ApplicantMatch,
    {
      attachedTo: { $in: [..._objects.map((it) => it._id)] },
      space: _space
    },
    (res) => {
      matches = new Map(res.map((it) => [it.attachedTo, it] ?? []))
    }
  )

  const applicationQuery = createQuery()
  let applications: Map<Ref<Doc>, Applicant> = new Map()

  $: applicationQuery.query(
    recruit.class.Applicant,
    {
      attachedTo: { $in: [..._objects.map((it) => it._id)] },
      space: _space
    },
    (res) => {
      applications = new Map(res.map((it) => [it.attachedTo, it] ?? []))
    }
  )

  function getEmbedding (doc: DocIndexState): number[] | undefined {
    for (const [k, v] of Object.entries(doc.attributes)) {
      if (k.startsWith('openai_embedding_') && doc.attributes[k + '_use'] === true) {
        return v
      }
    }
  }
  $: vacancyEmbedding = vacancyState && getEmbedding(vacancyState)

  const dispatch = createEventDispatcher()

  const client = getClient()
  const matching = new Set<string>()

  async function requestMatch (doc: Candidate, docState: DocIndexState): Promise<void> {
    try {
      matching.add(doc._id)
      if (_space === undefined) {
        return
      }
      const oldMatch = matches.get(doc._id)
      if (oldMatch) {
        await client.remove(oldMatch)
      }
      await client.addCollection(recruit.class.ApplicantMatch, _space, doc._id, doc._class, 'vacancyMatch', {
        complete: false,
        vacancy: vacancyState?.fullSummary ?? '',
        summary: docState.fullSummary ?? '',
        response: ''
      })
    } finally {
      matching.delete(doc._id)
    }
  }
  async function createApplication (doc: Candidate, match?: ApplicantMatch): Promise<void> {
    showPopup(
      CreateApplication,
      {
        space: _space,
        candidate: doc._id,
        preserveCandidate: true,
        preserveVacancy: true,
        comment: match?.response ?? ''
      },
      'top'
    )
  }
  async function showSummary (left: DocIndexState, right?: DocIndexState): Promise<void> {
    showPopup(IndexedDocumentCompare, { left, right }, 'centered')
  }
</script>

<Card
  label={recruit.string.VacancyMatching}
  okLabel={presentation.string.Ok}
  on:close
  okAction={() => {}}
  canSave={true}
  on:changeContent
>
  <Scroller horizontal>
    <div
      class="flex-row flex-nowrap"
      use:resizeObserver={() => {
        dispatch('changeContent')
      }}
    >
      <div class="flex-row-center antiEmphasized">
        <div class="p-1 flex-grow">
          <SpaceSelect
            size={'large'}
            _class={recruit.class.Vacancy}
            spaceQuery={{ archived: false }}
            spaceOptions={orgOptions}
            label={recruit.string.Vacancy}
            create={{
              component: recruit.component.CreateVacancy,
              label: recruit.string.CreateVacancy
            }}
            bind:value={_space}
            on:change={(evt) => {
              _space = evt.detail
            }}
            component={VacancyOrgPresenter}
            componentProps={{ inline: true }}
          >
            <svelte:fragment slot="content">
              <VacancyCard {vacancy} disabled={true} />
            </svelte:fragment>
          </SpaceSelect>
        </div>
        <div class="p-1">
          {#if vacancy}
            <Scroller>
              <div class="flex-col max-h-60 select-text">
                {#if vacancy.description}
                  {vacancy.description}
                {/if}
                {#if vacancyState?.fullSummary}
                  <MessageViewer message={vacancyState?.fullSummary.split('\n').join('<br/>')} />
                {/if}
              </div>
            </Scroller>
          {/if}
        </div>
      </div>

      <Scroller>
        <table class="antiTable mt-2">
          <thead class="scroller-thead">
            <tr class="scroller-thead__tr">
              <td><Label label={recruit.string.Talent} /></td>
              <td><Label label={recruit.string.Score} /></td>
              <td><Label label={recruit.string.Match} /></td>
              <td>#</td>
            </tr>
          </thead>

          <tbody>
            {#each _sortedObjects as doc}
              {@const docState = state.get(doc._id)}
              {@const docEmbedding = docState && getEmbedding(docState)}
              {@const match = matches.get(doc._id)}
              {@const appl = applications.get(doc._id)}
              <tr class="antiTable-body__row">
                <td>
                  <div class="flex-row-center">
                    <ObjectPresenter objectId={doc._id} _class={doc._class} value={doc} />
                    {#if appl}
                      <div class="ml-2 flex-row-center">
                        <ObjectPresenter objectId={appl._id} _class={appl._class} value={appl} />
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="whitespace-nowrap">
                  {#if docEmbedding && vacancyEmbedding}
                    {Math.round(cosinesim(docEmbedding, vacancyEmbedding) * 100)}
                    /
                  {/if}
                  {scoreState.get(doc._id) ?? 0}
                </td>
                <td>
                  {#if match?.complete}
                    <div
                      class="lines-limit-4"
                      use:tooltip={{ component: MarkupPreviewPopup, props: { value: match.response } }}
                    >
                      <MessageViewer message={match.response} />
                    </div>
                  {/if}
                </td>
                <td class="flex-row-center gap-2">
                  {#if docState}
                    <Button
                      label={recruit.string.PerformMatch}
                      icon={matching.has(doc._id) || !(match?.complete ?? true) ? Spinner : IconActivity}
                      on:click={() => requestMatch(doc, docState)}
                    />
                    <Button
                      icon={IconActivity}
                      showTooltip={{ label: presentation.string.DocumentPreview }}
                      on:click={() => showSummary(docState, vacancyState)}
                    />
                    <Button
                      icon={IconAdd}
                      disabled={appl !== undefined}
                      showTooltip={{ label: recruit.string.CreateVacancy }}
                      on:click={() => createApplication(doc, match)}
                    />
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Scroller>
    </div>
  </Scroller>
</Card>
