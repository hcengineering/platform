//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { SttProvider } from './type.js'

interface Config {
  DeepgramApiKey: string
  DeepgramModel: string
  OpenAiTranscriptModel: string
  OpenaiApiKey: string
  OpenaiBaseUrl: string
  OpenaiProvideLanguage: boolean
  PlatformToken: string
  PlatformUrl: string
  SttProvider: SttProvider
  VadSilenceDurationMs: number
  VadPrefixPaddingMs: number
  VadThreshold: number

  DgEndpointing: number
  DgUtteranceEndMs: number
  DgInterimResults: boolean
  DgVadEvents: boolean
  DgPunctuate: boolean
  DgSmartFormat: boolean
  DgNoDelay: boolean,
  DgSampleRate: number
}

const config: Config = (() => {
  const params: Partial<Config> = {
    DeepgramApiKey: process.env.DEEPGRAM_API_KEY ?? '',
    DeepgramModel: process.env.DEEPGRAM_MODEL ?? 'nova-3',
    OpenAiTranscriptModel: process.env.OPENAI_TRANSCRIPT_MODEL ?? 'gpt-4o-transcribe',
    OpenaiApiKey: process.env.OPENAI_API_KEY ?? '',
    OpenaiBaseUrl: process.env.OPENAI_BASE_URL ?? '',
    OpenaiProvideLanguage: (process.env.OPENAI_PROVIDE_LANGUAGE ?? 'true') === 'true',
    PlatformToken: process.env.PLATFORM_TOKEN,
    PlatformUrl: process.env.PLATFORM_URL,
    SttProvider: (process.env.STT_PROVIDER as SttProvider) ?? 'deepgram',
    VadSilenceDurationMs: parseInt(process.env.SILENCE_DURATION_MS ?? '1000'),
    VadPrefixPaddingMs: parseInt(process.env.PREFIX_PADDING_MS ?? '1000'),
    VadThreshold: parseFloat(process.env.VAD_THRESHOLD ?? '0.5'),

    DgEndpointing: parseInt(process.env.DG_ENDPOINTING ?? '100'),
    DgInterimResults: process.env.DG_INTERIM_RESULTS === 'true',
    DgVadEvents: process.env.DG_VAD_EVENTS === 'true',
    DgPunctuate: process.env.DG_PUNCTUATE === 'true',
    DgSmartFormat: process.env.DG_SMART_FORMAT === 'true',
    DgUtteranceEndMs: parseInt(process.env.DG_UTTERANCE_END_MS ?? '0'),
    DgNoDelay: process.env.DG_NO_DELAY === 'true',
    DgSampleRate: parseInt(process.env.DG_SAMPLE_RATE ?? '16000')
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
