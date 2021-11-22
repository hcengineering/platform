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

import express from 'express'
import { resolve, join } from 'path'

const port = process.env.PORT ?? 8080
const app = express()

const dist = resolve(__dirname, 'dist')

console.log('serving static files from', dist)

app.use(express.static(dist, { maxAge: '10m' }))

app.get('*', function (request, response) {
  response.sendFile(join(dist, 'index.html'))
})

const server = app.listen(port)
console.log(`server started on port ${port}`)

const close = (): void => {
  server.close()
}
process.on('SIGINT', close)
process.on('SIGTERM', close)
process.on('exit', close)
