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

import { ACCOUNT_DB, methods } from '@anticrm/account'
import platform, { Response, Request, serialize, Status, Severity } from '@anticrm/platform'
import { MongoClient, Db } from 'mongodb'

import Koa from 'koa'
import Router from 'koa-router'

import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

const dbUri = process.env.MONGO_URL
if (dbUri === undefined) {
  console.log('Please provide mongodb url')
  process.exit(1)
}

let client: MongoClient

const app = new Koa()
const router = new Router()

router.post('rpc', '/', async (ctx) => {
  const request = ctx.request.body
  const method = (methods as { [key: string]: (db: Db, request: Request<any>) => Response<any> })[request.method]
  if (method === undefined) {
    const response: Response<void> = {
      id: request.id,
      error: new Status(Severity.ERROR, platform.status.UnknownMethod, { method: request.method })
    }

    ctx.body = serialize(response)
  }

  if (client === undefined) {
    client = await MongoClient.connect(dbUri)
  }
  const db = client.db(ACCOUNT_DB)
  const result = await method(db, request)
  console.log(result)
  ctx.body = result
})

app.use(cors())
app.use(bodyParser())
app.use(router.routes()).use(router.allowedMethods())

app.listen(3000, () => {
  console.log('server started on port 3000')
})
