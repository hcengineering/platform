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

import { readResponse, serialize } from '@anticrm/platform'
import { start, _Token } from '../server'
import { encode } from 'jwt-simple'
import WebSocket from 'ws'

describe('server', () => {
  start(() => ({
    ping: () => {}
  }), 3333)

  function connect (): WebSocket {
    const payload: _Token = {
      workspace: 'latest'
    }
    const token = encode(payload, 'secret')
    return new WebSocket('ws://localhost:3333/' + token)
  }

  it('should connect to server', (done) => {
    const conn = connect()
    conn.on('open', () => {
      conn.close()
      done()
    })
  })

  it('should not connect to server without token', (done) => {
    const conn = new WebSocket('ws://localhost:3333/xyz')
    conn.on('error', () => {
      conn.close()
      done()
    })
  })

  it('should send many requests', (done) => {
    const conn = connect()
    const total = 10
    // const start = Date.now()
    conn.on('open', () => {
      for (let i = 0; i < total; i++) {
        conn.send(serialize({ method: 'ping', params: [], id: i }))
      }
    })
    let received = 0
    conn.on('message', (msg: string) => {
      readResponse(msg)
      if (++received === total) {
        // console.log('resp:', resp, ' Time: ', Date.now() - start)
        conn.close()
        done()
      }
    })
  })
})
