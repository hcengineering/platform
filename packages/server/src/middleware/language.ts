//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Event, EventResult, MessageEventType, type SessionData } from '@hcengineering/communication-sdk-types'
import { franc } from 'franc-min'
import { Markdown } from '@hcengineering/communication-types'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import {
  isEmptyMarkup,
  jsonToMarkup,
  MarkupMarkType,
  MarkupNode,
  MarkupNodeType,
  traverseNode
} from '@hcengineering/text-core'

import type { Enriched, Middleware, MiddlewareContext } from '../types'
import { BaseMiddleware } from './base'

export class LanguageMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    if (event.type === MessageEventType.CreateMessage) {
      event.language = event.language ?? this.getLanguage(event.content)
    }
    if (event.type === MessageEventType.UpdatePatch && event.content != null && event.content.trim() !== '') {
      event.language = event.language ?? this.getLanguage(event.content)
    }

    return await this.provideEvent(session, event, derived)
  }

  private getLanguage (content: Markdown): string | undefined {
    const markupNode = markdownToMarkup(content)
    const markup = jsonToMarkup(markupNode)
    if (isEmptyMarkup(markup)) return undefined
    const text = this.toText(markupNode).trim()
    if (text === '') return

    return toIso6391(franc(text, {}))
  }

  private toText (markup: MarkupNode): string {
    const fragments: string[] = []

    traverseNode(markup, (node) => {
      if (node.type === MarkupNodeType.text) {
        const text = node.text ?? ''
        const linkMark = (node.marks ?? []).find((it) => it.type === MarkupMarkType.link)
        if (linkMark != null && linkMark.attrs?.href === text) {
          return true
        }
        if (node.text !== undefined && node.text.length > 0) {
          fragments.push(text)
        }
      } else if (node.type === MarkupNodeType.paragraph) {
        fragments.push(' ')
      }
      return true
    })

    return fragments.join('').trim()
  }
}

const iso6393To1 = {
  aar: 'aa',
  abk: 'ab',
  afr: 'af',
  aka: 'ak',
  amh: 'am',
  ara: 'ar',
  arg: 'an',
  asm: 'as',
  ava: 'av',
  ave: 'ae',
  aym: 'ay',
  aze: 'az',
  bak: 'ba',
  bam: 'bm',
  bel: 'be',
  ben: 'bn',
  bis: 'bi',
  bod: 'bo',
  bos: 'bs',
  bre: 'br',
  bul: 'bg',
  cat: 'ca',
  ces: 'cs',
  cha: 'ch',
  che: 'ce',
  chu: 'cu',
  chv: 'cv',
  cor: 'kw',
  cos: 'co',
  cre: 'cr',
  cym: 'cy',
  dan: 'da',
  deu: 'de',
  div: 'dv',
  dzo: 'dz',
  ell: 'el',
  eng: 'en',
  epo: 'eo',
  est: 'et',
  eus: 'eu',
  ewe: 'ee',
  fao: 'fo',
  fas: 'fa',
  fij: 'fj',
  fin: 'fi',
  fra: 'fr',
  fry: 'fy',
  ful: 'ff',
  gla: 'gd',
  gle: 'ga',
  glg: 'gl',
  glv: 'gv',
  grn: 'gn',
  guj: 'gu',
  hat: 'ht',
  hau: 'ha',
  hbs: 'sh',
  heb: 'he',
  her: 'hz',
  hin: 'hi',
  hmo: 'ho',
  hrv: 'hr',
  hun: 'hu',
  hye: 'hy',
  ibo: 'ig',
  ido: 'io',
  iii: 'ii',
  iku: 'iu',
  ile: 'ie',
  ina: 'ia',
  ind: 'id',
  ipk: 'ik',
  isl: 'is',
  ita: 'it',
  jav: 'jv',
  jpn: 'ja',
  kal: 'kl',
  kan: 'kn',
  kas: 'ks',
  kat: 'ka',
  kau: 'kr',
  kaz: 'kk',
  khm: 'km',
  kik: 'ki',
  kin: 'rw',
  kir: 'ky',
  kom: 'kv',
  kon: 'kg',
  kor: 'ko',
  kua: 'kj',
  kur: 'ku',
  lao: 'lo',
  lat: 'la',
  lav: 'lv',
  lim: 'li',
  lin: 'ln',
  lit: 'lt',
  ltz: 'lb',
  lub: 'lu',
  lug: 'lg',
  mah: 'mh',
  mal: 'ml',
  mar: 'mr',
  mkd: 'mk',
  mlg: 'mg',
  mlt: 'mt',
  mon: 'mn',
  mri: 'mi',
  msa: 'ms',
  mya: 'my',
  nau: 'na',
  nav: 'nv',
  nbl: 'nr',
  nde: 'nd',
  ndo: 'ng',
  nep: 'ne',
  nld: 'nl',
  nno: 'nn',
  nob: 'nb',
  nor: 'no',
  nya: 'ny',
  oci: 'oc',
  oji: 'oj',
  ori: 'or',
  orm: 'om',
  oss: 'os',
  pan: 'pa',
  pli: 'pi',
  pol: 'pl',
  por: 'pt',
  pus: 'ps',
  que: 'qu',
  roh: 'rm',
  ron: 'ro',
  run: 'rn',
  rus: 'ru',
  sag: 'sg',
  san: 'sa',
  sin: 'si',
  slk: 'sk',
  slv: 'sl',
  sme: 'se',
  smo: 'sm',
  sna: 'sn',
  snd: 'sd',
  som: 'so',
  sot: 'st',
  spa: 'es',
  sqi: 'sq',
  srd: 'sc',
  srp: 'sr',
  ssw: 'ss',
  sun: 'su',
  swa: 'sw',
  swe: 'sv',
  tah: 'ty',
  tam: 'ta',
  tat: 'tt',
  tel: 'te',
  tgk: 'tg',
  tgl: 'tl',
  tha: 'th',
  tir: 'ti',
  ton: 'to',
  tsn: 'tn',
  tso: 'ts',
  tuk: 'tk',
  tur: 'tr',
  twi: 'tw',
  uig: 'ug',
  ukr: 'uk',
  urd: 'ur',
  uzb: 'uz',
  ven: 've',
  vie: 'vi',
  vol: 'vo',
  wln: 'wa',
  wol: 'wo',
  xho: 'xh',
  yid: 'yi',
  yor: 'yo',
  zha: 'za',
  zho: 'zh',
  zul: 'zu'
}

function toIso6391 (lang: string): string | undefined {
  return (iso6393To1 as any)[lang]
}
