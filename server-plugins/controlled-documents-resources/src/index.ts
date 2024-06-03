//
// Copyright © 2023 Hardcore Engineering Inc.
//
import core, {
  Data,
  DocumentQuery,
  Ref,
  SortingOrder,
  Tx,
  TxCollectionCUD,
  TxFactory,
  TxUpdateDoc,
  generateId,
  type Timestamp,
  type Account,
  type RolesAssignment,
  AccountRole,
  TxCreateDoc
} from '@hcengineering/core'
import contact, { type Employee, type PersonAccount } from '@hcengineering/contact'
import { TriggerControl } from '@hcengineering/server-core'
import documents, {
  CollaborativeDocumentSection,
  ControlledDocument,
  ControlledDocumentState,
  DEFAULT_SECTION_TITLE,
  Document,
  DocumentApprovalRequest,
  DocumentState,
  DocumentTemplate,
  calcRank,
  type DocumentTraining,
  getEffectiveDocUpdate,
  getDocumentId
} from '@hcengineering/controlled-documents'
import training, { type TrainingRequest, TrainingState } from '@hcengineering/training'

/**
 * @public
 */
export async function OnCollaborativeSectionDeleted (
  tx: TxCollectionCUD<Document, CollaborativeDocumentSection>,
  control: TriggerControl
): Promise<Tx[]> {
  const sections = await control.findAll(documents.class.DocumentSection, { attachedTo: tx.objectId })
  if (sections.length > 0) {
    return []
  }

  // checking if the document itself is deleted
  const removeTx = (await control.findAll(core.class.TxRemoveDoc, { objectId: tx.objectId }, { limit: 1 })).shift()
  if (removeTx != null) {
    return []
  }

  const document = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 })).shift()
  if (document == null) {
    return []
  }

  const isTemplate = control.hierarchy.hasMixin(document, documents.mixin.DocumentTemplate)

  const sectionId = generateId()
  const collaboratorSectionId = generateId()
  return [
    control.txFactory.createTxCollectionCUD(
      tx.objectClass,
      tx.objectId,
      tx.objectSpace,
      tx.collection,
      control.txFactory.createTxCreateDoc(
        documents.class.CollaborativeDocumentSection,
        tx.objectSpace,
        {
          title: DEFAULT_SECTION_TITLE,
          rank: calcRank(),
          collaboratorSectionId,
          attachments: 0
        } as unknown as Data<CollaborativeDocumentSection>,
        sectionId as Ref<CollaborativeDocumentSection>
      )
    ),
    ...(isTemplate
      ? [
          control.txFactory.createTxMixin(
            sectionId,
            documents.class.CollaborativeDocumentSection,
            tx.objectSpace,
            documents.mixin.DocumentTemplateSection,
            { description: '', guidance: '', mandatory: false }
          )
        ]
      : [])
  ]
}

async function getDocs (
  control: TriggerControl,
  seqNumber: number,
  predicate: (doc: Document) => boolean,
  template?: Ref<DocumentTemplate>,
  states?: DocumentState[],
  controlledStates?: ControlledDocumentState[]
): Promise<ControlledDocument[]> {
  let query: DocumentQuery<ControlledDocument> = { template, seqNumber }
  if (template != null) query = { ...query, template }
  if (states != null) query = { ...query, state: { $in: states } }
  if (controlledStates != null) query = { ...query, controlledState: { $in: controlledStates } }

  const allDocs = await control.findAll(documents.class.ControlledDocument, query, {
    sort: { major: SortingOrder.Descending, minor: SortingOrder.Descending, patch: SortingOrder.Descending }
  })

  return allDocs.filter(predicate)
}

function makeDocEffective (doc: ControlledDocument, txFactory: TxFactory): Tx {
  return txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, getEffectiveDocUpdate())
}

function archiveDocs (docs: ControlledDocument[], txFactory: TxFactory): Tx[] {
  const res: Tx[] = []

  for (const doc of docs) {
    res.push(
      txFactory.createTxUpdateDoc<ControlledDocument>(doc._class, doc.space, doc._id, {
        state: DocumentState.Archived,
        controlledState: undefined
      })
    )
  }

  return res
}

function updateMeta (doc: ControlledDocument, txFactory: TxFactory): Tx[] {
  return [
    txFactory.createTxUpdateDoc(doc.attachedToClass, doc.space, doc.attachedTo, {
      title: `${getDocumentId(doc)} ${doc.title}`
    })
  ]
}

function updateAuthor (doc: ControlledDocument, txFactory: TxFactory): Tx[] {
  return [
    txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
      author: doc.owner
    })
  ]
}

// TODO: Find a way to avoid duplicate logic and reuse createTrainingRequest() from `training-resources`
async function createDocumentTrainingRequest (doc: ControlledDocument, control: TriggerControl): Promise<Tx[]> {
  if (!control.hierarchy.hasMixin(doc, documents.mixin.DocumentTraining)) {
    return []
  }

  const documentTraining: DocumentTraining = control.hierarchy.as<Document, DocumentTraining>(
    doc,
    documents.mixin.DocumentTraining
  )
  if (
    doc.owner === undefined ||
    !documentTraining.enabled ||
    documentTraining.training === null ||
    documentTraining.trainees.length + documentTraining.roles.length === 0
  ) {
    return []
  }

  const trainingObject = (await control.findAll(training.class.Training, { _id: documentTraining.training }))[0] ?? null

  if (trainingObject === null) {
    console.error(`Planned training ${documentTraining.training} not found`)
    return []
  }
  if (trainingObject.state !== TrainingState.Released) {
    console.error(`Planned training ${documentTraining.training} has not been released`)
    return []
  }

  if (doc.effectiveDate === undefined) {
    return []
  }

  const dueDate: Timestamp | null =
    documentTraining.dueDays === null ? null : doc.effectiveDate + documentTraining.dueDays * 24 * 60 * 60 * 1000

  // TODO: Encapsulate training request creation logic in training plugin?
  const modifiedBy = (
    await control.modelDb.findAll<Account>(contact.class.PersonAccount, {
      person: doc.owner
    })
  ).shift()?._id

  let trainees: Array<Ref<Employee>> = documentTraining.trainees
  const roles = documentTraining.roles
  if (roles.length > 0) {
    const traineesMap = new Map<Ref<Employee>, boolean>(trainees.map((employeeRef) => [employeeRef, true]))

    const space = (
      await control.findAll(
        core.class.TypedSpace,
        {
          _id: trainingObject.space
        },
        {
          lookup: {
            type: core.class.SpaceType
          }
        }
      )
    ).shift()

    if (space === undefined) {
      console.error(`Space #${trainingObject.space} not found`)
      return []
    }

    const spaceType = space.$lookup?.type

    if (spaceType === undefined) {
      console.error(`Space type #${space.type} not found`)
      return []
    }

    const mixin = control.hierarchy.as(space, spaceType.targetClass) as unknown as RolesAssignment
    const accountRefs = roles.reduce<Array<Ref<Account>>>(
      (accountRefs, roleId) => [...accountRefs, ...(mixin[roleId] ?? [])],
      []
    )

    const personAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
      _id: { $in: accountRefs as Array<Ref<PersonAccount>> }
    })

    const employeeRefs = personAccounts.map((personAccount) => personAccount.person as Ref<Employee>)
    const employees = await control.findAll(contact.mixin.Employee, {
      _id: { $in: employeeRefs }
    })

    for (const employee of employees) {
      traineesMap.set(employee._id, true)
    }

    trainees = [...traineesMap.keys()]
  }

  if (trainees.length === 0) {
    return []
  }

  const innerTx = control.txFactory.createTxCreateDoc<TrainingRequest>(
    training.class.TrainingRequest,
    trainingObject.space,
    {
      trainees,
      dueDate,
      maxAttempts: documentTraining.maxAttempts,
      owner: doc.owner,
      attempts: 0,
      canceledBy: null,
      canceledOn: null,
      attachedTo: trainingObject._id,
      attachedToClass: trainingObject._class,
      collection: 'requests'
    },
    undefined,
    undefined,
    modifiedBy
  )
  // Force space to make transaction persistent and raise notifications
  innerTx.space = core.space.Tx

  const resTx = control.txFactory.createTxCollectionCUD(
    trainingObject._class,
    trainingObject._id,
    trainingObject.space,
    'requests',
    innerTx,
    undefined,
    modifiedBy
  )
  // Force space to make transaction persistent and raise notifications
  resTx.space = core.space.Tx

  await control.apply([resTx], true)

  return []
}

async function getDocsOlderThanDoc (
  doc: Document,
  control: TriggerControl,
  states?: DocumentState[],
  controlledStates?: ControlledDocumentState[]
): Promise<ControlledDocument[]> {
  return await getDocs(
    control,
    doc.seqNumber,
    (another: Document) => doc.major > another.major || (doc.major === another.major && doc.minor > another.minor),
    doc.template,
    states,
    controlledStates
  )
}

function updateTemplate (doc: ControlledDocument, olderEffective: ControlledDocument[], control: TriggerControl): Tx[] {
  if (!control.hierarchy.hasMixin(doc, documents.mixin.DocumentTemplate)) {
    return []
  }

  const templates = olderEffective
    .filter((p) => control.hierarchy.hasMixin(p, documents.mixin.DocumentTemplate))
    .map((p) => control.hierarchy.as<Document, DocumentTemplate>(p, documents.mixin.DocumentTemplate))
    .sort((a, b) => b.sequence - a.sequence)

  if (templates.length > 0) {
    const { sequence, docPrefix } = templates[0]
    return [
      control.txFactory.createTxMixin<Document, DocumentTemplate>(
        doc._id,
        doc._class,
        doc.space,
        documents.mixin.DocumentTemplate,
        { sequence, docPrefix }
      )
    ]
  }

  return []
}

export async function OnDocHasBecomeEffective (
  tx: TxUpdateDoc<ControlledDocument>,
  control: TriggerControl
): Promise<Tx[]> {
  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 })).shift()
  if (doc === undefined) {
    return []
  }

  const olderEffective = await getDocsOlderThanDoc(doc, control, [DocumentState.Effective])

  return [
    ...updateAuthor(doc, control.txFactory),
    ...archiveDocs(olderEffective, control.txFactory),
    ...updateMeta(doc, control.txFactory),
    ...updateTemplate(doc, olderEffective, control),
    ...(await createDocumentTrainingRequest(doc, control))
  ]
}

export async function OnDocPlannedEffectiveDateChanged (
  tx: TxUpdateDoc<ControlledDocument>,
  control: TriggerControl
): Promise<Tx[]> {
  if (!('plannedEffectiveDate' in tx.operations)) {
    return []
  }

  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 })).shift()
  if (doc === undefined) {
    return []
  }

  // make doc effective immediately if required
  if (tx.operations.plannedEffectiveDate === 0 && doc.controlledState === ControlledDocumentState.Approved) {
    // Create with not derived tx factory in order for notifications to work
    const factory = new TxFactory(control.txFactory.account)
    await control.apply([makeDocEffective(doc, factory)], true)
  }

  return []
}

export async function OnDocApprovalRequestApproved (
  tx: TxCollectionCUD<ControlledDocument, DocumentApprovalRequest>,
  control: TriggerControl
): Promise<Tx[]> {
  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId })).shift()
  if (doc == null || doc.plannedEffectiveDate !== 0) {
    return []
  }

  // Create with not derived tx factory in order for notifications to work
  const factory = new TxFactory(control.txFactory.account)
  await control.apply([makeDocEffective(doc, factory)], true)

  // make doc effective immediately
  return []
}

/**
 * @public
 */
export async function OnWorkspaceOwnerAdded (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  let ownerId: Ref<PersonAccount> | undefined
  if (control.hierarchy.isDerived(tx._class, core.class.TxCreateDoc)) {
    const createTx = tx as TxCreateDoc<PersonAccount>

    if (createTx.attributes.role === AccountRole.Owner) {
      ownerId = createTx.objectId
    }
  } else if (control.hierarchy.isDerived(tx._class, core.class.TxUpdateDoc)) {
    const updateTx = tx as TxUpdateDoc<PersonAccount>

    if (updateTx.operations.role === AccountRole.Owner) {
      ownerId = updateTx.objectId
    }
  }

  if (ownerId === undefined) {
    return []
  }

  const targetSpace = (
    await control.findAll(documents.class.OrgSpace, {
      _id: documents.space.QualityDocuments
    })
  )[0]

  if (targetSpace === undefined) {
    return []
  }

  if (
    targetSpace.owners === undefined ||
    targetSpace.owners.length === 0 ||
    targetSpace.owners[0] === core.account.System
  ) {
    const updTx = control.txFactory.createTxUpdateDoc(documents.class.OrgSpace, targetSpace.space, targetSpace._id, {
      owners: [ownerId]
    })
    return [updTx]
  }

  return []
}

export async function documentTextPresenter (doc: ControlledDocument): Promise<string> {
  return doc.title
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnCollaborativeSectionDeleted,
    OnDocPlannedEffectiveDateChanged,
    OnDocApprovalRequestApproved,
    OnDocHasBecomeEffective,
    OnWorkspaceOwnerAdded
  },
  function: {
    ControlledDocumentTextPresenter: documentTextPresenter
  }
})
