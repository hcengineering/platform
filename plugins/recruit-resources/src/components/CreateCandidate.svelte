<!--
  Copyright © 2020 Anticrm Platform Contributors.

  Licensed under the Eclipse Public License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may
  obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

  See the License for the specific language governing permissions and
  limitations under the License.
-->
<script lang="ts">
  import { Analytics } from '@hcengineering/analytics'
  import attachment, { AttachmentsEvents } from '@hcengineering/attachment'
  import contact, {
    AvatarType,
    Channel,
    ChannelProvider,
    combineName,
    findContacts,
    Person
  } from '@hcengineering/contact'
  import { EditableAvatar, PersonPresenter } from '@hcengineering/contact-resources'
  import core, {
    Account,
    AttachedData,
    Data,
    Doc,
    fillDefaults,
    generateId,
    MixinData,
    Ref,
    toIdMap,
    TxProcessor,
    WithLookup,
    type Blob
  } from '@hcengineering/core'
  import { getMetadata, getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import presentation, {
    Card,
    createQuery,
    deleteFile,
    getClient,
    InlineAttributeBar,
    KeyedAttribute,
    MessageBox
  } from '@hcengineering/presentation'
  import { Candidate, CandidateDraft, RecruitEvents } from '@hcengineering/recruit'
  import tags, { TagElement, TagCategory } from '@hcengineering/tags'
  import {
    Button,
    Component,
    createFocusManager,
    FocusHandler,
    IconInfo,
    Label,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import recruit from '../plugin'
  import { getCandidateIdentifier } from '../utils'
  import { CandidateDraftService } from '../services/candidateDraftService'
  import { CandidateRecognitionService } from '../services/candidateRecognitionService'
  import CandidatePersonalInfo from './candidate/CandidatePersonalInfo.svelte'
  import CandidateChannels from './candidate/CandidateChannels.svelte'
  import CandidateWorkPreferences from './candidate/CandidateWorkPreferences.svelte'
  import CandidateSkills from './candidate/CandidateSkills.svelte'
  import CandidateResume from './candidate/CandidateResume.svelte'

  export let shouldSaveDraft: boolean = true

  const draftService = new CandidateDraftService(shouldSaveDraft)
  const recognitionService = new CandidateRecognitionService()
  const id: Ref<Candidate> = generateId()

  let draft = shouldSaveDraft ? draftService.getDraft() : undefined
  let object = draft ?? draftService.getEmptyCandidate(id)
  let avatarEditor: EditableAvatar
  let inputFile: HTMLInputElement
  let loading = false
  let dragover = false
  let shouldCreateNewSkills = false
  let matches: WithLookup<Person>[] = []
  let matchedChannels: AttachedData<Channel>[] = []

  const key: KeyedAttribute = {
    key: 'skills',
    attr: getClient().getHierarchy().getAttribute(recruit.mixin.Candidate, 'skills')
  }

  let elements = new Map<Ref<TagElement>, TagElement>()
  let namedElements = new Map<string, TagElement>()
  const newElements: TagElement[] = []

  const elementQuery = createQuery()
  let elementsPromise: Promise<void>
  $: elementsPromise = new Promise((resolve) => {
    elementQuery.query(
      tags.class.TagElement,
      {
        targetClass: recruit.mixin.Candidate
      },
      (result) => {
        const ne = new Map<Ref<TagElement>, TagElement>()
        const nne = new Map<string, TagElement>()
        for (const t of newElements.concat(result)) {
          ne.set(t._id, t)
          nne.set(t.title.trim().toLowerCase(), t)
        }
        elements = ne
        namedElements = nne
        resolve()
      }
    )
  })

  onDestroy(
    draftService.subscribe((val) => {
      draft = shouldSaveDraft ? val : undefined
    })
  )

  function objectChange(object: CandidateDraft, empty: any) {
    if (shouldSaveDraft) {
      draftService.saveDraft(object, empty)
    }
  }

  $: objectChange(object, empty)

  export function canClose(): boolean {
    return true
  }

  const ignoreKeys = ['createdOn', 'avatar']

  const empty = {
    firstName: '',
    lastName: '',
    title: '',
    city: '',
    channels: [],
    skills: [],
    onsite: false,
    remote: false
  }

  fillDefaults(getClient().getHierarchy(), empty, recruit.mixin.Candidate)
  fillDefaults(getClient().getHierarchy(), object, recruit.mixin.Candidate)

  function findTagCategory(title: string, categories: TagCategory[]): Ref<TagCategory> {
    const lowerTitle = title.toLowerCase()
    for (const category of categories) {
      if (category.title.toLowerCase() === lowerTitle) {
        return category._id
      }
    }
    return categories[0]?._id ?? generateId()
  }

  async function createCandidate(): Promise<void> {
    const _id: Ref<Person> = generateId()
    const candidate: Data<Person> = {
      name: combineName(object.firstName ?? '', object.lastName ?? ''),
      city: object.city,
      channels: 0,
      avatarType: AvatarType.COLOR
    }
    const info = await avatarEditor.createAvatar()
    candidate.avatar = info.avatar
    candidate.avatarType = info.avatarType
    candidate.avatarProps = info.avatarProps
    const candidateData: MixinData<Person, Candidate> = {
      title: object.title,
      onsite: object.onsite,
      remote: object.remote,
      skills: 0
    }

    // Store all extra values.
    for (const [k, v] of Object.entries(object)) {
      if (v != null && k !== 'createdOn' && k !== 'avatar') {
        const attr = getClient().getHierarchy().findAttribute(recruit.mixin.Candidate, k)
        if (attr === undefined) continue
        if (attr.attributeOf === recruit.mixin.Candidate) {
          if ((candidateData as any)[k] === undefined) {
            ;(candidateData as any)[k] = v
          }
        } else {
          if ((candidate as any)[k] === undefined) {
            ;(candidate as any)[k] = v
          }
        }
      }
    }

    const applyOps = getClient().apply(undefined, 'create-candidate')

    await applyOps.createDoc(contact.class.Person, contact.space.Contacts, candidate, _id)
    await applyOps.createMixin(
      _id,
      contact.class.Person,
      contact.space.Contacts,
      recruit.mixin.Candidate,
      candidateData
    )
    const candidateIdentifier = getCandidateIdentifier(_id)
    Analytics.handleEvent(RecruitEvents.TalentCreated, { _id: candidateIdentifier })

    if (object.resumeUuid !== undefined) {
      const resume = {
        uuid: object.resumeUuid,
        name: object.resumeName ?? '',
        size: object.resumeSize ?? 0,
        type: object.resumeType ?? '',
        lastModified: object.resumeLastModified ?? 0
      }
      await applyOps.addCollection(
        attachment.class.Attachment,
        contact.space.Contacts,
        _id,
        contact.class.Person,
        'attachments',
        {
          name: resume.name,
          file: resume.uuid as Ref<Blob>,
          size: resume.size,
          type: resume.type,
          lastModified: resume.lastModified
        }
      )
      Analytics.handleEvent(AttachmentsEvents.FilesAttached, { object: candidateIdentifier, count: 1 })
    }

    for (const channel of object.channels) {
      await applyOps.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        _id,
        contact.class.Person,
        'channels',
        {
          value: channel.value,
          provider: channel.provider
        }
      )
    }

    const categories = await getClient().findAll(tags.class.TagCategory, { targetClass: recruit.mixin.Candidate })
    // Tag elements
    const skillTagElements = toIdMap(
      await getClient().findAll(tags.class.TagElement, { _id: { $in: object.skills.map((it) => it.tag) } })
    )
    for (const skill of object.skills) {
      // Create update tag if missing
      if (!skillTagElements.has(skill.tag)) {
        skill.tag = await getClient().createDoc(tags.class.TagElement, skill.space, {
          title: skill.title,
          color: skill.color,
          targetClass: recruit.mixin.Candidate,
          description: '',
          category: findTagCategory(skill.title, categories)
        })
        Analytics.handleEvent(RecruitEvents.SkillCreated, { skill: skill.tag })
      }
      await applyOps.addCollection(skill._class, skill.space, _id, recruit.mixin.Candidate, 'skills', {
        title: skill.title,
        color: skill.color,
        tag: skill.tag,
        weight: skill.weight
      })
    }

    await applyOps.commit()
    draftService.removeDraft()
    dispatch('close', _id)
    resetObject()
  }

  async function deleteResume(): Promise<void> {
    if (object.resumeUuid) {
      try {
        await deleteFile(object.resumeUuid)
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function createAttachment(file: File) {
    loading = true
    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)

      object.resumeUuid = await uploadFile(file)
      object.resumeName = file.name
      object.resumeSize = file.size
      object.resumeType = file.type
      object.resumeLastModified = file.lastModified

      await recognitionService.recognize(file, object)
    } catch (err: any) {
      Analytics.handleError(err)
      setPlatformStatus(unknownError(err))
    } finally {
      loading = false
    }
  }

  $: if (object.firstName != null && object.lastName != null) {
    void findContacts(
      getClient(),
      contact.class.Person,
      combineName(object.firstName.trim(), object.lastName.trim()),
      object.channels
    ).then((p) => {
      matches = p.contacts
      matchedChannels = p.channels
    })
  }

  const manager = createFocusManager()

  function resetObject(): void {
    object = draftService.getEmptyCandidate()
    fillDefaults(getClient().getHierarchy(), object, recruit.mixin.Candidate)
  }

  export async function onOutsideClick(): Promise<void> {
    if (shouldSaveDraft) {
      draftService.saveDraft(object, empty)
    }
  }

  async function showConfirmationDialog(): Promise<void> {
    draftService.saveDraft(object, empty)
    const isFormEmpty = draft === undefined

    if (isFormEmpty) {
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: recruit.string.CreateTalentDialogClose,
          message: recruit.string.CreateTalentDialogCloseNote,
          action: async () => {
            await deleteResume()
            resetObject()
            draftService.removeDraft()
          }
        },
        'top',
        (result?: boolean) => {
          if (result === true) {
            dispatch('close')
          }
        }
      )
    }
  }

  const dispatch = createEventDispatcher()
</script>

<FocusHandler {manager} />

<Card
  label={recruit.string.CreateTalent}
  okAction={createCandidate}
  canSave={!loading && (((object.firstName && object.firstName.length > 0) || (object.lastName && object.lastName.length > 0)) || (object.channels && object.channels.length > 0))}
  on:close={() => {
    dispatch('close')
  }}
  onCancel={showConfirmationDialog}
  on:changeContent
>
  <svelte:fragment slot="header">
    <Button icon={contact.icon.Person} label={contact.string.Person} size={'large'} disabled on:click={() => {}} />
  </svelte:fragment>

  <CandidatePersonalInfo {object} {loading} bind:avatarEditor />

  <svelte:fragment slot="pool">
    <CandidateChannels {object} {loading} {matchedChannels} />
    <CandidateWorkPreferences {object} {loading} />
    <CandidateSkills {object} {loading} {elements} {newElements} {key} />
    <InlineAttributeBar
      _class={recruit.mixin.Candidate}
      {object}
      toClass={contact.class.Contact}
      {ignoreKeys}
      extraProps={{ showNavigate: false }}
      on:update={() => {
        object = object
      }}
    />
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <CandidateResume
      {object}
      {loading}
      {dragover}
      {shouldCreateNewSkills}
      bind:inputFile
      on:createAttachment={({ detail }) => createAttachment(detail)}
    />
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
