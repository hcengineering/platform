//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Class, Doc, Ref } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@anticrm/model'
import contact, { DOMAIN_CONTACT } from '@anticrm/model-contact'
import recruit from '@anticrm/recruit'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Recruit: Migrate ${msg} ${result.updated}`)
  }
}
export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // Move all candidates to mixins.
    await client.update(DOMAIN_CONTACT, {
      _class: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      $rename: {
        title: `${recruit.mixin.Candidate}.title`,
        applications: `${recruit.mixin.Candidate}.applications`,
        remote: `${recruit.mixin.Candidate}.remote`,
        source: `${recruit.mixin.Candidate}.source`,
        onsite: `${recruit.mixin.Candidate}.onsite`
      }
    })

    await client.update(DOMAIN_CONTACT, {
      _class: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      _class: contact.class.Person
    })
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
