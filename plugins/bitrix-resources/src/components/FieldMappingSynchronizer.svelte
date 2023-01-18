<script lang="ts">
  import bitrix, {
    BitrixEntityMapping,
    BitrixEntityType,
    BitrixFieldMapping,
    BitrixSyncDoc
  } from '@hcengineering/bitrix'
  import chunter, { Comment } from '@hcengineering/chunter'
  import contact, { combineName, EmployeeAccount } from '@hcengineering/contact'
  import core, {
    AccountRole,
    ApplyOperations,
    AttachedDoc,
    Class,
    Data,
    Doc,
    DocumentUpdate,
    generateId,
    Mixin,
    Ref,
    Space,
    WithLookup
  } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient, SpaceSelect } from '@hcengineering/presentation'
  import { TagElement } from '@hcengineering/tags'
  import { Button, Expandable, Icon, Label } from '@hcengineering/ui'
  import DropdownLabels from '@hcengineering/ui/src/components/DropdownLabels.svelte'
  import { NumberEditor } from '@hcengineering/view-resources'
  import { deepEqual } from 'fast-equals'
  import { BitrixClient } from '../client'
  import { convert, ConvertResult, toClassRef } from '../utils'
  import FieldMappingPresenter from './FieldMappingPresenter.svelte'

  export let mapping: WithLookup<BitrixEntityMapping>
  export let bitrixClient: BitrixClient

  const client = getClient()

  $: fieldMapping = (mapping.$lookup?.fields as BitrixFieldMapping[]) ?? []
  $: fieldsByClass = fieldMapping.reduce((p, c) => {
    p[c.ofClass] = [...(p[c.ofClass] ?? []), c]
    return p
  }, {} as Record<Ref<Class<Doc>>, BitrixFieldMapping[]>)

  let direction: 'ASC' | 'DSC' = 'DSC'
  let limit = 200
  let space: Ref<Space> | undefined

  export let loading = false
  let state = ''

  async function updateDoc (client: ApplyOperations, doc: Doc, raw: Doc | Data<Doc>): Promise<void> {
    // We need to update fields if they are different.
    const documentUpdate: DocumentUpdate<Doc> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (['_class', '_id', 'modifiedBy', 'modifiedOn', 'space'].includes(k)) {
        continue
      }
      if (!deepEqual((doc as any)[k], v)) {
        ;(documentUpdate as any)[k] = v
      }
    }
    if (Object.keys(documentUpdate).length > 0) {
      await client.update(doc, documentUpdate)
    }
  }

  let docsProcessed = 0
  let total = 0

  async function syncPlatform (documents: ConvertResult[]): Promise<void> {
    const existingDocuments = await client.findAll(mapping.ofClass, {
      [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: documents.map((it) => it.document.bitrixId) }
    })
    const hierarchy = client.getHierarchy()
    for (const d of documents) {
      const existing = existingDocuments.find(
        (it) => hierarchy.as(it, bitrix.mixin.BitrixSyncDoc).bitrixId === d.document.bitrixId
      )
      const applyOp = client.apply('bitrix')
      if (existing !== undefined) {
        // We need to update fields if they are different.
        await updateDoc(applyOp, existing, d.document)

        // Check and update mixins
        for (const [m, mv] of Object.entries(d.mixins)) {
          const mRef = m as Ref<Mixin<Doc>>
          if (hierarchy.hasMixin(existing, mRef)) {
            await applyOp.createMixin(
              d.document._id,
              d.document._class,
              d.document.space,
              m as Ref<Mixin<Doc>>,
              mv,
              d.document.modifiedOn,
              d.document.modifiedBy
            )
          } else {
            const existingM = hierarchy.as(existing, mRef)
            await updateDoc(applyOp, existingM, mv)
          }
        }
      } else {
        await applyOp.createDoc(
          d.document._class,
          d.document.space,
          d.document,
          d.document._id,
          d.document.modifiedOn,
          d.document.modifiedBy
        )

        await applyOp.createMixin<Doc, BitrixSyncDoc>(
          d.document._id,
          d.document._class,
          d.document.space,
          bitrix.mixin.BitrixSyncDoc,
          {
            type: d.document.type,
            bitrixId: d.document.bitrixId
          },
          d.document.modifiedOn,
          d.document.modifiedBy
        )
        for (const [m, mv] of Object.entries(d.mixins)) {
          await applyOp.createMixin(
            d.document._id,
            d.document._class,
            d.document.space,
            m as Ref<Mixin<Doc>>,
            mv,
            d.document.modifiedOn,
            d.document.modifiedBy
          )
        }
        for (const ed of d.extraDocs) {
          if (applyOp.getHierarchy().isDerived(ed._class, core.class.AttachedDoc)) {
            const adoc = ed as AttachedDoc
            await applyOp.addCollection(
              adoc._class,
              adoc.space,
              adoc.attachedTo,
              adoc.attachedToClass,
              adoc.collection,
              adoc,
              adoc._id,
              d.document.modifiedOn,
              d.document.modifiedBy
            )
          } else {
            await applyOp.createDoc(ed._class, ed.space, ed, ed._id, d.document.modifiedOn, d.document.modifiedBy)
          }
        }

        if (d.comments !== undefined) {
          const comments = await d.comments
          if (comments !== undefined && comments.length > 0) {
            const existingComments = await client.findAll(chunter.class.Comment, {
              attachedTo: d.document._id,
              [bitrix.mixin.BitrixSyncDoc + '.bitrixId']: { $in: comments.map((it) => it.bitrixId) }
            })

            for (const comment of comments) {
              const existing = existingComments.find(
                (it) => hierarchy.as<Doc, BitrixSyncDoc>(it, bitrix.mixin.BitrixSyncDoc).bitrixId === comment.bitrixId
              )
              if (existing !== undefined) {
                // We need to update fields if they are different.
                await updateDoc(applyOp, existing, comment)
              } else {
                await applyOp.addCollection(
                  comment._class,
                  comment.space,
                  comment.attachedTo,
                  comment.attachedToClass,
                  comment.collection,
                  comment,
                  comment._id,
                  comment.modifiedOn,
                  comment.modifiedBy
                )

                await applyOp.createMixin<Doc, BitrixSyncDoc>(
                  comment._id,
                  comment._class,
                  comment.space,
                  bitrix.mixin.BitrixSyncDoc,
                  {
                    type: d.document.type,
                    bitrixId: d.document.bitrixId
                  },
                  comment.modifiedOn,
                  comment.modifiedBy
                )
              }
            }
          }
        }
      }
      await applyOp.commit()
      docsProcessed++
      state = `processed: ${docsProcessed}/${total}`
    }
  }

  async function doSync (): Promise<void> {
    loading = true

    const commentFields = await bitrixClient.call(BitrixEntityType.Comment + '.fields', {})

    const commentFieldKeys = Object.keys(commentFields.result)

    const allEmployee = await client.findAll(contact.class.EmployeeAccount, {})

    const userList = new Map<string, Ref<EmployeeAccount>>()

    // Fill all users and create new ones, if required.
    let totalUsers = 1
    let next = 0
    while (userList.size < totalUsers) {
      const users = await bitrixClient.call('user.search', { start: next })
      next = users.next
      totalUsers = users.total
      for (const u of users.result) {
        let accountId = allEmployee.find((it) => it.email === u.EMAIL)?._id
        if (accountId === undefined) {
          const employeeId = await client.createDoc(contact.class.Employee, contact.space.Contacts, {
            name: combineName(u.NAME, u.LAST_NAME),
            avatar: u.PERSONAL_PHOTO,
            active: u.ACTIVE,
            city: u.PERSONAL_CITY
          })
          accountId = await client.createDoc(contact.class.EmployeeAccount, core.space.Model, {
            email: u.EMAIL,
            name: combineName(u.NAME, u.LAST_NAME),
            employee: employeeId,
            role: AccountRole.User
          })
        }
        userList.set(u.ID, accountId)
      }
    }

    try {
      if (space === undefined || mapping.$lookup?.fields === undefined) {
        return
      }
      let processed = 0
      const tagElements: Map<Ref<Class<Doc>>, TagElement[]> = new Map()

      let added = 0

      while (added <= limit) {
        const sel = ['*', 'UF_*']
        if (mapping.type === BitrixEntityType.Lead) {
          sel.push('EMAIL')
          sel.push('IM')
        }
        const result = await bitrixClient.call(mapping.type + '.list', {
          select: sel,
          order: { ID: direction },
          start: processed
        })

        const extraDocs: Doc[] = []

        const convertResults: ConvertResult[] = []
        const fields = mapping.$lookup?.fields as BitrixFieldMapping[]

        for (const r of result.result) {
          // Convert documents.
          const res = await convert(client, mapping, space, fields, r, extraDocs, tagElements, userList)
          if (mapping.comments) {
            res.comments = bitrixClient
              .call(BitrixEntityType.Comment + '.list', {
                filter: {
                  ENTITY_ID: res.document.bitrixId,
                  ENTITY_TYPE: mapping.type.replace('crm.', '')
                },
                select: commentFieldKeys,
                order: { ID: direction }
              })
              .then((comments) => {
                return comments.result.map(
                  (it: any) =>
                    ({
                      _id: generateId(),
                      _class: chunter.class.Comment,
                      message: it.COMMENT,
                      bitrixId: it.ID,
                      type: it.ENTITY_TYPE,
                      attachedTo: res.document._id,
                      attachedToClass: res.document._class,
                      collection: 'comments',
                      space: res.document.space,
                      modifiedBy: userList.get(it.AUTHOR_ID) ?? core.account.System,
                      modifiedOn: new Date(userList.get(it.CREATED) ?? new Date().toString()).getTime()
                    } as Comment)
                )
              })
          }
          convertResults.push(res)
          extraDocs.push(...res.extraDocs)
          added++
          if (added > limit) {
            break
          }
        }
        total = result.total
        await syncPlatform(convertResults)

        processed = result.next
      }
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
