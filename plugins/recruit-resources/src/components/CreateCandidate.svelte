<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import attachment from '@hcengineering/attachment'
  import { deleteFile } from '@hcengineering/attachment-resources/src/utils'
  import contact, { Channel, ChannelProvider, combineName, findContacts, Person } from '@hcengineering/contact'
  import { ChannelsDropdown } from '@hcengineering/contact-resources'
  import PersonPresenter from '@hcengineering/contact-resources/src/components/PersonPresenter.svelte'
  import {
    Account,
    AttachedData,
    Data,
    Doc,
    generateId,
    MixinData,
    Ref,
    toIdMap,
    TxProcessor,
    WithLookup
  } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getMetadata, getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import {
    Card,
    createQuery,
    EditableAvatar,
    getClient,
    getUserDraft,
    InlineAttributeBar,
    KeyedAttribute,
    MessageBox,
    PDFViewer,
    updateUserDraft
  } from '@hcengineering/presentation'
  import type { Candidate, CandidateDraft } from '@hcengineering/recruit'
  import { recognizeDocument } from '@hcengineering/rekoni'
  import tags, { findTagCategory, TagElement, TagReference } from '@hcengineering/tags'
  import {
    Button,
    Component,
    createFocusManager,
    EditBox,
    FocusHandler,
    getColorNumberByText,
    IconFile as FileIcon,
    IconInfo,
    Label,
    Link,
    showPopup,
    Spinner
  } from '@hcengineering/ui'
  import deepEqual from 'deep-equal'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import FileUpload from './icons/FileUpload.svelte'
  import YesNo from './YesNo.svelte'

  export let shouldSaveDraft: boolean = false
  export let onDraftChanged: () => void

  const draft: CandidateDraft | undefined = shouldSaveDraft ? getUserDraft(recruit.mixin.Candidate) : undefined
  const emptyObject = {
    title: undefined,
    city: '',
    avatar: undefined,
    onsite: undefined,
    remote: undefined
  }
  type resumeFile = {
    name: string
    uuid: string
    size: number
    type: string
    lastModified: number
  }

  let candidateId = draft ? draft.candidateId : generateId()
  let firstName = draft?.firstName || ''
  let lastName = draft?.lastName || ''
  let createMore: boolean = false
  let saveTimer: number | undefined

  export function canClose (): boolean {
    return true
  }

  let avatarEditor: EditableAvatar

  function toCandidate (draft: CandidateDraft | undefined): Candidate {
    if (!draft) {
      return emptyObject as Candidate
    }
    return {
      title: draft?.title || '',
      city: draft?.city || '',
      onsite: draft?.onsite,
      remote: draft?.remote
    } as Candidate
  }

  const object: Candidate = toCandidate(draft)

  function resumeDraft () {
    return {
      uuid: draft?.resumeUuid,
      name: draft?.resumeName,
      size: draft?.resumeSize,
      type: draft?.resumeType,
      lastModified: draft?.resumeLastModified
    }
  }

  let resume = resumeDraft() as resumeFile

  const dispatch = createEventDispatcher()
  const client = getClient()

  let inputFile: HTMLInputElement
  let loading = false
  let dragover = false

  let avatar: File | undefined = draft?.avatar
  let channels: AttachedData<Channel>[] = draft?.channels || []

  let matches: WithLookup<Person>[] = []
  let matchedChannels: AttachedData<Channel>[] = []

  let skills: TagReference[] = draft?.skills || []
  const key: KeyedAttribute = {
    key: 'skills',
    attr: client.getHierarchy().getAttribute(recruit.mixin.Candidate, 'skills')
  }

  let elements = new Map<Ref<TagElement>, TagElement>()
  let namedElements = new Map<string, TagElement>()

  const newElements: TagElement[] = []

  const elementQuery = createQuery()
  let elementsPromise: Promise<void>
  $: elementsPromise = new Promise((resolve) => {
    elementQuery.query(tags.class.TagElement, {}, (result) => {
      const ne = new Map<Ref<TagElement>, TagElement>()
      const nne = new Map<string, TagElement>()
      for (const t of newElements.concat(result)) {
        ne.set(t._id, t)
        nne.set(t.title.trim().toLowerCase(), t)
      }
      elements = ne
      namedElements = nne
      resolve()
    })
  })

  $: updateDraft(object, firstName, lastName, avatar, channels, skills, resume)

  async function updateDraft (...param: any) {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveDraft()
    }, 200)
  }

  async function saveDraft () {
    if (!shouldSaveDraft) {
      return
    }

    let newDraft: Data<CandidateDraft> | undefined = createDraftFromObject()
    const isEmpty = await isDraftEmpty(newDraft)

    if (isEmpty) {
      newDraft = undefined
    }

    updateUserDraft(recruit.mixin.Candidate, newDraft)

    if (onDraftChanged) {
      return onDraftChanged()
    }
  }

  function createDraftFromObject () {
    const newDraft: Data<CandidateDraft> = {
      candidateId: candidateId as Ref<Candidate>,
      firstName,
      lastName,
      title: object.title,
      city: object.city,
      resumeUuid: resume?.uuid,
      resumeName: resume?.name,
      resumeType: resume?.type,
      resumeSize: resume?.size,
      resumeLastModified: resume?.lastModified,
      avatar,
      channels,
      onsite: object.onsite,
      remote: object.remote,
      skills
    }

    return newDraft
  }

  async function isDraftEmpty (draft: Data<CandidateDraft>): Promise<boolean> {
    const emptyDraft: Partial<CandidateDraft> = {
      firstName: '',
      lastName: '',
      title: undefined,
      city: '',
      resumeUuid: undefined,
      resumeName: undefined,
      resumeType: undefined,
      resumeSize: undefined,
      resumeLastModified: undefined,
      avatar: undefined,
      channels: [],
      onsite: undefined,
      remote: undefined,
      skills: []
    }

    for (const key of Object.keys(emptyDraft)) {
      if (!deepEqual((emptyDraft as any)[key], (draft as any)[key])) {
        return false
      }
    }

    return true
  }

  async function createCandidate () {
    const candidate: Data<Person> = {
      name: combineName(firstName, lastName),
      city: object.city,
      createOn: Date.now()
    }
    if (avatar !== undefined) {
      candidate.avatar = await avatarEditor.createAvatar()
    }
    const candidateData: MixinData<Person, Candidate> = {
      title: object.title,
      onsite: object.onsite,
      remote: object.remote
    }

    // Store all extra values.
    for (const [k, v] of Object.entries(object)) {
      if (v != null && k !== 'createOn' && k !== 'avatar') {
        if (client.getHierarchy().getAttribute(recruit.mixin.Candidate, k).attributeOf === recruit.mixin.Candidate) {
          ;(candidateData as any)[k] = v
        } else {
          ;(candidate as any)[k] = v
        }
      }
    }

    const applyOps = client.apply(candidateId)

    await applyOps.createDoc(contact.class.Person, contact.space.Contacts, candidate, candidateId)
    await applyOps.createMixin(
      candidateId as Ref<Person>,
      contact.class.Person,
      contact.space.Contacts,
      recruit.mixin.Candidate,
      candidateData
    )

    if (resume.uuid !== undefined) {
      applyOps.addCollection(
        attachment.class.Attachment,
        contact.space.Contacts,
        candidateId,
        contact.class.Person,
        'attachments',
        {
          name: resume.name,
          file: resume.uuid,
          size: resume.size,
          type: resume.type,
          lastModified: resume.lastModified
        }
      )
    }
    for (const channel of channels) {
      await applyOps.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        candidateId,
        contact.class.Person,
        'channels',
        {
          value: channel.value,
          provider: channel.provider
        }
      )
    }

    const categories = await client.findAll(tags.class.TagCategory, { targetClass: recruit.mixin.Candidate })
    // Tag elements
    const skillTagElements = toIdMap(
      await client.findAll(tags.class.TagElement, { _id: { $in: skills.map((it) => it.tag) } })
    )
    for (const skill of skills) {
      // Create update tag if missing
      if (!skillTagElements.has(skill.tag)) {
        skill.tag = await client.createDoc(tags.class.TagElement, skill.space, {
          title: skill.title,
          color: skill.color,
          targetClass: recruit.mixin.Candidate,
          description: '',
          category: findTagCategory(skill.title, categories)
        })
      }
      await applyOps.addCollection(skill._class, skill.space, candidateId, recruit.mixin.Candidate, 'skills', {
        title: skill.title,
        color: skill.color,
        tag: skill.tag,
        weight: skill.weight
      })
    }

    await applyOps.commit()

    if (!createMore) {
      dispatch('close', candidateId)
    }
    resetObject()
    saveDraft()
  }

  function isUndef (value?: string): boolean {
    return value === undefined || value === ''
  }

  function addChannel (channels: AttachedData<Channel>[], type: Ref<ChannelProvider>, value?: string): void {
    if (value !== undefined) {
      const provider = channels.find((e) => e.provider === type)
      if (provider === undefined) {
        channels.push({
          provider: type,
          value
        })
      } else {
        if (isUndef(provider.value)) {
          provider.value = value
        }
      }
    }
  }

  async function recognize (file: File): Promise<void> {
    const token = getMetadata(login.metadata.LoginToken) ?? ''

    try {
      const doc = await recognizeDocument(token, file)

      if (isUndef(object.title) && doc.title !== undefined) {
        object.title = doc.title
      }

      if (isUndef(firstName) && doc.firstName !== undefined) {
        firstName = doc.firstName
      }

      if (isUndef(lastName) && doc.lastName !== undefined) {
        lastName = doc.lastName
      }

      if (isUndef(object.city) && doc.city !== undefined) {
        object.city = doc.city
      }

      if (!object.avatar && doc.avatar !== undefined) {
        // We had avatar, let's try to upload it.
        const data = atob(doc.avatar)
        let n = data.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = data.charCodeAt(n)
        }
        avatar = new File([u8arr], doc.avatarName ?? 'avatar.png', { type: doc.avatarFormat ?? 'image/png' })
      }

      const newChannels = [...channels]
      addChannel(newChannels, contact.channelProvider.Email, doc.email)
      addChannel(newChannels, contact.channelProvider.GitHub, doc.github)
      addChannel(newChannels, contact.channelProvider.LinkedIn, doc.linkedin)
      addChannel(newChannels, contact.channelProvider.Phone, doc.phone)
      addChannel(newChannels, contact.channelProvider.Telegram, doc.telegram)
      addChannel(newChannels, contact.channelProvider.Twitter, doc.twitter)
      addChannel(newChannels, contact.channelProvider.Facebook, doc.facebook)
      channels = newChannels

      // Create skills
      await elementsPromise

      const categories = await client.findAll(tags.class.TagCategory, { targetClass: recruit.mixin.Candidate })
      const categoriesMap = toIdMap(categories)

      const newSkills: TagReference[] = []

      // Create missing tag elemnts
      for (const s of doc.skills ?? []) {
        const title = s.trim().toLowerCase()
        let e = namedElements.get(title)
        if (e === undefined) {
          // No yet tag with title
          const category = findTagCategory(s, categories)
          const cinstance = categoriesMap.get(category)
          e = TxProcessor.createDoc2Doc(
            client.txFactory.createTxCreateDoc(tags.class.TagElement, tags.space.Tags, {
              title,
              description: `Imported skill ${s} of ${cinstance?.label ?? ''}`,
              color: getColorNumberByText(s),
              targetClass: recruit.mixin.Candidate,
              category
            })
          )
          namedElements.set(title, e)
          elements.set(e._id, e)
          newElements.push(e)
        }
        newSkills.push(
          TxProcessor.createDoc2Doc(
            client.txFactory.createTxCreateDoc(tags.class.TagReference, tags.space.Tags, {
              title: e.title,
              color: e.color,
              tag: e._id,
              attachedTo: '' as Ref<Doc>,
              attachedToClass: recruit.mixin.Candidate,
              collection: 'skills'
            })
          )
        )
      }
      skills = [...skills, ...newSkills]
    } catch (err: any) {
      console.error(err)
    }
  }

  async function deleteResume (): Promise<void> {
    if (resume.uuid) {
      try {
        await deleteFile(resume.uuid)
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function createAttachment (file: File) {
    loading = true
    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)

      resume.uuid = await uploadFile(file)
      resume.name = file.name
      resume.size = file.size
      resume.type = file.type
      resume.lastModified = file.lastModified

      await recognize(file)
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    } finally {
      loading = false
    }
  }

  function drop (event: DragEvent) {
    dragover = false
    const droppedFile = event.dataTransfer?.files[0]
    if (droppedFile !== undefined) {
      createAttachment(droppedFile)
    }
  }

  function fileSelected () {
    console.log(inputFile.files)
    const file = inputFile.files?.[0]
    if (file !== undefined) {
      createAttachment(file)
    }
    manager.setFocusPos(102)
  }

  function addTagRef (tag: TagElement): void {
    skills = [
      ...skills,
      {
        _class: tags.class.TagReference,
        _id: generateId() as Ref<TagReference>,
        attachedTo: '' as Ref<Doc>,
        attachedToClass: recruit.mixin.Candidate,
        collection: 'skills',
        space: tags.space.Tags,
        modifiedOn: 0,
        modifiedBy: '' as Ref<Account>,
        title: tag.title,
        tag: tag._id,
        color: tag.color
      }
    ]
  }

  $: findContacts(
    client,
    contact.class.Person,
    { ...object, name: combineName(firstName.trim(), lastName.trim()) },
    channels
  ).then((p) => {
    matches = p.contacts
    matchedChannels = p.channels
  })

  const manager = createFocusManager()

  function resetObject (): void {
    candidateId = generateId()
    avatar = undefined
    firstName = ''
    lastName = ''
    channels = []
    skills = []
    resume = {} as resumeFile
    object.title = undefined
    object.city = ''
    object.avatar = undefined
    object.onsite = undefined
    object.remote = undefined
  }

  export async function onOutsideClick () {
    saveDraft()

    if (onDraftChanged) {
      return onDraftChanged()
    }
  }

  async function showConfirmationDialog () {
    const newDraft = createDraftFromObject()
    const isFormEmpty = await isDraftEmpty(newDraft)

    if (isFormEmpty) {
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: recruit.string.CreateTalentDialogClose,
          message: recruit.string.CreateTalentDialogCloseNote
        },
        'top',
        (result?: boolean) => {
          if (result === true) {
            dispatch('close')
            deleteResume()
            resetObject()
            saveDraft()
          }
        }
      )
    }
  }
</script>

<FocusHandler {manager} />

<Card
  label={recruit.string.CreateTalent}
  okAction={createCandidate}
  canSave={!loading && (firstName.length > 0 || lastName.length > 0 || channels.length > 0)}
  on:close={() => {
    dispatch('close')
  }}
  onCancel={showConfirmationDialog}
  bind:createMore
>
  <svelte:fragment slot="header">
    <Button
      icon={contact.icon.Person}
      label={contact.string.Person}
      size={'small'}
      kind={'no-border'}
      disabled
      on:click={() => {}}
    />
  </svelte:fragment>
  <div class="flex-between">
    <div class="flex-col">
      <EditBox
        disabled={loading}
        placeholder={recruit.string.PersonFirstNamePlaceholder}
        bind:value={firstName}
        kind={'large-style'}
        focus
        maxWidth={'30rem'}
        focusIndex={1}
      />
      <EditBox
        disabled={loading}
        placeholder={recruit.string.PersonLastNamePlaceholder}
        bind:value={lastName}
        maxWidth={'30rem'}
        kind={'large-style'}
        focusIndex={2}
      />
      <div class="mt-1">
        <EditBox
          disabled={loading}
          placeholder={recruit.string.Title}
          bind:value={object.title}
          kind={'small-style'}
          focusIndex={3}
          maxWidth={'30rem'}
        />
      </div>
      <EditBox
        disabled={loading}
        placeholder={recruit.string.Location}
        bind:value={object.city}
        kind={'small-style'}
        focusIndex={4}
        maxWidth={'30rem'}
      />
    </div>
    <div class="ml-4">
      <EditableAvatar
        disabled={loading}
        bind:this={avatarEditor}
        bind:direct={avatar}
        avatar={object.avatar}
        id={candidateId}
        size={'large'}
      />
    </div>
  </div>
  <svelte:fragment slot="pool">
    <ChannelsDropdown
      editable={!loading}
      focusIndex={10}
      bind:value={channels}
      highlighted={matchedChannels.map((it) => it.provider)}
    />
    <YesNo
      disabled={loading}
      focusIndex={100}
      label={recruit.string.Onsite}
      tooltip={recruit.string.WorkLocationPreferences}
      bind:value={object.onsite}
    />
    <YesNo
      disabled={loading}
      focusIndex={101}
      label={recruit.string.Remote}
      tooltip={recruit.string.WorkLocationPreferences}
      bind:value={object.remote}
    />
    <Component
      is={tags.component.TagsDropdownEditor}
      props={{
        disabled: loading,
        focusIndex: 102,
        items: skills,
        key,
        targetClass: recruit.mixin.Candidate,
        showTitle: false,
        elements,
        newElements,
        countLabel: recruit.string.NumberSkills
      }}
      on:open={(evt) => {
        addTagRef(evt.detail)
      }}
      on:delete={(evt) => {
        skills = skills.filter((it) => it._id !== evt.detail)
      }}
    />
    {#if skills.length > 0}
      <div class="flex-break" />
      <div class="antiComponent antiEmphasized flex-grow mt-2">
        <Component
          is={tags.component.TagsEditor}
          props={{
            disabled: loading,
            focusIndex: 102,
            items: skills,
            key,
            targetClass: recruit.mixin.Candidate,
            showTitle: false,
            elements,
            newElements,
            countLabel: recruit.string.NumberSkills
          }}
          on:open={(evt) => {
            addTagRef(evt.detail)
          }}
          on:delete={(evt) => {
            skills = skills.filter((it) => it._id !== evt.detail)
          }}
          on:change={(evt) => {
            evt.detail.tag.weight = evt.detail.weight
            skills = skills
          }}
        />
      </div>
    {/if}
    <div class="flex flex-grow flex-wrap">
      <InlineAttributeBar
        _class={recruit.mixin.Candidate}
        {object}
        toClass={contact.class.Contact}
        ignoreKeys={['onsite', 'remote']}
        extraProps={{ showNavigate: false }}
      />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <div
      class="flex-center resume"
      class:solid={dragover || resume.uuid}
      on:dragover|preventDefault={() => {
        dragover = true
      }}
      on:dragleave={() => {
        dragover = false
      }}
      on:drop|preventDefault|stopPropagation={drop}
    >
      {#if loading && resume.uuid}
        <Link label={recruit.string.Parsing} icon={Spinner} disabled />
      {:else}
        {#if loading}
          <Link label={recruit.string.Uploading} icon={Spinner} disabled />
        {:else if resume.uuid}
          <Button
            disabled={loading}
            kind={'transparent'}
            focusIndex={103}
            icon={FileIcon}
            on:click={() => {
              showPopup(
                PDFViewer,
                { file: resume.uuid, name: resume.name },
                resume.type.startsWith('image/') ? 'centered' : 'float'
              )
            }}
          >
            <svelte:fragment slot="content">
              <span class="overflow-label disabled">{resume.name}</span>
            </svelte:fragment>
          </Button>
        {:else}
          <Button
            kind={'transparent'}
            focusIndex={103}
            label={recruit.string.AddDropHere}
            icon={FileUpload}
            on:click={() => {
              inputFile.click()
            }}
          />
        {/if}
        <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected} />
      {/if}
    </div>
    {#if matches.length > 0}
      <div class="flex-col-stretch flex-grow error-color">
        <div class="flex mb-1">
          <IconInfo size={'medium'} />
          <span class="text-sm overflow-label ml-2">
            <Label label={contact.string.PersonAlreadyExists} />
          </span>
        </div>
        <PersonPresenter value={matches[0]} avatarSize={'tiny'} />
      </div>
    {/if}
  </svelte:fragment>
</Card>

<style lang="scss">
  .resume {
    margin: -0.375rem 0rem -0.375rem -0.375rem;
    padding: 0.375rem;
    background: var(--accent-bg-color);
    border: 1px dashed var(--divider-color);
    border-radius: 0.5rem;

    &.solid {
      border-style: solid;
    }
  }
  .skills-box {
    padding: 0.5rem 0.75rem;
    background: var(--accent-bg-color);
    border: 1px dashed var(--divider-color);
    border-radius: 0.5rem;
  }
</style>
