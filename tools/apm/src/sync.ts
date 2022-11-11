import { CommentArray, CommentObject, parse, stringify } from 'comment-json'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

interface RushPackage {
  packageName: string
  projectFolder: string
  shouldPublish: boolean
}

const ignoreProjects = new Set([
  '@hcengineering/prod',
  '@hcengineering/pod-front',
  '@hcengineering/pod-server',
  '@hcengineering/pod-account'
])
function platformFilter (root: string): (it: RushPackage) => boolean {
  return (it) => {
    return !it.projectFolder.startsWith(root)
  }
}

export async function syncRushFiles (root: string, platformRoot: string): Promise<void> {
  const platformJson: CommentObject = parse(
    (await readFile(join(root, platformRoot, 'rush.json'))).toString()
  ) as CommentObject
  const rushjs = join(root, 'rush.json')
  const rushjsSource = join(root, 'rush_source.json')
  const rushJson: CommentObject = parse((await readFile(rushjsSource)).toString()) as CommentObject

  const platformProjecs = (platformJson.projects as unknown as CommentArray<RushPackage>).filter(
    (it) => !ignoreProjects.has(it.packageName)
  )
  const projects = rushJson.projects as unknown as CommentArray<RushPackage>

  const newProjects = projects.filter(platformFilter(platformRoot))
  newProjects.push(
    ...platformProjecs.map((it) => ({
      ...it,
      projectFolder: join(platformRoot, it.projectFolder),
      shouldPublish: false
    }))
  )

  rushJson.projects = newProjects as unknown as CommentArray<CommentObject>

  await writeFile(rushjs, stringify(rushJson, undefined, 2))
}
