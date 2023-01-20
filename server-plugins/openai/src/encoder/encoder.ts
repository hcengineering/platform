/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// This file includes code which was modified from https://github.com/openai/gpt-2

import encoder from './encoder.json'
import bpeFileData from './vocab.json'

const bpeFile = bpeFileData.data

const range = (x: any, y: any) => {
  const res = Array.from(Array(y).keys()).slice(x)
  return res
}

const ord = (x: any) => {
  return x.charCodeAt(0)
}

const chr = (x: any) => {
  return String.fromCharCode(x)
}

const textEncoder = new TextEncoder()
const encodeStr = (str: any) => {
  return Array.from(textEncoder.encode(str)).map((x) => x.toString())
}

const textDecoder = new TextDecoder('utf-8')
const decodeStr = (arr: any) => {
  return textDecoder.decode(new Uint8Array(arr))
}

const dictZip = (x: any, y: any) => {
  const result: any = {}
  x.map((_: any, i: any) => {
    result[x[i]] = y[i]
  })
  return result
}

function bytesToUnicode () {
  const bs = range(ord('!'), ord('~') + 1).concat(range(ord('¡'), ord('¬') + 1), range(ord('®'), ord('ÿ') + 1))

  let cs: any = bs.slice()
  let n = 0
  for (let b = 0; b < 2 ** 8; b++) {
    if (!bs.includes(b)) {
      bs.push(b)
      cs.push(2 ** 8 + n)
      n = n + 1
    }
  }

  cs = cs.map((x: any) => chr(x))

  const result: any = {}
  bs.map((_, i) => {
    result[bs[i]] = cs[i]
  })
  return result
}

function getPairs (word: any) {
  const pairs = new Set()
  let prevChar = word[0]
  for (let i = 1; i < word.length; i++) {
    const char = word[i]
    pairs.add([prevChar, char])
    prevChar = char
  }
  return pairs
}

const pat = /'s|'t|'re|'ve|'m|'l l|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

const decoder: any = {}
Object.keys(encoder).map((x: any) => {
  decoder[(encoder as any)[x]] = x
})

const lines = bpeFile.split('\n')

// bpe_merges = [tuple(merge_str.split()) for merge_str in bpe_data.split("\n")[1:-1]]
const bpeMerges = lines.slice(1, lines.length - 1).map((x) => {
  return x.split(/(\s+)/).filter(function (e) {
    return e.trim().length > 0
  })
})

const byteEncoder = bytesToUnicode()
const byteDecoder: any = {}
Object.keys(byteEncoder).map((x) => {
  byteDecoder[byteEncoder[x]] = x
})

const bpeRanks = dictZip(bpeMerges, range(0, bpeMerges.length))
const cache: any = {}

function bpe (token: any) {
  if (token in cache) {
    return cache[token]
  }

  let word = token.split('')

  let pairs: any = getPairs(word)

  if (!pairs) {
    return token
  }

  while (true) {
    const minPairs: any = {}
    Array.from(pairs).map((pair: any) => {
      const rank = bpeRanks[pair]
      minPairs[isNaN(rank) ? 10e10 : rank] = pair
    })

    const bigram =
      minPairs[
        Math.min(
          ...Object.keys(minPairs).map((x) => {
            return parseInt(x)
          })
        )
      ]

    if (!(bigram in bpeRanks)) {
      break
    }

    const first = bigram[0]
    const second = bigram[1]
    let newWord: any = []
    let i = 0

    while (i < word.length) {
      const j = word.indexOf(first, i)
      if (j === -1) {
        newWord = newWord.concat(word.slice(i))
        break
      }
      newWord = newWord.concat(word.slice(i, j))
      i = j

      if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
        newWord.push(first + second)
        i = i + 2
      } else {
        newWord.push(word[i])
        i = i + 1
      }
    }

    word = newWord
    if (word.length === 1) {
      break
    } else {
      pairs = getPairs(word)
    }
  }

  const rword: string = word.join(' ')
  cache[token] = `${rword}`

  return rword
}

export function encode (text: string): number[] {
  let bpeTokens: number[] = []
  const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
  for (let token of matches) {
    token = encodeStr(token)
      .map((x) => {
        return byteEncoder[x]
      })
      .join('')

    const newTokens = (bpe(token) ?? '').split(' ').map((x: any) => (encoder as any)[x] as number)
    bpeTokens = bpeTokens.concat(newTokens)
  }
  return bpeTokens
}

export function chunks (text: string, limit: number): string[] {
  const result: string[] = []
  let bpeTokens: number[] = []
  const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
  for (const token of matches) {
    const tkn = encodeStr(token)
      .map((x) => {
        return byteEncoder[x]
      })
      .join('')

    const newTokens: Array<any> = (bpe(tkn) ?? '').split(' ').map((x: any) => (encoder as any)[x] as number)
    if (bpeTokens.length + newTokens.length > limit) {
      result.push(decode(bpeTokens))
      bpeTokens = []
    }
    bpeTokens = bpeTokens.concat(newTokens)
  }
  if (bpeTokens.length > 0) {
    result.push(decode(bpeTokens))
  }
  return result
}

export function decode (tokens: number[]) {
  let text = tokens.map((x) => decoder[x]).join('')
  text = decodeStr(text.split('').map((x) => byteDecoder[x]))
  return text
}
