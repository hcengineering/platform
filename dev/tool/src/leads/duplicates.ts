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

import contact, { EmployeeAccount } from '@anticrm/contact'
import { Ref, TxOperations } from '@anticrm/core'
import { connect } from '@anticrm/server-tool'
import { deepEqual } from 'fast-equals'

export async function removeDuplicates (transactorUrl: string, dbName: string): Promise<void> {
  const connection = await connect(transactorUrl, dbName)

  try {
    console.log('loading cvs document...')

    const client = new TxOperations(connection, 'core:account:lead-importer' as Ref<EmployeeAccount>)

    const organizationNames = await client.findAll(contact.class.Organization, {})

    const unicOrg = organizationNames.filter((it, idx, arr) => idx === arr.findIndex((nit) => it.name === nit.name))
    let total = 0
    for (const org of unicOrg) {
      const sameName = organizationNames.filter((it) => it.name === org.name)

      if (sameName.length > 1) {
        console.log('duplicate orgs', org.name)
        total += sameName.length - 1
      } else {
        continue
      }

      const target = sameName[0]
      for (const oi of sameName.slice(1)) {
        const { _id: tid, modifiedOn: _1, ...tdata } = target
        const { _id: oid, modifiedOn: _2, ...oiddata } = oi
        if (deepEqual(tdata, oiddata)) {
          // If same we could remove oid
          await client.remove(oi)
          console.log('removed', oid)
        }
      }
    }
    console.log('Total duplicates', total)
  } catch (err: any) {
    console.error(err)
  } finally {
    await connection.close()
  }
}
