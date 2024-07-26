import { getCategories, SkillCategory } from '@anticrm/skillset'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { extractDocument } from './process'

const pdfDir = process.argv[2]

const files = readdirSync(pdfDir)

const skills = new Map<string, { count: number, category?: SkillCategory }>()

const formats = new Map<string, number>()

const resumesRoot = './resumes'
if (!existsSync(resumesRoot)) {
  mkdirSync(resumesRoot)
}

const categories = getCategories()

async function readFiles (): Promise<void> {
  for (const filename of files) {
    const pdfFile = join(pdfDir, filename)
    const data = readFileSync(pdfFile)

    const { resume, model } = await extractDocument(data)
    if (resume !== undefined) {
      formats.set(resume.format, (formats.get(resume.format) ?? 0) + 1)

      console.log('resume for', resume.format, resume.firstName, resume.lastName)
      if (resume.skills.length > 0) {
        for (const s of resume.skills) {
          // Check
          const es = skills.get(s) ?? { count: 0, category: undefined }
          es.count++
          if (es.category === undefined) {
            // Try find category.
            for (const c of categories) {
              if (c.skills.findIndex((it) => it.toLowerCase() === s.toLowerCase()) !== -1) {
                es.category = c
                break
              }
            }
          }
          skills.set(s, es)
        }
      }
      const path = [resumesRoot, resume.format]
      if (resume.skills.length === 0) {
        path.push('no-skills')
      } else {
        path.push('skills')
      }
      if (!existsSync(join(...path))) {
        mkdirSync(join(...path), { recursive: true })
      }
      await writeFile(join(...path, filename), data)
      await writeFile(join(...path, filename + '.resume.json'), JSON.stringify(resume, undefined, 2))
      for (const img of model.images) {
        await writeFile(join(...path, filename + '._' + img.name + '.png'), img.pngBuffer)
      }
      model.images = []
      await writeFile(join(...path, filename + '.model.json'), JSON.stringify(model, undefined, 2))
    }
  }
  const filteredSkills = Array.from(skills.entries())
    .filter((it) => it[1].count > 1)
    .map((it) => it[0])

  const raw = Array.from(skills.entries())
  raw.sort((a, b) => b[1].count - a[1].count)

  await writeFile('./skills.json', JSON.stringify(filteredSkills, undefined, 2))
  await writeFile(
    './skills_raw.json',
    JSON.stringify(
      raw.map((it) => `${it[0]}-${it[1].count}-${(it[1].category?.label as string) ?? 'Unknown'}`),
      undefined,
      2
    )
  )

  console.log('Formats', Array.from(formats.entries()))
}

readFiles().catch((err) => {
  console.error(err)
})
