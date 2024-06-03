<script lang="ts">
  import documents, {
    DocumentTemplate,
    DocumentSection,
    DocumentTemplateSection
  } from '@hcengineering/controlled-documents'
  import { Class, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, getEventPopupPositionElement, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import Scroller from '@hcengineering/ui/src/components/Scroller.svelte'
  import SelectPopup from '@hcengineering/ui/src/components/SelectPopup.svelte'
  import SectionEditor from './SectionEditor.svelte'
  import document from '../../plugin'
  import { appendSection } from '../../utils'

  export let documentObject: DocumentTemplate
  export let readonly = false
  export let withEditing = false

  const client = getClient()

  let sections: DocumentTemplateSection[] = []
  const sectionsQuery = createQuery()
  $: sectionsQuery.query(
    documents.mixin.DocumentTemplateSection,
    { attachedTo: documentObject._id, attachedToClass: documentObject._class },
    (res) => {
      sections = res
    },
    { sort: { rank: SortingOrder.Ascending } }
  )

  async function onAddSection (evt: MouseEvent): Promise<void> {
    const hierarchy = client.getHierarchy()
    const sectionTypes = hierarchy
      .getDescendants(documents.class.DocumentSection)
      .filter((sectionDcnt) => sectionDcnt !== documents.class.DocumentSection && !hierarchy.isMixin(sectionDcnt))
      .map((sectionClass) => hierarchy.getClass(sectionClass) as Class<DocumentSection>)

    const pos = getEventPopupPositionElement(evt)
    showPopup(
      SelectPopup,
      { value: sectionTypes.map((section) => ({ id: section._id, label: section.label, icon: section.icon })) },
      pos,
      async (res) => {
        if (res != null) {
          const s = sectionTypes.find((section) => section._id === res)
          if (s !== undefined) {
            await appendSection(documentObject, s)
          }
        }
      }
    )
  }
</script>

<Scroller autoscroll>
  <div class="antiSection mr-3">
    <div class="antiSection-header">
      <div class="antiSection-header__icon">
        <Icon icon={document.icon.Document} size={'small'} />
      </div>
      <span class="antiSection-header__title"><Label label={document.string.Sections} /></span>
      {#if !readonly}
        <div class="buttons-group small-gap">
          <Button icon={IconAdd} kind="ghost" shape={'circle'} on:click={onAddSection} />
        </div>
      {/if}
    </div>
    <div class="antiAccordion mt-3">
      {#each sections as section, i}
        <SectionEditor value={section} index={i} document={documentObject} {readonly} {withEditing} />
      {/each}
    </div>
  </div>
</Scroller>
