//
// Copyright @ 2022-2023 Hardcore Engineering Inc.
//

import {
  type Data,
  type Ref,
  TxOperations,
  type Class,
  type Space,
  generateId,
  DOMAIN_TX,
  AccountRole,
  DOMAIN_DOC_INDEX_STATE,
  makeCollaborativeDoc
} from '@hcengineering/core'
import {
  createDefaultSpace,
  createOrUpdate,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
import contact from '@hcengineering/model-contact'
import tags from '@hcengineering/tags'
import {
  type ChangeControl,
  type DocumentCategory,
  type Document,
  type DocumentMeta,
  type DocumentSpace,
  type HierarchyDocument,
  type ProjectDocument,
  type ProjectMeta,
  TEMPLATE_PREFIX,
  getDocumentId,
  DocumentState,
  documentsId,
  createDocumentTemplate,
  type ControlledDocument,
  createChangeControl
} from '@hcengineering/controlled-documents'

import documents, { DOMAIN_DOCUMENTS } from './index'

async function migrateDocumentCategories (client: MigrationClient): Promise<void> {
  const oldSpace = 'documents:space:Documents' as Ref<Space>

  await client.update(
    DOMAIN_DOCUMENTS,
    {
      _class: documents.class.DocumentCategory,
      space: oldSpace
    },
    {
      $set: {
        space: documents.space.QualityDocuments
      }
    }
  )
}

async function migrateUnusedDocumentSpaces (client: MigrationClient): Promise<void> {
  const spaces: Ref<DocumentSpace>[] = [
    'events:space:EventsDocuments' as Ref<DocumentSpace>,
    'clients:space:ClientsDocuments' as Ref<DocumentSpace>,
    'supplier:space:SuppliersDocuments' as Ref<DocumentSpace>,
    'trainings:space:TrainingsDocuments' as Ref<DocumentSpace>
  ]

  await client.update(
    DOMAIN_SPACE,
    {
      _id: { $in: spaces },
      _class: documents.class.DocumentSpace,
      archived: false
    },
    {
      $set: {
        archived: true
      }
    }
  )
}

async function migrateProjectMeta (client: MigrationClient): Promise<void> {
  type ExDocumentMeta = DocumentMeta & { path: Ref<DocumentMeta>[] }

  const metaToMigrate = await client.find<ExDocumentMeta>(DOMAIN_DOCUMENTS, {
    _class: documents.class.DocumentMeta,
    path: { $exists: true }
  })

  for (const meta of metaToMigrate) {
    const projectMetaId: Ref<ProjectMeta> = generateId()

    const docs = await client.find<HierarchyDocument>(DOMAIN_DOCUMENTS, {
      attachedTo: meta._id
    })

    for (const doc of docs) {
      await client.create<ProjectDocument>(DOMAIN_DOCUMENTS, {
        _id: generateId(),
        _class: documents.class.ProjectDocument,
        space: doc.space,
        modifiedBy: core.account.System,
        modifiedOn: Date.now(),
        attachedTo: projectMetaId,
        attachedToClass: documents.class.ProjectMeta,
        collection: 'documents',
        project: documents.ids.NoProject,
        initial: documents.ids.NoProject,
        document: doc._id
      })
    }

    await client.create<ProjectMeta>(DOMAIN_DOCUMENTS, {
      _id: projectMetaId,
      _class: documents.class.ProjectMeta,
      space: meta.space,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      project: documents.ids.NoProject,
      meta: meta._id,
      path: meta.path,
      parent: meta.path[0] ?? documents.ids.NoParent,
      documents: docs.length
    })

    await client.update(
      DOMAIN_DOCUMENTS,
      { _id: meta._id },
      {
        $unset: {
          path: undefined
        }
      }
    )
  }
}

async function migrateDocumentSpaces (client: MigrationClient): Promise<void> {
  const affectedClasses: Ref<Class<DocumentSpace>>[] = [
    documents.class.DocumentSpace,
    documents.class.OrgSpace,
    documents.class.ExternalSpace
  ]

  await client.update(
    DOMAIN_SPACE,
    {
      _class: { $in: affectedClasses },
      type: { $exists: false }
    },
    {
      $set: {
        type: documents.spaceType.DocumentSpaceType
      }
    }
  )

  await client.update(
    DOMAIN_SPACE,
    {
      _class: { $in: affectedClasses },
      type: 'documents:spaceType:DefaultDocLibraryType'
    },
    {
      $set: {
        type: documents.spaceType.DocumentSpaceType
      },
      $rename: {
        'documents:spaceType:DefaultDocLibraryType:type:mixin': 'documents:spaceType:DocumentSpaceType:type:mixin'
      }
    }
  )
}

async function migrateLibraryDocumentSpace (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_SPACE,
    {
      _class: 'documents:class:LibraryDocumentSpace' as Ref<Class<DocumentSpace>>
    },
    {
      $set: {
        _class: documents.class.DocumentSpace
      }
    }
  )
}

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

async function migrateSpace (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_SPACE,
    {
      _id: documents.space.Documents,
      _class: documents.class.DocumentSpace
    },
    {
      $set: {
        _class: core.class.Space
      }
    }
  )
}

async function migrateEffectiveDates (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_DOCUMENTS,
    {
      effectiveDate: 0
    },
    {
      $set: {
        plannedEffectiveDate: 0
      },
      $unset: {
        effectiveDate: undefined
      }
    }
  )

  const docsToRelease = await client.find(DOMAIN_DOCUMENTS, { effectiveDate: { $gt: Date.now() } })

  for (const doc of docsToRelease) {
    const plannedEffectiveDate = (doc as any).effectiveDate
    await client.update(
      DOMAIN_DOCUMENTS,
      { _id: doc._id },
      {
        $set: {
          plannedEffectiveDate
        },
        $unset: {
          effectiveDate: undefined
        }
      }
    )
  }
}

async function migrateChangeControls (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_DOCUMENTS,
    { _class: documents.class.ChangeControl, impactedDocuments: { $exists: false } },
    {
      $set: {
        impactedDocuments: []
      }
    }
  )
}

async function migrateTemplatePrefixes (client: MigrationClient): Promise<void> {
  const templatesToMigrate = await client.find<Document>(DOMAIN_DOCUMENTS, {
    [documents.mixin.DocumentTemplate]: { $exists: true },
    prefix: { $ne: TEMPLATE_PREFIX }
  })

  for (const tmp of templatesToMigrate) {
    await client.update(
      DOMAIN_DOCUMENTS,
      {
        _id: tmp._id
      },
      {
        $set: {
          prefix: TEMPLATE_PREFIX,
          [`${documents.mixin.DocumentTemplate}.docPrefix`]: tmp.prefix
        }
      }
    )
  }
}

async function migrateDocumentCodes (client: MigrationClient): Promise<void> {
  const classes = client.hierarchy.getDescendants(documents.class.Document)
  const docsToMigrate = await client.find<Document>(DOMAIN_DOCUMENTS, {
    _class: { $in: classes },
    code: { $exists: false }
  })

  for (const doc of docsToMigrate) {
    await client.update(
      DOMAIN_DOCUMENTS,
      {
        _id: doc._id
      },
      {
        $set: {
          code: getDocumentId(doc)
        }
      }
    )
  }
}

async function migrateCollaborativeDocument (client: MigrationClient): Promise<void> {
  const mixin = 'documents:mixin:CollaborativeDocument'

  const docsToMigrate = await client.find(DOMAIN_DOCUMENTS, {
    [`${mixin}.document`]: { $exists: true }
  })

  for (const doc of docsToMigrate) {
    const content = (doc as any)[mixin].document
    const snapshots = (doc as any)[mixin].snapshots ?? []

    // move mixin document -> content field
    await client.update(
      DOMAIN_DOCUMENTS,
      { _id: doc._id },
      {
        $set: {
          content,
          snapshots: snapshots.length
        },
        $unset: {
          [mixin]: undefined
        }
      }
    )

    // make snapshots attached docs
    await client.update(
      DOMAIN_DOCUMENTS,
      { _id: { $in: snapshots } },
      {
        $set: {
          attachedTo: doc._id,
          attachedToClass: doc._class,
          collection: 'snapshots'
        }
      }
    )
  }
}

async function fixChangeControlsForDocs (tx: TxOperations): Promise<void> {
  const defaultCCSpec: Data<ChangeControl> = {
    description: '',
    reason: '',
    impact: '',
    impactedDocuments: []
  }
  const controlledDocuments = await tx.findAll(
    documents.class.ControlledDocument,
    {},
    { lookup: { changeControl: documents.class.ChangeControl } }
  )

  for (const cdoc of controlledDocuments) {
    const existingCC = await tx.findOne(documents.class.ChangeControl, { _id: cdoc.changeControl })

    if (existingCC !== undefined) {
      continue
    }

    const newCc = await tx.createDoc(
      documents.class.ChangeControl,
      cdoc.space,
      defaultCCSpec,
      cdoc.changeControl?.length > 0 ? cdoc.changeControl : undefined
    )

    if (cdoc.changeControl === undefined) {
      await tx.update(cdoc, { changeControl: newCc })
    }
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
        prefix: '',
        seqNumber: 0,
        major: 0,
        minor: 1,
        state: DocumentState.Effective,
        sections: 0,
        commentSequence: 0,
        content: makeCollaborativeDoc(generateId())
      },
      ccCategory,
      undefined,
      {
        title: 'Section 1'
      }
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

  await Promise.all(
    categories.map((c) =>
      createOrUpdate(
        tx,
        documents.class.DocumentCategory,
        documents.space.QualityDocuments,
        { ...c, attachments: 0 },
        ((documents.category.DOC as string) + ' - ' + c.code) as Ref<DocumentCategory>
      )
    )
  )
}

async function createTagCategories (tx: TxOperations): Promise<void> {
  await createOrUpdate(
    tx,
    tags.class.TagCategory,
    tags.space.Tags,
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
    tags.space.Tags,
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

async function migrateDocumentSpacesMixins (client: MigrationClient): Promise<void> {
  const oldSpaceTypeMixin = `${documents.spaceType.DocumentSpaceType}:type:mixin`
  const newSpaceTypeMixin = documents.mixin.DocumentSpaceTypeData
  const affectedClasses: Ref<Class<DocumentSpace>>[] = [
    documents.class.DocumentSpace,
    documents.class.OrgSpace,
    documents.class.ExternalSpace
  ]

  await client.update(
    DOMAIN_TX,
    {
      objectClass: core.class.Attribute,
      'attributes.attributeOf': oldSpaceTypeMixin
    },
    {
      $set: {
        'attributes.attributeOf': newSpaceTypeMixin
      }
    }
  )

  await client.update(
    DOMAIN_SPACE,
    {
      _class: { $in: affectedClasses },
      [oldSpaceTypeMixin]: { $exists: true }
    },
    {
      $rename: {
        [oldSpaceTypeMixin]: newSpaceTypeMixin
      }
    }
  )
}

async function migrateDefaultProjectOwners (client: MigrationClient): Promise<void> {
  const workspaceOwners = await client.model.findAll(contact.class.PersonAccount, {
    role: AccountRole.Owner
  })

  await client.update(
    DOMAIN_SPACE,
    {
      _id: documents.space.QualityDocuments,
      $or: [{ owners: { $exists: false } }, { owners: [core.account.System] }]
    },
    {
      $set: {
        owners: workspaceOwners.map((it) => it._id)
      }
    }
  )
}

async function migrateMetaTitles (client: MigrationClient): Promise<void> {
  const targetMetas = await client.find<DocumentMeta>(DOMAIN_DOCUMENTS, { title: { $exists: false } })

  for (const meta of targetMetas) {
    let targetDoc = (
      await client.find<Document>(DOMAIN_DOCUMENTS, { attachedTo: meta._id, state: DocumentState.Effective })
    )[0]

    if (targetDoc === undefined) {
      targetDoc = (await client.find<Document>(DOMAIN_DOCUMENTS, { attachedTo: meta._id }))[0]
    }

    if (targetDoc === undefined) {
      continue
    }

    await client.update(
      DOMAIN_DOCUMENTS,
      { _id: meta._id },
      {
        $set: {
          title: `${getDocumentId(targetDoc)} ${targetDoc.title}`
        }
      }
    )
  }
}

async function migrateMetaIndexState (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_DOC_INDEX_STATE,
    {
      _class: core.class.DocIndexState,
      objectClass: documents.class.DocumentMeta
    },
    {
      $set: {
        stages: {}
      }
    }
  )
}

export const documentsOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateSpace(client)
    await migrateEffectiveDates(client)
    await migrateChangeControls(client)
    await migrateTemplatePrefixes(client)
    // Note: Order matters! It is important to migrate template prefixes first.
    await migrateDocumentCodes(client)
    await migrateCollaborativeDocument(client)
    await migrateLibraryDocumentSpace(client)
    await migrateDocumentSpaces(client)
    await migrateDocumentCategories(client)
    await migrateUnusedDocumentSpaces(client)
    await migrateProjectMeta(client)
    await migrateDocumentSpacesMixins(client)
    await migrateDefaultProjectOwners(client)
    await migrateMetaTitles(client)
    await tryMigrate(client, documentsId, [
      {
        state: 'migrateMetaIndexState',
        func: migrateMetaIndexState
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createDefaultSpace(client, documents.space.Documents, { name: 'Documents', description: 'Documents' })
    await createQualityDocumentsSpace(tx)
    await createTemplatesSpace(tx)
    await createTemplateSequence(tx)
    await createTagCategories(tx)
    await createDocumentCategories(tx)
    await fixChangeControlsForDocs(tx)
    await createProductChangeControlTemplate(tx)
  }
}
