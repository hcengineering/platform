//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { createModel } from '.'

const url = process.env.MONGO_URL
if (url === undefined) {
  console.error('please provide mongodb url.')
  process.exit(1)
}

const db = process.argv[2]
if (db === undefined) {
  console.error('Please specify the database.')
  process.exit(1)
}

console.log('creating model...')
createModel(url, db).then(rows => {
  console.log(`done, ${rows} rows inserted.`)
}).catch(error => { console.error(error) })
