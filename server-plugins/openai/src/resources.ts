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

/* eslint-disable @typescript-eslint/explicit-function-return-type */

import chunter, { Comment } from '@hcengineering/chunter'
import core, {
  Doc,
  DocIndexState,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc
} from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'
import got from 'got'
import { convert } from 'html-to-text'
import { encode } from './encoder/encoder'
import openai, { openAIRatelimitter } from './plugin'

/**
 * @public
 */
export async function OnGPTRequest (tx: Tx, tc: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)

  if (tc.hierarchy.isDerived(actualTx._class, core.class.TxCUD) && actualTx.modifiedBy !== openai.account.GPT) {
    const cud: TxCUD<Doc> = actualTx as TxCUD<Doc>
    //
    if (tc.hierarchy.isDerived(cud.objectClass, chunter.class.Comment)) {
      let msg = ''
      //
      if (actualTx._class === core.class.TxCreateDoc) {
        msg = (cud as TxCreateDoc<Comment>).attributes.message
      } else if (actualTx._class === core.class.TxUpdateDoc) {
        msg = (cud as TxUpdateDoc<Comment>).operations.message ?? ''
      }

      const text = convert(msg, {
        preserveNewlines: true,
        selectors: [{ selector: 'img', format: 'skip' }]
      })

      if (text.toLocaleLowerCase().startsWith('gpt:')) {
        const [config] = await tc.findAll(openai.class.OpenAIConfiguration, {})

        if (config?.enabled ?? false) {
          // Elanbed, we could complete.

          const split = text.split('\n')
          let prompt = split.slice(1).join('\n').trim()

          // Do prompt modifications.

          const matches: string[] = []
          for (const m of prompt.matchAll(/\${(\w+)}/gm)) {
            for (const mm of m.values()) {
              if (!mm.startsWith('${')) {
                matches.push(mm)
              }
            }
          }

          const parentTx = tx as TxCollectionCUD<Doc, Comment>

          const [indexedData] = await tc.findAll(core.class.DocIndexState, {
            _id: parentTx.objectId as Ref<DocIndexState>
          })
          const [parentDoc] = await tc.findAll(parentTx.objectClass, { _id: parentTx.objectId as Ref<DocIndexState> })
          if (matches.length > 0) {
            if (indexedData !== undefined) {
              // Fill values in prompt.
              for (const m of matches) {
                const val = indexedData.attributes[m] ?? (parentDoc as any)[m]
                if (val !== undefined) {
                  prompt = prompt.replace(`\${${m}}`, val)
                }
              }
            }
          }

          const options = {
            max_tokens: 4000,
            temperature: 0.9,
            top_p: 1,
            n: 1,
            stop: null as string | null
          }
          const configLine = split[0].slice(4).split(',')
          for (const cfg of configLine) {
            const vals = cfg.trim().split('=')
            if (vals.length === 2) {
              switch (vals[0].trim()) {
                case 'max_tokens':
                  options.max_tokens = parseInt(vals[1])
                  break
                case 'temperature':
                  options.temperature = parseFloat(vals[1])
                  break
                case 'top_p':
                  options.top_p = parseInt(vals[1])
                  break
                case 'n':
                  options.n = parseInt(vals[1])
                  break
                case 'stop':
                  options.stop = vals[1]
                  break
              }
            }
          }

          const ep = config.endpoint + '/completions'

          const tokens = encode(prompt).length

          let response: any
          try {
            response = await openAIRatelimitter.exec(
              async () =>
                await got
                  .post(ep, {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${config.token}`
                    },
                    json: {
                      model: 'text-davinci-003',
                      prompt,
                      max_tokens: options.max_tokens - tokens,
                      temperature: options.temperature,
                      top_p: options.top_p,
                      n: options.n,
                      stream: false,
                      logprobs: null,
                      stop: options.stop
                    },
                    timeout: 60000
                  })
                  .json()
            )
          } catch (e: any) {
            console.error(e)
          }
          console.log('response is good')
          const result: Tx[] = []

          for (const choices of response.choices) {
            const msgTx = tc.txFactory.createTxCreateDoc(chunter.class.Comment, tx.objectSpace, {
              message: 'gpt Answer:\n<br/>' + (choices.text as string),
              attachedTo: parentTx.objectId,
              attachedToClass: parentTx.objectClass,
              collection: parentTx.collection
            })
            // msgTx.modifiedBy = openai.account.GPT
            const col = tc.txFactory.createTxCollectionCUD(
              parentTx.objectClass,
              parentTx.objectId,
              parentTx.objectSpace,
              parentTx.collection,
              msgTx
            )
            // col.modifiedBy = openai.account.GPT
            result.push(col)
          }

          // Store response transactions
          await tc.txFx(async (st) => {
            for (const t of result) {
              await st.tx(t)
            }
          })
          return result
        }
      }
    }
  }
  return []
}

/**
 * @public
 */
export const openAIPluginImpl = async () => ({
  trigger: {
    OnGPTRequest
  }
})
