import { getCategories } from '@anticrm/skillset'
import { ReconiDocument, RekoniModel } from './types'
import { getLineItems } from './utils'

const categories = getCategories()
export const possibleSkills = new Set<string>(
  categories
    .map((it) => it.skills)
    .reduce((arr, val) => {
      arr.push(...val)
      return arr
    }, [])
)
export const lowePossibleSkills = new Set<string>(
  categories
    .map((it) => it.skills)
    .reduce((arr, val) => {
      arr.push(...val)
      return arr
    }, [])
    .map((it) => it.toLowerCase())
)

export function parseSkillsRaw (resume: ReconiDocument, text: RekoniModel): void {
  if (resume.skills.length === 0) {
    // try to match skills from set of possible ones.
    for (const tt of text.lines) {
      const line = getLineItems(tt.items, false).join()
      for (const skill of possibleSkills) {
        if (
          skill.length > 3 &&
          line.includes(skill) &&
          resume.skills.findIndex((it) => it.toLowerCase() === skill.toLowerCase()) === -1
        ) {
          resume.skills.push(skill)
        }
      }
    }
  }
}
