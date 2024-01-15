/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// This file includes code which was modified from https://github.com/openai/gpt-2

import encoder from './encoder.json'
import bpeFileData from './vocab.json'

const bpeFile = bpeFileData.data

const range = (x: number, y: number) => {
  return Array.from(Array(y).keys()).slice(x)
}

const ord = (x: string) => {
  return x.charCodeAt(0)
}

const chr = (x: number) => {
  return String.fromCharCode(x)
}

const textEncoder = new TextEncoder()
const encodeStr = (str: string) => {
  return Array.from(textEncoder.encode(str)).map((x) => x.toString())
}

const textDecoder = new TextDecoder('utf-8')
const decodeStr = (arr: any[]) => {
  return textDecoder.decode(new Uint8Array(arr))
}

const dictZip = (x: any[], y: any[]) => {
  const result: any = {}

  x.forEach((_: unknown, i: number) => {
    result[x[i]] = y[i]
  })

  return result
}

function bytesToUnicode () {
  const bs = range(ord('!'), ord('~') + 1).concat(range(ord('¡'), ord('¬') + 1), range(ord('®'), ord('ÿ') + 1))
  const cs = bs.slice()

  for (let b = 0; b < 2 ** 8; b++) {
    if (!bs.includes(b)) {
      bs.push(b)
      cs.push(2 ** 8 + b)
    }
  }

  const fs = cs.map(chr)
  const result: Record<string, string> = {}

  bs.forEach((_, index) => {
    result[bs[index]] = fs[index]
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
Object.keys(encoder).forEach((x: any) => {
  decoder[(encoder as any)[x]] = x
})

const lines = bpeFile.split('\n')

// bpe_merges = [tuple(merge_str.split()) for merge_str in bpe_data.split("\n")[1:-1]]
const bpeMerges = lines.slice(1, lines.length - 1).map((x) => x.split(/(\s+)/).filter((e) => e.trim().length > 0))

const byteEncoder = bytesToUnicode()
const byteDecoder: any = {}

Object.keys(byteEncoder).forEach((x) => {
  byteDecoder[byteEncoder[x]] = x
})

const bpeRanks = dictZip(bpeMerges, range(0, bpeMerges.length))
const cache: any = {}

function bpe (token: any) {
  if (token in cache) {
    return cache[token]
  }

  let word = token.split('')
  let pairs = getPairs(word)

  if (!pairs) {
    return token
  }

  while (true) {
    const minPairs: any = {}

    Array.from(pairs).forEach((pair: any) => {
      const rank = bpeRanks[pair]

      minPairs[isNaN(rank) ? 10e10 : rank] = pair
    })

    const bigram = minPairs[Math.min(...Object.keys(minPairs).map(parseInt))]

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
        i += 2
      } else {
        newWord.push(word[i])
        i++
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

export function getToken (token: string): string {
  return encodeStr(token)
    .map((x) => byteEncoder[x])
    .join('')
}

export function getNewTokens (token: string): number[] {
  return (bpe(token) ?? '').split(' ').map(encoder)
}

export function encode (text: string): number[] {
  const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
  let bpeTokens: number[] = []

  for (const _token of matches) {
    const token = getToken(_token)
    const newTokens = getNewTokens(token)

    bpeTokens = bpeTokens.concat(newTokens)
  }

  return bpeTokens
}

export function chunks (text: string, limit: number): string[] {
  const result: string[] = []
  const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
  let bpeTokens: number[] = []

  for (const _token of matches) {
    const token = getToken(_token)
    const newTokens = getNewTokens(token)

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
