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

import contact from '@hcengineering/contact'
import core, {
  AttachedDoc,
  concatLink,
  Doc,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import recruit, { Applicant, recruitId, Vacancy } from '@hcengineering/recruit'
import { TriggerControl } from '@hcengineering/server-core'
import { addAssigneeNotification } from '@hcengineering/server-task-resources'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function vacancyHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const vacancy = doc as Vacancy
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${recruitId}/${vacancy._id}/#${recruit.component.EditVacancy}|${vacancy._id}|${vacancy._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">${vacancy.name}</a>`
}

/**
 * @public
 */
export async function vacancyTextPresenter (doc: Doc): Promise<string> {
  const vacancy = doc as Vacancy
  return `${vacancy.name}`
}

/**
 * @public
 */
export async function applicationHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const applicant = doc as Applicant
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${recruitId}/${applicant.space}/#${view.component.EditDoc}|${applicant._id}|${applicant._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">APP-${applicant.number}</a>`
}

/**
 * @public
 */
export async function applicationTextPresenter (doc: Doc): Promise<string> {
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
    await handleApplicantCreate(control, cud, res, tx)
  }

  if (actualTx._class === core.class.TxUpdateDoc) {
    await handleVacancyUpdate(control, cud, res)
    await handleApplicantUpdate(control, cud, res, tx)
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

async function handleApplicantUpdate (control: TriggerControl, cud: TxCUD<Doc>, res: Tx[], tx: Tx): Promise<void> {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Applicant)) {
    const updateTx = cud as TxUpdateDoc<Applicant>
    if (updateTx.operations.assignee != null) {
      const applicant = (
        await control.findAll(recruit.class.Applicant, { _id: updateTx.objectId }, { limit: 1 })
      ).shift()

      if (applicant?.assignee != null) {
        await addAssigneeNotification(
          control,
          res,
          applicant,
          applicant.assignee,
          tx as TxCollectionCUD<Applicant, AttachedDoc>
        )
      }
    }
  }
}

async function handleApplicantCreate (control: TriggerControl, cud: TxCUD<Doc>, res: Tx[], tx: Tx): Promise<void> {
  if (control.hierarchy.isDerived(cud.objectClass, recruit.class.Applicant)) {
    const createTx = cud as TxCreateDoc<Applicant>
    const applicant = TxProcessor.createDoc2Doc(createTx)
    if (applicant.assignee != null) {
      await addAssigneeNotification(
        control,
        res,
        applicant,
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
