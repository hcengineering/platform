import { program } from 'commander'
import { join } from 'path'
import { syncRushFiles } from './sync'

console.info('Anticrm Platform Manager')

program.version('0.6.0')

program
  .command('rush-sync <root>')
  .description('Synchronized rush.js files with platform.')
  .option('-e, --exclude <exclude>', 'List of exclude patterns to override excludes (comma separated)', '')
  .option('-i, --include <include>', 'List of include patterns to override excludes (comma separated)', '')
  .option('-s, --source <source>', 'Comma separated list of rush_source.json files', 'rush_source.json')
  .action(async (root: string, cmd: { include: string, exclude: string, source: string }) => {
    await syncRushFiles(
      cmd.source.split(',').map((it) => join(process.cwd(), it.trim())),
      process.cwd(),
      root,
      cmd.include
        .split(',')
        .map((it) => it.trim())
        .filter((it) => it.length > 0),
      cmd.exclude
        .split(',')
        .map((it) => it.trim())
        .filter((it) => it.length > 0)
    )
  })

program.parse(process.argv)
