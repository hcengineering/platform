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

const LITERALS = ['true', 'false', 'nil']

const BUILT_INS = [
  'close',
  'dump',
  'eprint',
  'eprintln',
  'error',
  'exit',
  'it',
  'panic',
  'print_backtrace',
  'print',
  'println'
]

const TYPES = [
  'bool',
  'string',
  'i8',
  'i16',
  'i32',
  'i64',
  'i128',
  'int',
  'u8',
  'u16',
  'u32',
  'u64',
  'u128',
  'rune',
  'f32',
  'f64',
  'isize',
  'usize',
  'voidptr',
  'charptr',
  'byteptr',
  'thread'
]

const KWS = [
  'as',
  'asm',
  'assert',
  'atomic',
  'break',
  'const',
  'continue',
  'defer',
  'else',
  'enum',
  'fn',
  'for',
  'go',
  'goto',
  'if',
  'import',
  'in',
  'interface',
  'is',
  'isreftype',
  'lock',
  'match',
  'module',
  'mut',
  'nil',
  'none',
  'or',
  'pub',
  'return',
  'rlock',
  'select',
  'shared',
  'sizeof',
  'spawn',
  'static',
  'struct',
  'type',
  'typeof',
  'union',
  'unsafe',
  'volatile',
  '__global',
  '__offsetof'
]

export function vlang (hljs: any): any {
  const KEYWORDS = {
    keyword: KWS,
    type: TYPES,
    literal: LITERALS,
    built_in: BUILT_INS
  }
  return {
    name: 'V',
    aliases: ['vlang'],
    keywords: KEYWORDS,
    illegal: '</',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        variants: [
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          {
            begin: '`',
            end: '`'
          }
        ]
      },
      {
        className: 'number',
        variants: [
          {
            begin: hljs.C_NUMBER_RE + '[i]',
            relevance: 1
          },
          hljs.C_NUMBER_MODE
        ]
      },
      {
        begin: /:=/ // relevance booster
      },
      {
        className: 'function',
        beginKeywords: 'fn',
        end: '\\s*(\\{|$)',
        excludeEnd: true,
        contains: [
          hljs.TITLE_MODE,
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            endsParent: true,
            keywords: KEYWORDS,
            illegal: /['']/
          }
        ]
      }
    ]
  }
}
