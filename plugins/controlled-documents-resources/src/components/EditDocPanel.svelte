<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Class, Doc, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Collaboration } from '@hcengineering/text-editor-resources'
  import {
    Button,
    Chevron,
    DropdownLabelsIntl,
    IconMoreV,
    Tab,
    Tabs,
    eventToHTMLElement,
    navigate,
    resolvedLocationStore,
    showPopup
  } from '@hcengineering/ui'
  import { showMenu } from '@hcengineering/view-resources'
  import documents, {
    ControlledDocument,
    ControlledDocumentState,
    DocumentRequest,
    Project
  } from '@hcengineering/controlled-documents'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { createDocumentSnapshotAndEdit, createNewDraftForControlledDoc, getDocReference } from '../docutils'
  import documentRes from '../plugin'
  import {
    $activeRightPanelTab as activeRightPanelTab,
    $availableEditorModes as availableEditorModes,
    $availableRightPanelTabs as availableRightPanelTabs,
    $canCreateNewDraft as canCreateNewDraft,
    $canCreateNewSnapshot as canCreateNewSnapshot,
    $canSendForApproval as canSendForApproval,
    $canSendForReview as canSendForReview,
    $controlledDocument as controlledDocument,
    $controlledDocumentTemplate as controlledDocumentTemplate,
    $documentLatestVersion as documentLatestVersion,
    $documentApprovalIsActive as documentApprovalIsActive,
    $documentReviewIsActive as documentReviewIsActive,
    $documentState as documentState,
    $editorMode as editorMode,
    $isDocumentOwner as isDocumentOwner,
    $isProjectEditable as isProjectEditable,
    controlledDocumentClosed,
    controlledDocumentOpened,
    editorModeUpdated,
    rightPanelTabChanged
  } from '../stores/editors/document'
  import { completeRequest, getDocumentVersionString, getLatestProjectId, rejectRequest, TeamPopupData } from '../utils'
  import DocumentDiffViewer from './document/DocumentDiffViewer.svelte'
  import DocumentHistory from './document/DocumentHistory.svelte'
  import EditDocContent from './document/EditDocContent.svelte'
  import EditDocReasonAndImpact from './document/EditDocReasonAndImpact.svelte'
  import EditDocRelease from './document/EditDocRelease.svelte'
  import EditDocTeam from './document/EditDocTeam.svelte'
  import DocumentPresenter from './document/presenters/DocumentPresenter.svelte'
  import StatePresenter from './document/presenters/StatePresenter.svelte'
  import DocumentRightPanel from './document/right-panel/DocumentRightPanel.svelte'
  import { scrollIntoSection } from './document/store'
  import DocumentVersionsPopup from './DocumentVersionsPopup.svelte'
  import SignatureDialog from './SignatureDialog.svelte'
  import TeamPopup from './TeamPopup.svelte'
  import ProjectSelector from './project/ProjectSelector.svelte'
  import DocumentTemplateHeader from './print/DocumentTemplateHeader.svelte'
  import DocumentTemplateFooter from './print/DocumentTemplateFooter.svelte'
  import { getProjectDocumentLink } from '../navigation'

  export let _id: Ref<ControlledDocument>
  export let _class: Ref<Class<ControlledDocument>>
  export let project: Ref<Project> = documents.ids.NoProject
  export let embedded: boolean = false
  export let withClose: boolean = true

  let lastId: Ref<Doc> = _id

  const dispatch = createEventDispatcher()
  const client = getClient()

  let innerWidth: number
  let isTitlePressed: boolean = false
  let creating: boolean = false

  const notificationClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      void notificationClient.then((client) => client.readDoc(prev))
    }
  }

  onDestroy(async () => {
    controlledDocumentClosed()
    void notificationClient.then((client) => client.readDoc(_id))
  })

  $: if (_id && _class && project) {
    controlledDocumentOpened({ _id, _class, project })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name'] })
  })

  let tabs: Tab[]

  $: tabs = [
    {
      label: documentRes.string.ContentTab,
      component: EditDocContent,
      props: {}
    },
    {
      label: documentRes.string.ReasonAndImpact,
      component: EditDocReasonAndImpact,
      props: {}
    },
    {
      label: documentRes.string.TeamTab,
      component: EditDocTeam,
      props: { controlledDoc: $controlledDocument, editable: $isDocumentOwner }
    },
    {
      label: documentRes.string.ReleaseTab,
      component: EditDocRelease,
      props: {}
    },
    {
      label: documentRes.string.HistoryTab,
      component: DocumentHistory,
      props: {}
    }
  ]

  let selectedTab = 0

  $: if ($scrollIntoSection !== undefined) {
    selectedTab = tabs.findIndex((tab) => tab.label === documentRes.string.ContentTab)
  }

  function onSendDocRequest (requestClass: Ref<Class<DocumentRequest>>): void {
    if ($controlledDocument == null) {
      return
    }

    const teamPopupData: TeamPopupData = {
      controlledDoc: $controlledDocument,
      requestClass,
      requireSignature: true
    }

    showPopup(TeamPopup, teamPopupData, 'center')
  }

  async function completeReviewRequest (ev: MouseEvent): Promise<void> {
    showPopup(
      SignatureDialog,
      { confirmationTitle: documentRes.string.ConfirmReviewCompletion },
      eventToHTMLElement(ev),
      async (res) => {
        if (!res) return

        if (!$controlledDocument || $documentState !== ControlledDocumentState.InReview) {
          return
        }

        await completeRequest(client, documents.class.DocumentReviewRequest, $controlledDocument)
      }
    )
  }

  async function changeApprovalRequestState (ev: MouseEvent, isRejection: boolean): Promise<void> {
    showPopup(SignatureDialog, { isRejection }, eventToHTMLElement(ev), async (res) => {
      if (!res) return

      if (!$controlledDocument || $documentState !== ControlledDocumentState.InApproval) {
        return
      }

      const { rejectionNote } = res

      if (isRejection && rejectionNote == null) {
        return
      }

      const reqClass = documents.class.DocumentApprovalRequest

      if (isRejection && rejectionNote != null) {
        await rejectRequest(client, reqClass, $controlledDocument, rejectionNote)
      } else if (!isRejection) {
        await completeRequest(client, reqClass, $controlledDocument)
      }
    })
  }

  async function onCreateNewDraft (): Promise<void> {
    if (creating) {
      return
    }

    creating = true
    try {
      if ($controlledDocument != null && $canCreateNewDraft && $documentLatestVersion != null) {
        const latest = $documentLatestVersion
        const version = { major: latest.major, minor: latest.minor + 1 }
        const project = await getLatestProjectId($controlledDocument.space)

        if (project !== undefined) {
          try {
            const { id, success } = await createNewDraftForControlledDoc(
              client,
              $controlledDocument,
              $controlledDocument.space,
              version,
              project
            )
            if (success) {
              const loc = getProjectDocumentLink(id, project)
              navigate(loc)
            }
          } catch (err) {
            await setPlatformStatus(unknownError(err))
          }
        } else {
          console.warn('No document project found for space', $controlledDocument.space)
        }
      } else {
        console.warn('Unexpected document state', $documentState)
      }
    } finally {
      creating = false
    }
  }

  async function onEditDocument (): Promise<void> {
    if ($controlledDocument != null && $canCreateNewSnapshot && $isProjectEditable) {
      try {
        await createDocumentSnapshotAndEdit(client, $controlledDocument)
      } catch (err) {
        await setPlatformStatus(unknownError(err))
      }
    } else {
      console.warn('Unexpected document state', $documentState)
    }
  }

  let titleElement: HTMLElement
  function showVersions (): void {
    isTitlePressed = true
    showPopup(DocumentVersionsPopup, {}, titleElement, () => {
      isTitlePressed = false
    })
  }

  $: canShowSidebar = $editorMode !== 'comparing'
  $: sideBar = canShowSidebar ? $availableRightPanelTabs : []

  $: workspace = $resolvedLocationStore.path[1].toUpperCase()

  $: docReference = getDocReference($controlledDocument)
  $: templateReference = getDocReference($controlledDocumentTemplate)

  $: attribute = {
    key: 'content',
    attr: client.getHierarchy().getAttribute(documents.class.ControlledDocument, 'content')
  }
</script>

{#if $controlledDocument !== null && attribute !== undefined}
  <Panel
    bind:innerWidth
    isHeader={false}
    object={$controlledDocument}
    customAside={sideBar}
    isAside={canShowSidebar}
    isSub={false}
    selectedAside={$activeRightPanelTab ?? false}
    withoutActivity
    contentClasses="h-full flex-col"
    withoutContentScroll
    allowClose={withClose && !embedded}
    {embedded}
    printHeader={false}
    adaptive={'autoExtra'}
    overflowExtra
    hideSearch
    on:close
    on:select={(ev) => rightPanelTabChanged(ev.detail)}
  >
    <svelte:fragment slot="title">
      <div class="flex-row-center">
        {#if project !== documents.ids.NoProject}
          <ProjectSelector
            value={project}
            space={$controlledDocument.space}
            kind={'ghost'}
            size={'medium'}
            justify={'left'}
            disabled
            on:change={(e) => {
              project = e.detail
            }}
          />
        {/if}
        <button
          bind:this={titleElement}
          class:pressed={isTitlePressed}
          class="version-item flex-row-center"
          on:click={showVersions}
        >
          <span class="name mr-1-5 fs-title">
            <DocumentPresenter inline={true} value={$controlledDocument} disableLink />
            {$controlledDocument.title}
          </span>
          <span class="version mr-1-5 fs-title">{getDocumentVersionString($controlledDocument)}</span>
          <StatePresenter value={$controlledDocument} />
          <Chevron outline expanded />
        </button>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="extra">
      <div class="flex flex-gap-1 no-print">
        {#if $isProjectEditable}
          {#if $isDocumentOwner && !$documentReviewIsActive && !$documentApprovalIsActive}
            {#if $canSendForReview}
              <Button
                label={documentRes.string.SendForReview}
                kind="regular"
                size="medium"
                on:click={() => {
                  onSendDocRequest(documents.class.DocumentReviewRequest)
                }}
              />
            {/if}
            {#if $canSendForApproval}
              <Button
                label={documentRes.string.SendForApproval}
                kind="regular"
                size="medium"
                on:click={() => {
                  onSendDocRequest(documents.class.DocumentApprovalRequest)
                }}
              />
            {/if}

            {#if $canCreateNewDraft}
              <Button
                label={documentRes.string.CreateNewDraft}
                kind="regular"
                loading={creating}
                disabled={creating}
                on:click={onCreateNewDraft}
              />
            {:else if $canCreateNewSnapshot}
              <Button label={documentRes.string.EditDocument} kind="regular" on:click={onEditDocument} />
            {/if}
          {:else if $documentReviewIsActive}
            <Button
              label={documentRes.string.CompleteReview}
              kind="positive"
              on:click={(ev) => completeReviewRequest(ev)}
            />
          {:else if $documentApprovalIsActive}
            <Button
              label={documentRes.string.Reject}
              kind="negative"
              on:click={(ev) => changeApprovalRequestState(ev, true)}
            />
            <Button
              label={documentRes.string.Approve}
              kind="positive"
              on:click={(ev) => changeApprovalRequestState(ev, false)}
            />
          {/if}
        {/if}

        <DropdownLabelsIntl
          size="medium"
          selected={$editorMode}
          items={$availableEditorModes}
          disabled={$availableEditorModes.length <= 1}
          on:selected={(event) => {
            const mode = event.detail
            if (mode !== $editorMode) {
              editorModeUpdated(event.detail)
            }
          }}
        />
      </div>
    </svelte:fragment>
    <svelte:fragment slot="post-utils">
      <div class="no-print ml-1">
        <Button
          icon={IconMoreV}
          iconProps={{ size: 'medium' }}
          kind="icon"
          size="medium"
          on:click={(e) => {
            if ($controlledDocument == null) return
            showMenu(e, { object: $controlledDocument })
          }}
        />
      </div>
    </svelte:fragment>

    <svelte:component
      this={DocumentTemplateHeader}
      slot="page-header"
      {workspace}
      title={$controlledDocument.title}
      reference={docReference}
    />

    <svelte:component this={DocumentTemplateFooter} slot="page-footer" {templateReference} />

    <Collaboration object={$controlledDocument} {attribute}>
      {#if $editorMode === 'comparing'}
        <DocumentDiffViewer />
      {:else}
        <Tabs model={tabs} bind:selected={selectedTab} size={'large'} padding="0 1.5rem" noMargin />
      {/if}
    </Collaboration>
    <svelte:fragment slot="custom-attributes">
      <DocumentRightPanel />
    </svelte:fragment>
  </Panel>
{/if}

<style lang="scss">
  .version-item {
    padding: 0.375rem 0.25rem 0.375rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 1rem;
    cursor: pointer;

    .name {
      white-space: nowrap;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .version {
      font-weight: 500;
      opacity: 0.6;
    }

    &.pressed {
      background-color: var(--theme-button-pressed);
    }

    &:hover {
      background-color: var(--theme-button-hovered);
    }
  }
</style>
