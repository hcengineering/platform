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
  import attachment from '@anticrm/attachment'
  import contact, { Channel, ChannelProvider, combineName, findPerson, Person } from '@anticrm/contact'
  import { Channels } from '@anticrm/contact-resources'
  import PersonPresenter from '@anticrm/contact-resources/src/components/PersonPresenter.svelte'
  import {
    Account,
    AttachedData,
    Data,
    Doc,
    FindResult,
    generateId,
    Hierarchy,
    MixinData,
    Ref,
    TxProcessor
  } from '@anticrm/core'
  import login from '@anticrm/login'
  import { getMetadata, getResource, setPlatformStatus, unknownError } from '@anticrm/platform'
  import presentation, {
    Card,
    createQuery,
    EditableAvatar,
    getClient,
    getFileUrl,
    KeyedAttribute,
    PDFViewer
  } from '@anticrm/presentation'
  import type { Candidate } from '@anticrm/recruit'
  import { recognizeDocument } from '@anticrm/rekoni'
  import tags, { findTagCategory, TagElement, TagReference } from '@anticrm/tags'
  import {
    Component,
    EditBox,
    getColorNumberByText,
    IconFile as FileIcon,
    IconInfo,
    Label,
    Link,
    showPopup,
    Spinner
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import FileUpload from './icons/FileUpload.svelte'
  import YesNo from './YesNo.svelte'

  let firstName = ''
  let lastName = ''

  export function canClose (): boolean {
    return firstName === '' && lastName === '' && resume.uuid === undefined
  }

  const object: Candidate = {} as Candidate

  const resume = {} as {
    name: string
    uuid: string
    size: number
    type: string
    lastModified: number
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const candidateId = generateId()

  let inputFile: HTMLInputElement
  let loading = false
  let dragover = false

  let avatar: File | undefined
  let channels: AttachedData<Channel>[] = []

  let skills: TagReference[] = []
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

  async function createCandidate () {
    const uploadFile = await getResource(attachment.helper.UploadFile)
    const avatarProp = avatar !== undefined ? { avatar: await uploadFile(avatar) } : {}
    const candidate: Data<Person> = {
      name: combineName(firstName, lastName),
      city: object.city,
      ...avatarProp
    }
    const candidateData: MixinData<Person, Candidate> = {
      title: object.title,
      onsite: object.onsite,
      remote: object.remote
    }

    const id = await client.createDoc(contact.class.Person, contact.space.Contacts, candidate, candidateId)
    await client.createMixin(
      id as Ref<Person>,
      contact.class.Person,
      contact.space.Contacts,
      recruit.mixin.Candidate,
      candidateData
    )

    console.log('resume name', resume.name)

    if (resume.uuid !== undefined) {
      client.addCollection(
        attachment.class.Attachment,
        contact.space.Contacts,
        id,
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
      await client.addCollection(
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
    const skillTagElements = new Map(
      (await client.findAll(tags.class.TagElement, { _id: { $in: skills.map((it) => it.tag) } })).map((it) => [
        it._id,
        it
      ])
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
      await client.addCollection(skill._class, skill.space, candidateId, recruit.mixin.Candidate, 'skills', {
        title: skill.title,
        color: skill.color,
        tag: skill.tag
      })
    }

    dispatch('close')
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

  async function recognize (name: string): Promise<void> {
    const token = getMetadata(login.metadata.LoginToken) ?? ''
    const fileUrl = window.location.origin + getFileUrl(resume.uuid)

    try {
      const doc = await recognizeDocument(token, fileUrl)
      console.log('recognize:', doc)

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

      if (isUndef(object.avatar) && doc.avatar !== undefined) {
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
      const categoriesMap = new Map(Array.from(categories.map((it) => [it._id, it])))

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

  async function createAttachment (file: File) {
    loading = true
    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)

      resume.uuid = await uploadFile(file, {
        space: contact.space.Contacts,
        attachedTo: candidateId
      })
      resume.name = file.name
      resume.size = file.size
      resume.type = file.type
      resume.lastModified = file.lastModified

      if (file.type.includes('application/pdf')) {
        await recognize(resume.uuid)
      }

      console.log('uploaded file uuid', resume.uuid)
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
  }

  function onAvatarDone (e: any) {
    const { file } = e.detail

    avatar = file
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

  let matches: FindResult<Person> = []
  $: findPerson(client, { ...object, name: combineName(firstName, lastName) }, channels).then((p) => {
    matches = p
  })
</script>

<Card
  label={recruit.string.CreateCandidate}
  okAction={createCandidate}
  canSave={firstName.length > 0 && lastName.length > 0 && matches.length === 0}
  space={contact.space.Contacts}
  on:close={() => {
    dispatch('close')
  }}
>
  {#if matches.length > 0}
    <div class="flex-row update-container ERROR">
      <div class="flex mb-2">
        <IconInfo size={'small'} />
        <div class="text-sm ml-2 overflow-label">
          <Label label={contact.string.PersonAlreadyExists} />
        </div>
      </div>
      <PersonPresenter value={matches[0]} />
    </div>
  {/if}
  <div class="flex-row-center">
    <div class="mr-4">
      <EditableAvatar bind:direct={avatar} avatar={object.avatar} size={'large'} on:done={onAvatarDone} />
    </div>
    <div class="flex-col">
      <div class="fs-title">
        <EditBox placeholder={recruit.string.PersonFirstNamePlaceholder} maxWidth="10rem" bind:value={firstName} />
      </div>
      <div class="fs-title mb-1">
        <EditBox placeholder={recruit.string.PersonLastNamePlaceholder} maxWidth="10rem" bind:value={lastName} />
      </div>
      <div class="text-sm">
        <EditBox placeholder={recruit.string.Title} maxWidth="10rem" bind:value={object.title} />
      </div>
      <div class="text-sm">
        <EditBox placeholder={recruit.string.Location} maxWidth="10rem" bind:value={object.city} />
      </div>
    </div>
  </div>

  <div class="flex-row-center channels">
    <Channels
      bind:channels
      on:change={(e) => {
        channels = e.detail
      }}
    />
  </div>

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
    {#if resume.uuid}
      <Link
        label={resume.name}
        icon={FileIcon}
        maxLenght={16}
        on:click={() => {
          showPopup(PDFViewer, { file: resume.uuid, name: resume.name }, 'right')
        }}
      />
    {:else}
      {#if loading}
        <Link label={'Uploading...'} icon={Spinner} disabled />
      {:else}
        <Link
          label={'Add or drop resume'}
          icon={FileUpload}
          on:click={() => {
            inputFile.click()
          }}
        />
      {/if}
      <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected} />
    {/if}
  </div>

  <div class="separator" />
  <div class="flex-col locations">
    <span><Label label={recruit.string.WorkLocationPreferences} /></span>
    <div class="row"><Label label={recruit.string.Onsite} /><YesNo bind:value={object.onsite} /></div>
    <div class="row"><Label label={recruit.string.Remote} /><YesNo bind:value={object.remote} /></div>
  </div>
  <div class="separator" />
  <div class="flex-col locations">
    <span><Label label={recruit.string.SkillsLabel} /></span>
    <div class="flex-grow">
      <Component
        is={tags.component.TagsEditor}
        props={{ items: skills, key, targetClass: recruit.mixin.Candidate, showTitle: false, elements }}
        on:open={(evt) => {
          addTagRef(evt.detail)
        }}
        on:delete={(evt) => {
          skills = skills.filter((it) => it._id !== evt.detail)
        }}
      />
    </div>
  </div>
</Card>

<style lang="scss">
  .channels {
    margin-top: 1.25rem;
  }

  .locations {
    span {
      margin-bottom: 0.125rem;
      font-weight: 500;
      font-size: 0.75rem;
      color: var(--theme-content-accent-color);
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      color: var(--theme-caption-color);
    }
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--theme-card-divider);
  }

  .resume {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--theme-zone-bg);
    border: 1px dashed var(--theme-zone-border);
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
    &.solid {
      border-style: solid;
    }
  }
  .update-container {
    margin-left: -1rem;
    margin-right: -1rem;
    padding: 1rem;
    margin-bottom: 1rem;
    user-select: none;
    font-size: 14px;
    color: var(--theme-content-color);
    &.WARNING {
      color: yellow;
    }
    &.ERROR {
      color: var(--system-error-color);
    }

    border: 1px dashed var(--theme-zone-border);
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
  }
</style>
