//
// Copyright @ 2022-2023 Hardcore Engineering Inc.
//

import attachment, { type Attachment } from '@hcengineering/attachment'
import {
  loadCollabYdoc,
  saveCollabYdoc,
  YAbstractType,
  YXmlElement,
  yXmlElementClone,
  YXmlText
} from '@hcengineering/collaboration'
import {
  type ChangeControl,
  type ControlledDocument,
  createChangeControl,
  createDocumentTemplate,
  type DocumentCategory,
  type DocumentMeta,
  documentsId,
  DocumentState,
  type ProjectMeta
} from '@hcengineering/controlled-documents'
import {
  type Class,
  type Data,
  type Doc,
  DOMAIN_TX,
  generateId,
  makeDocCollabId,
  MeasureMetricsContext,
  type Ref,
  SortingOrder,
  toIdMap,
  TxOperations
} from '@hcengineering/core'
import {
  createDefaultSpace,
  createOrUpdate,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient,
  tryMigrate,
  tryUpgrade
} from '@hcengineering/model'
import { DOMAIN_ATTACHMENT } from '@hcengineering/model-attachment'
import core from '@hcengineering/model-core'
import tags from '@hcengineering/tags'

import { makeRank } from '@hcengineering/rank'
import documents, { DOMAIN_DOCUMENTS } from './index'

async function createTemplatesSpace (tx: TxOperations): Promise<void> {
  const existingSpace = await tx.findOne(documents.class.DocumentSpace, {
    _id: documents.space.UnsortedTemplates
  })

  if (existingSpace === undefined) {
    await tx.createDoc(
      documents.class.DocumentSpace,
      core.space.Space,
      {
        name: 'Unsorted templates',
        description: 'Unsorted templates',
        private: false,
        archived: false,
        autoJoin: true,
        members: [],
        type: documents.spaceType.DocumentSpaceType
      },
      documents.space.UnsortedTemplates
    )
  }
}

async function createQualityDocumentsSpace (tx: TxOperations): Promise<void> {
  const existingSpace = await tx.findOne(documents.class.OrgSpace, {
    _id: documents.space.QualityDocuments
  })

  if (existingSpace === undefined) {
    await tx.createDoc(
      documents.class.OrgSpace,
      core.space.Space,
      {
        name: 'Quality documents',
        description: "Space for organization's quality documents",
        private: true,
        archived: false,
        members: [],
        autoJoin: true,
        owners: [],
        type: documents.spaceType.DocumentSpaceType
      },
      documents.space.QualityDocuments
    )
  }
}

async function createProductChangeControlTemplate (tx: TxOperations): Promise<void> {
  const ccCategory = 'documents:category:DOC - CC' as Ref<DocumentCategory>
  const productChangeControlTemplate = await tx.findOne(documents.mixin.DocumentTemplate, {
    category: ccCategory
  })

  if (productChangeControlTemplate === undefined) {
    const ccRecordId = generateId<ChangeControl>()
    const ccRecord: Data<ChangeControl> = {
      description: '',
      reason: 'New template creation',
      impact: '',
      impactedDocuments: []
    }

    const seq = await tx.findOne(documents.class.Sequence, {
      _id: documents.sequence.Templates
    })

    if (seq === undefined) {
      return
    }

    const { success } = await createDocumentTemplate(
      tx,
      documents.class.ControlledDocument,
      documents.space.QualityDocuments,
      documents.mixin.DocumentTemplate,
      documents.ids.NoProject,
      undefined,
      documents.template.ProductChangeControl as unknown as Ref<ControlledDocument>,
      'CC',
      {
        title: 'Change Control Template for new Product Version',
        abstract:
          'This Template is to be used to create a Change Control document each time you want to create a new product version.',
        changeControl: ccRecordId,
        requests: 0,
        reviewers: [],
        approvers: [],
        coAuthors: [],
        code: `TMPL-${seq.sequence + 1}`,
        seqNumber: 0,
        major: 0,
        minor: 1,
        state: DocumentState.Effective,
        commentSequence: 0,
        content: null
      },
      ccCategory
    )

    if (!success) {
      return
    }

    await createChangeControl(tx, ccRecordId, ccRecord, documents.space.QualityDocuments)
  }
}

async function createTemplateSequence (tx: TxOperations): Promise<void> {
  const templateSeq = await tx.findOne(documents.class.Sequence, {
    _id: documents.sequence.Templates
  })

  if (templateSeq === undefined) {
    await tx.createDoc(
      documents.class.Sequence,
      documents.space.Documents,
      {
        attachedTo: documents.mixin.DocumentTemplate,
        sequence: 0
      },
      documents.sequence.Templates
    )
  }
}

async function createDocumentCategories (tx: TxOperations): Promise<void> {
  const categories: Pick<Data<DocumentCategory>, 'code' | 'title'>[] = [
    { code: 'CA', title: 'CAPA (Corrective and Preventive Action)' },
    { code: 'CC', title: 'Change Control' },
    { code: 'CE', title: 'Clinical Evaluation, Post-Market Clinical Follow-Up' },
    { code: 'CH', title: 'Complaint Handling & Support' },
    { code: 'CS', title: 'Clincial Studies' },
    { code: 'DC', title: 'Document-Control' },
    { code: 'DI', title: 'Design-Input' },
    { code: 'DT', title: 'Design Transfer' },
    { code: 'HF', title: 'Human Factors' },
    { code: 'HR', title: 'Human Resources' },
    { code: 'HW', title: 'Hardware Development' },
    { code: 'IA', title: 'Internal Audit' },
    { code: 'IM', title: 'Installation & Maintenance' },
    { code: 'IS', title: 'Infrastructure' },
    { code: 'LA', title: 'Labeling' },
    { code: 'MA', title: 'Marketing' },
    { code: 'MR', title: 'Management Review' },
    { code: 'PD', title: 'Product Development' },
    { code: 'PM', title: 'Post-Market Surveillance' },
    { code: 'PR', title: 'Production' },
    { code: 'PS', title: 'Purchase and Supplier Management' },
    { code: 'PSA', title: 'Product Safety' },
    { code: 'QM', title: 'Quality Manual' },
    { code: 'RM', title: 'Risk Management' },
    { code: 'RU', title: 'Regulatory Update' },
    { code: 'SA', title: 'Sales and Marketing' },
    { code: 'SU', title: 'Support' },
    { code: 'SW', title: 'Software Development' },
    { code: 'TF', title: 'Technical File, Product Release' },
    { code: 'VI', title: 'Vigilance' },
    { code: 'VV', title: 'Verification & Validation' },
    { code: 'CM', title: 'Client Management' }
  ]

  const catsCache = toIdMap(await tx.findAll(documents.class.DocumentCategory, {}))
  const ops = tx.apply()
  for (const c of categories) {
    await createOrUpdate(
      ops,
      documents.class.DocumentCategory,
      documents.space.QualityDocuments,
      { ...c, attachments: 0 },
      ((documents.category.DOC as string) + ' - ' + c.code) as Ref<DocumentCategory>,
      catsCache
    )
  }
  await ops.commit()
}

async function createTagCategories (tx: TxOperations): Promise<void> {
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    core.space.Workspace,
    {
      icon: tags.icon.Tags,
      label: 'Labels',
      targetClass: documents.class.Document,
      tags: [],
      default: true
    },
    documents.category.Other
  )

  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    core.space.Workspace,
    {
      icon: tags.icon.Tags,
      label: 'Labels',
      targetClass: documents.mixin.DocumentTemplate,
      tags: [],
      default: true
    },
    documents.category.OtherTemplate
  )
}

async function migrateSpaceTypes (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_TX,
    {
      _class: core.class.TxCreateDoc,
      objectClass: core.class.SpaceType,
      'attributes.descriptor': documents.descriptor.DocumentSpaceType
    },
    {
      $set: {
        objectClass: documents.class.DocumentSpaceType
      }
    }
  )
}

async function migrateDocSections (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('migrate_doc_sections', {})
  const storage = client.storageAdapter

  const targetDocuments = await client.find<ControlledDocument>(DOMAIN_DOCUMENTS, {
    _class: documents.class.ControlledDocument
  })
  const attachmentsOps: { filter: MigrationDocumentQuery<Attachment>, update: MigrateUpdate<Attachment> }[] = []

  for (const document of targetDocuments) {
    const targetSections: any = await client.find(
      DOMAIN_DOCUMENTS,
      {
        _class: 'documents:class:CollaborativeDocumentSection' as Ref<Class<Doc>>,
        attachedTo: document._id
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )

    // Migrate sections headers + content
    try {
      const collabId = makeDocCollabId(document, 'content')
      const ydoc = await loadCollabYdoc(ctx, storage, client.workspaceId, collabId)
      if (ydoc === undefined) {
        // no content, ignore
        continue
      }

      if (ydoc.share.has('content')) {
        // Already migrated?
        continue
      }

      const content = ydoc.getXmlFragment('content')

      ydoc.transact((tr) => {
        for (const section of targetSections) {
          const sectionTemplate = section['documents:mixin:DocumentTemplateSection']
          const sectionNote = sectionTemplate?.description ?? sectionTemplate?.guidance
          const titleXml = new YXmlText()
          titleXml.insert(
            0,
            section.title,
            sectionNote !== undefined && sectionNote !== ''
              ? { note: { kind: 'neutral', title: sectionNote } }
              : undefined
          )

          const sectionContent = ydoc.getXmlFragment(section.collaboratorSectionId)
          const sectionTitle = new YXmlElement('heading')
          sectionTitle.setAttribute('level', 1 as any)
          sectionTitle.insert(0, [titleXml])

          content.push([
            sectionTitle,
            ...(sectionContent
              .toArray()
              .map((item) =>
                item instanceof YAbstractType
                  ? item instanceof YXmlElement
                    ? yXmlElementClone(item)
                    : item.clone()
                  : item
              ) as any)
          ])
        }
      })

      await saveCollabYdoc(ctx, storage, client.workspaceId, collabId, ydoc)
    } catch (err) {
      ctx.error('error collaborative document content migration', { error: err, document: document.title })
    }

    attachmentsOps.push({
      filter: {
        _class: attachment.class.Attachment,
        attachedTo: { $in: targetSections.map((s: any) => s._id) }
      },
      update: {
        attachedTo: document._id,
        attachedToClass: document._class
      }
    })
  }

  if (attachmentsOps.length > 0) {
    await client.bulk(DOMAIN_ATTACHMENT, attachmentsOps)
  }
}

async function migrateProjectMetaRank (client: MigrationClient): Promise<void> {
  const projectMeta = await client.find<ProjectMeta>(DOMAIN_DOCUMENTS, {
    _class: documents.class.ProjectMeta,
    rank: { $exists: false }
  })

  const docMeta = await client.find<DocumentMeta>(DOMAIN_DOCUMENTS, {
    _class: documents.class.ProjectDocument,
    _id: { $in: projectMeta.map((p) => p.meta) }
  })

  const docMetaById = new Map<Ref<DocumentMeta>, DocumentMeta>()
  for (const doc of docMeta) {
    docMetaById.set(doc._id, doc)
  }

  projectMeta.sort((a, b) => {
    const docA = docMetaById.get(a.meta)
    const docB = docMetaById.get(b.meta)
    return (docA?.title ?? '').localeCompare(docB?.title ?? '', undefined, { numeric: true })
  })

  let rank = makeRank(undefined, undefined)
  const operations: { filter: MigrationDocumentQuery<ProjectMeta>, update: MigrateUpdate<ProjectMeta> }[] = []

  for (const doc of projectMeta) {
    operations.push({
      filter: { _id: doc._id },
      update: { $set: { rank } }
    })
    rank = makeRank(rank, undefined)
  }

  await client.bulk(DOMAIN_DOCUMENTS, operations)
}

export const documentsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, documentsId, [
      {
        state: 'migrateSpaceTypes',
        func: migrateSpaceTypes
      },
      {
        state: 'migrateDocSections',
        func: migrateDocSections
      },
      {
        state: 'migrateProjectMetaRank',
        func: migrateProjectMetaRank
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {
    await tryUpgrade(state, client, documentsId, [
      {
        state: 'init-documents',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaultSpace(client, documents.space.Documents, { name: 'Documents', description: 'Documents' })
          await createQualityDocumentsSpace(tx)
          await createTemplatesSpace(tx)
          await createTemplateSequence(tx)
          await createTagCategories(tx)
          await createDocumentCategories(tx)
          await createProductChangeControlTemplate(tx)
        }
      }
    ])
  }
}
