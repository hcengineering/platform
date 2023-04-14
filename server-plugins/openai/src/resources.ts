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
import recruit, { ApplicantMatch } from '@hcengineering/recruit'
import type { TriggerControl } from '@hcengineering/server-core'
import got from 'got'
import { convert } from 'html-to-text'
import { chunks } from './encoder/encoder'
import openai, { OpenAIConfiguration, openAIRatelimitter } from './plugin'

const model = 'text-davinci-003'

const defaultOptions = {
  max_tokens: 4000,
  temperature: 0.2,
  top_p: 1,
  n: 1,
  stop: null as string | null
}

async function performCompletion (
  prompt: string,
  options: typeof defaultOptions,
  config: OpenAIConfiguration,
  maxLen: number
): Promise<any> {
  const ep = config.endpoint + '/completions'

  const chunkedPrompt = chunks(prompt, options.max_tokens - maxLen)[0]

  let response: any
  let timeout = 50
  const st = Date.now()
  const request: Record<string, any> = {
    model,
    prompt: chunkedPrompt,
    max_tokens: maxLen,
    temperature: options.temperature,
    top_p: options.top_p,
    n: options.n,
    stream: false
  }
  if (options.stop != null) {
    request.stop = options.stop
  }
  while (true) {
    try {
      console.info('Sending request to OpenAI')
      response = await openAIRatelimitter.exec(
        async () =>
          await got
            .post(ep, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.token}`
              },
              json: request,
              timeout: 60000
            })
            .json()
      )
      break
    } catch (e: any) {
      const msg = (e.message as string) ?? ''
      if (
        msg.includes('Response code 429 (Too Many Requests)') ||
        msg.includes('Response code 503 (Service Unavailable)') ||
        msg.includes('Response code 400 (Bad Request)')
      ) {
        timeout += 100
        console.info('Too many requests, Waiting 1sec to retry.')
        await new Promise((resolve) => {
          setTimeout(resolve, timeout)
        })
        continue
      }
      if (Date.now() - st > 60000) {
        return {}
      }
      console.error(e)
      return {}
    }
  }
  return response
}
/**
 * @public
 */
export async function AsyncOnGPTRequest (tx: Tx, tc: TriggerControl): Promise<Tx[]> {
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

      const response = await performCompletion(prompt, options, config, 1024)
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
      return result
    }
  }
  return []
}

function getText (response: any): string | undefined {
  let result = ''
  for (const choices of response?.choices ?? []) {
    let val = (choices.text as string).trim()
    // Add new line before Reason:
    val = val.split('\n\n').join('\n')
    val = val.replace('Reason:', '\nReason:')
    val = val.replace('Candidate is', '\nCandidate is')
    val = val.replace(/Match score: (\d+\/\d+|\d+%) /gi, (val) => val + '\n')

    val = val.split('\n').join('\n<br/>')
    result += val.trim()
  }
  if (result.length === 0) {
    return undefined
  }
  return result
}

async function summarizeCandidate (config: OpenAIConfiguration, chunks: string[], maxLen: number): Promise<string> {
  const options: typeof defaultOptions = {
    ...defaultOptions,
    temperature: 0.1
  }
  if (chunks.length === 1) {
    return chunks[0]
  }
  const candidateSummaryRequest = `I want you to act as a recruiter. 
  I will provide some information about candidate, and it will be your job to come up with short and essential summary describing resume. 
  My first request is "I need help to summarize my CV.” ${chunks.join(' ')}`
  return getText(await performCompletion(candidateSummaryRequest, options, config, maxLen)) ?? chunks[0]
}

async function summarizeVacancy (config: OpenAIConfiguration, chunks: string[], maxLen: number): Promise<string> {
  const options: typeof defaultOptions = {
    ...defaultOptions,
    temperature: 0.1
  }
  if (chunks.length === 1) {
    return chunks[0]
  }
  const candidateSummaryRequest = `I want you to act as a recruiter. 
  I will provide some information about vacancy, and it will be your job to come up with short and essential summary describing vacancy. 
  My first request is "I need help to summarize my Vacancy description.” ${chunks.join(' ')}`
  return getText(await performCompletion(candidateSummaryRequest, options, config, maxLen)) ?? chunks[0]
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

  const maxAnswerTokens = 256
  const maxVacancyTokens = options.max_tokens - maxAnswerTokens / 2
  const maxCandidateTokens = maxVacancyTokens

  let candidateText = cud.attributes.summary

  candidateText = convert(candidateText, {
    preserveNewlines: true,
    selectors: [{ selector: 'img', format: 'skip' }]
  })

  const candidateTextC = chunks(candidateText, maxCandidateTokens)

  candidateText = await summarizeCandidate(config, candidateTextC, maxCandidateTokens)

  let vacancyText = cud.attributes.vacancy

  vacancyText = convert(vacancyText, {
    preserveNewlines: true,
    selectors: [{ selector: 'img', format: 'skip' }]
  })
  vacancyText = await summarizeVacancy(config, chunks(vacancyText, maxVacancyTokens), maxVacancyTokens)

  const text = `'I want you to act as a recruiter. I will provide some information about vacancy and resume, and it will be your job to come up with solution why candidate is matching vacancy. Please considering following vacancy:\n ${vacancyText}\n and please write if following candidate good match for vacancy and why:\n ${candidateText}\n`
  // const text = `I want you to act as a recruiter.
  // I will provide some information about vacancy and resume, and it will be your job to come up with solution why candidate is matching vacancy.
  // My first request is "I need help to match vacancy ${vacancyText} and CV: ${candidateText}”`

  const response = await performCompletion(text, options, config, maxAnswerTokens)
  const result: Tx[] = []

  let finalMsg = ''

  for (const choices of response?.choices ?? []) {
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
  return result
}

/**
 * @public
 */
export const openAIPluginImpl = async () => ({
  trigger: {
    AsyncOnGPTRequest
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
