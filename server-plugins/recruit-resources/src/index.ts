//
// Copyright © 2022 Hardcore Engineering Inc.
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
//

import contact from '@anticrm/contact'
import core, {
  AttachedDoc,
  Doc,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import recruit, { Applicant, recruitId, Vacancy } from '@anticrm/recruit'
import { TriggerControl } from '@anticrm/server-core'
import { addAssigneeNotification } from '@anticrm/server-task-resources'
import view from '@anticrm/view'
import { workbenchId } from '@anticrm/workbench'

/**
 * @public
 */
export function vacancyHTMLPresenter (doc: Doc): string {
  const vacancy = doc as Vacancy
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${recruitId}/${vacancy._id}/#${recruit.component.EditVacancy}|${vacancy._id}|${vacancy._class}">${vacancy.name}</a>`
}

/**
 * @public
 */
export function vacancyTextPresenter (doc: Doc): string {
  const vacancy = doc as Vacancy
  return `${vacancy.name}`
}

/**
 * @public
 */
export function applicationHTMLPresenter (doc: Doc): string {
  const applicant = doc as Applicant
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${recruitId}/${applicant.space}/#${view.component.EditDoc}|${applicant._id}|${applicant._class}">APP-${applicant.number}</a>`
}

/**
 * @public
 */
export function applicationTextPresenter (doc: Doc): string {
  const applicant = doc as Applicant
  return `APP-${applicant.number}`
}

/**
 * @public
 */
export async function OnRecruitUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)

  const res: Tx[] = []

  const cud = actualTx as TxCUD<Doc>

  if (actualTx._class === core.class.TxCreateDoc) {
    handleVacancyCreate(control, cud, actualTx, res)
    await handleApplicantCreate(control, cud, actualTx, res, tx)
  }

  if (actualTx._class === core.class.TxUpdateDoc) {
    await handleVacancyUpdate(control, cud, res)
    await handleApplicantUpdate(control, cud, actualTx, res, tx)
  }
  if (actualTx._class === core.class.TxRemoveDoc) {
    await handleVacancyRemove(control, cud, actualTx)
  }
  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    VacancyHTMLPresenter: vacancyHTMLPresenter,
    VacancyTextPresenter: vacancyTextPresenter,
    ApplicationHTMLPresenter: applicationHTMLPresenter,
    ApplicationTextPresenter: applicationTextPresenter
  },
  trigger: {
    OnRecruitUpdate
  }
})
async function handleVacancyUpdate (control: TriggerControl, cud: TxCUD<Doc>, res: Tx[]): Promise<void> {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Vacancy)) {
    const updateTx = cud as TxUpdateDoc<Vacancy>
    if (updateTx.operations.company !== undefined) {
      // It could be null or new value
      const txes = await control.findAll(core.class.TxCUD, {
        objectId: updateTx.objectId,
        _id: { $nin: [updateTx._id] }
      })
      const vacancy = TxProcessor.buildDoc2Doc(txes) as Vacancy
      if (vacancy.company != null) {
        // We have old value
        res.push(
          control.txFactory.createTxMixin(
            vacancy.company,
            contact.class.Organization,
            contact.space.Contacts,
            recruit.mixin.VacancyList,
            {
              $inc: { vacancies: -1 }
            }
          )
        )
      }
      if (updateTx.operations.company !== null) {
        res.push(
          control.txFactory.createTxMixin(
            updateTx.operations.company,
            contact.class.Organization,
            contact.space.Contacts,
            recruit.mixin.VacancyList,
            {
              $inc: { vacancies: 1 }
            }
          )
        )
      }
    }
  }
}

async function handleVacancyRemove (control: TriggerControl, cud: TxCUD<Doc>, actualTx: Tx): Promise<void> {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Vacancy)) {
    const removeTx = actualTx as TxRemoveDoc<Vacancy>
    // It could be null or new value
    const txes = await control.findAll(core.class.TxCUD, {
      objectId: removeTx.objectId,
      _id: { $nin: [removeTx._id] }
    })
    const vacancy = TxProcessor.buildDoc2Doc(txes) as Vacancy
    const res: Tx[] = []
    if (vacancy.company != null) {
      // We have old value
      res.push(
        control.txFactory.createTxMixin(
          vacancy.company,
          contact.class.Organization,
          contact.space.Contacts,
          recruit.mixin.VacancyList,
          {
            $inc: { vacancies: -1 }
          }
        )
      )
    }
  }
}

async function handleApplicantUpdate (
  control: TriggerControl,
  cud: TxCUD<Doc>,
  actualTx: Tx,
  res: Tx[],
  tx: Tx
): Promise<void> {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Applicant)) {
    const updateTx = actualTx as TxUpdateDoc<Applicant>
    if (updateTx.operations.assignee != null) {
      const applicant = (
        await control.findAll(recruit.class.Applicant, { _id: updateTx.objectId }, { limit: 1 })
      ).shift()

      if (applicant?.assignee != null) {
        await addAssigneeNotification(
          control,
          res,
          applicant,
          applicationTextPresenter(applicant),
          applicant.assignee,
          tx as TxCollectionCUD<Applicant, AttachedDoc>
        )
      }
    }
  }
}

async function handleApplicantCreate (
  control: TriggerControl,
  cud: TxCUD<Doc>,
  actualTx: Tx,
  res: Tx[],
  tx: Tx
): Promise<void> {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Applicant)) {
    const createTx = actualTx as TxCreateDoc<Applicant>
    const applicant = TxProcessor.createDoc2Doc(createTx)
    if (applicant.assignee != null) {
      await addAssigneeNotification(
        control,
        res,
        applicant,
        applicationTextPresenter(applicant),
        applicant.assignee,
        tx as TxCollectionCUD<Applicant, AttachedDoc>
      )
    }
  }
}

function handleVacancyCreate (control: TriggerControl, cud: TxCUD<Doc>, actualTx: Tx, res: Tx[]): void {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Vacancy)) {
    const createTx = actualTx as TxCreateDoc<Vacancy>
    const vacancy = TxProcessor.createDoc2Doc(createTx)
    if (vacancy.company !== undefined) {
      res.push(
        control.txFactory.createTxMixin(
          vacancy.company,
          contact.class.Organization,
          contact.space.Contacts,
          recruit.mixin.VacancyList,
          {
            $inc: { vacancies: 1 }
          }
        )
      )
    }
  }
}
