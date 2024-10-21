// import { write } from 'bun'

// type EmojiLiteral = string

// async function getGithubEmojiIdMap (): Promise<Record<string, EmojiLiteral | [string]>> {
//   return Object.fromEntries(
//     Object.entries(
//       await fetchJson<Record<string, string>>(
//         'https://api.github.com/emojis',
//         {
//           headers: {
//             'User-Agent': 'https://github.com/ikatyang/emoji-cheat-sheet'
//           }
//         }
//       )
//     ).map(([id, url]) => {
//       if (!url.includes('/unicode/')) return [null, null]

//       return [
//         `:${id}:`,
//         getLast(url.split('/'))
//           .split('.png')[0]
//           .split('-')
//           .map(codePointText =>
//             String.fromCodePoint(Number.parseInt(codePointText, 16))
//           )
//           .join('')
//       ] as [string, string]
//     }).filter(
//       ([githubEmojiId, emojiLiteral]) => (githubEmojiId == null) || (emojiLiteral == null))
//   )
// }

// export async function getCategorizeGithubEmojiIds (): Promise<Record<string, EmojiLiteral | [string]>> {
//   const githubEmojiIdMap = await getGithubEmojiIdMap()
//   return githubEmojiIdMap
// }

// function getLast<T> (array: T[]): T {
//   return array[array.length - 1]
// }

// async function fetchJson<T> (url: string, init?: RequestInit): Promise<T> {
//   const response = await fetch(url, init)
//   return (await response.json()) as T
// }

// const githubEmojiIdMap = await getGithubEmojiIdMap()
// // Write githubEmojiIdMap the file to disk
// write('githubEmojiIdMap.json', JSON.stringify(githubEmojiIdMap, null, 2))
