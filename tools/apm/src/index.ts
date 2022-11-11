import { program } from 'commander'
import { syncRushFiles } from './sync'
import { createTemplate } from './template'

console.info('Anticrm Platform Manager')

program.version('0.6.0')

program
  .command('rush-sync <root>')
  .description('Synchronized rush.js files with platform.')
  .action(async (root: string, cmd) => {
    await syncRushFiles(process.cwd(), root)
  })

program
  .command('template-apply <root>')
  .description('Create necessary startup packages')
  .requiredOption('--root <root>', 'user password', 'platform')
  .action(async (root: string, cmd) => {
    await createTemplate(process.cwd(), root)
  })

program.parse(process.argv)
