import { CommentArray, CommentObject, parse, stringify } from 'comment-json'
import { readFile, writeFile } from 'fs/promises'
import path, { join } from 'path'

interface RushPackage {
  packageName: string
  projectFolder: string
  shouldPublish: boolean
}

export async function syncRushFiles (
  root: string[],
  targetRoot: string,
  platformRoot: string,
  include: string[],
  exclude: string[]
): Promise<void> {
  const platformJson: CommentObject = parse(
    (await readFile(join(process.cwd(), platformRoot, 'rush.json'))).toString()
  ) as CommentObject

  const rushjs = join(targetRoot, 'rush.json')

  const abs = path.resolve(targetRoot).split(path.sep)

  const projects: RushPackage[] = []

  for (const prj of [join(platformRoot, 'rush.json'), ...root]) {
    const sPath = path.dirname(path.resolve(prj)).split(path.sep)
    const diff = path.join(...sPath.slice(abs.length))
    const rushJsonSource = (await parse((await readFile(prj)).toString())) as CommentObject
    console.log('Processing', prj, (rushJsonSource.projects as any)?.length)
    const sprojects = rushJsonSource.projects as unknown as CommentArray<RushPackage>
    for (const [k, v] of Object.entries(rushJsonSource)) {
      platformJson[k] = v
    }

    projects.push(
      ...sprojects
        .filter((it) => filterPackage(it, include, exclude))
        .map((it) => ({
          ...it,
          projectFolder: join(diff, it.projectFolder),
          shouldPublish: diff === '.' ? it.shouldPublish : false
        }))
    )
  }

  platformJson.projects = projects as unknown as CommentArray<CommentObject>

  await writeFile(rushjs, stringify(platformJson, undefined, 2))
}
function filterPackage (it: RushPackage, include: string[], exclude: string[]): boolean {
  const pkgName = it.packageName
  for (const i of include) {
    if (pkgName.includes(i)) {
      console.log('include', pkgName, i)
      return true
    }
  }
  for (const i of exclude) {
    if (pkgName.includes(i)) {
      console.log('exclude', pkgName, i)
      return false
    }
  }
  console.log('filter', pkgName, 'true')
  return true
}
