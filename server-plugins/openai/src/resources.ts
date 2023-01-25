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
  TxProcessor
} from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'
import got from 'got'
import { convert } from 'html-to-text'
import { chunks, encode } from './encoder/encoder'
import openai, { OpenAIConfiguration, openAIRatelimitter } from './plugin'
import recruit, { ApplicantMatch } from '@hcengineering/recruit'

const model = 'text-davinci-003'

const defaultOptions = {
  max_tokens: 4000,
  temperature: 0.9,
  top_p: 1,
  n: 1,
  stop: null as string | null
}

async function performCompletion (
  prompt: string,
  options: typeof defaultOptions,
  config: OpenAIConfiguration
): Promise<any> {
  const ep = config.endpoint + '/completions'

  const tokens = encode(prompt).length

  let response: any
  while (true) {
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
                model,
                prompt,
                max_tokens: options.max_tokens - tokens,
                temperature: options.temperature,
                top_p: options.top_p,
                n: options.n,
                stream: false,
                logprobs: null,
                stop: options.stop
              },
              timeout: 180000
            })
            .json()
      )
      break
    } catch (e: any) {
      const msg = (e.message as string) ?? ''
      if (
        msg.includes('Response code 429 (Too Many Requests)') ||
        msg.includes('Response code 503 (Service Unavailable)')
      ) {
        await new Promise((resolve) => {
          setTimeout(resolve, 1000)
        })
        continue
      }
      console.error(e)
      return []
    }
  }
  return response
}
/**
 * @public
 */
export async function OnGPTRequest (tx: Tx, tc: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)

  if (tc.hierarchy.isDerived(actualTx._class, core.class.TxCUD) && actualTx.modifiedBy !== openai.account.GPT) {
    const cud: TxCUD<Doc> = actualTx as TxCUD<Doc>
    //
    if (tc.hierarchy.isDerived(cud.objectClass, chunter.class.Comment)) {
      return await handleComment(tx, tc)
    }
    if (tc.hierarchy.isDerived(cud.objectClass, recruit.class.ApplicantMatch)) {
      return await handleApplicantMatch(tx, tc)
    }
  }
  return []
}

async function handleComment (tx: Tx, tc: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  const cud: TxCUD<Doc> = actualTx as TxCUD<Doc>

  let msg = ''
  //
  if (actualTx._class === core.class.TxCreateDoc) {
    msg = (cud as TxCreateDoc<Comment>).attributes.message
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
      const values: Record<string, any> = {
        ...indexedData.attributes,
        ...parentDoc,
        summary: indexedData.fullSummary,
        shortSummary: indexedData.shortSummary
      }
      if (matches.length > 0) {
        if (indexedData !== undefined) {
          // Fill values in prompt.
          for (const m of matches) {
            const val = values[m]
            if (val !== undefined) {
              prompt = prompt.replace(`\${${m}}`, val)
            }
          }
        }
      }

      const options = parseOptions(split)

      const response = await performCompletion(prompt, options, config)
      const result: Tx[] = []

      let finalMsg = msg + '</br>'

      for (const choices of response.choices) {
        const val = (choices.text as string).trim().split('\n').join('\n<br/>')
        finalMsg += `<p>Answer:\n<br/>${val}</p>`
      }
      const msgTx = tc.txFactory.createTxUpdateDoc<Comment>(
        cud.objectClass,
        cud.objectSpace,
        cud.objectId as Ref<Comment>,
        {
          message: finalMsg
        }
      )
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

      // Store response transactions
      await tc.txFx(async (st) => {
        for (const t of result) {
          await st.tx(t)
        }
      })
      return result
    }
  }
  return []
}
async function handleApplicantMatch (tx: Tx, tc: TriggerControl): Promise<Tx[]> {
  const [config] = await tc.findAll(openai.class.OpenAIConfiguration, {})

  if (!(config?.enabled ?? false)) {
    return []
  }
  const actualTx = TxProcessor.extractTx(tx)
  const parentTx = tx as TxCollectionCUD<Doc, ApplicantMatch>

  if (actualTx._class !== core.class.TxCreateDoc) {
    return []
  }
  const cud: TxCreateDoc<ApplicantMatch> = actualTx as TxCreateDoc<ApplicantMatch>

  const options: typeof defaultOptions = {
    ...defaultOptions,
    temperature: 0.1
  }

  const maxAnswerTokens = 500
  const maxVacancyTokens = options.max_tokens - maxAnswerTokens / 2
  const maxCandidateTokens = maxVacancyTokens

  let candidateText = cud.attributes.summary

  candidateText = convert(candidateText, {
    preserveNewlines: true,
    selectors: [{ selector: 'img', format: 'skip' }]
  })

  candidateText = chunks(candidateText, maxCandidateTokens)[0]

  let vacancyText = cud.attributes.vacancy

  vacancyText = convert(vacancyText, {
    preserveNewlines: true,
    selectors: [{ selector: 'img', format: 'skip' }]
  })
  vacancyText = chunks(vacancyText, maxVacancyTokens)[0]

  // Enabled, we could complete.

  const text = `'Considering following vacancy:\n ${vacancyText}\n write if following candidate good for vacancy and why:\n ${candidateText}\n`

  const response = await performCompletion(text, options, config)
  const result: Tx[] = []

  let finalMsg = ''

  for (const choices of response.choices) {
    let val = (choices.text as string).trim()
    // Add new line before Reason:
    val = val.split('\n\n').join('\n')
    val = val.replace('Reason:', '\nReason:')
    val = val.replace('Candidate is', '\nCandidate is')
    val = val.replace(/Match score: (\d+\/\d+|\d+%) /gi, (val) => val + '\n')

    val = val.split('\n').join('\n<br/>')
    finalMsg += `<p>${val}</p>`
  }
  const msgTx = tc.txFactory.createTxUpdateDoc<ApplicantMatch>(cud.objectClass, cud.objectSpace, cud.objectId, {
    response: finalMsg,
    complete: true
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

  // Store response transactions
  await tc.txFx(async (st) => {
    for (const t of result) {
      await st.tx(t)
    }
  })
  return result
}

/**
 * @public
 */
export const openAIPluginImpl = async () => ({
  trigger: {
    OnGPTRequest
  }
})
function parseOptions (split: string[]): typeof defaultOptions {
  const options = defaultOptions
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
  return options
}
