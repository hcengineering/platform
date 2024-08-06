const exec = require('child_process').exec

exec('git describe --tags `git rev-list --tags --max-count=1`', (err, stdout, stderr) => {
  if (err !== null) {
    console.log('Error', err)
    process.exit(1)
  }
  const tag = stdout.trim()
  console.log('Check changes for tag:', tag)
  exec(`git fetch --tags && git diff ${tag} --name-only`, (err, stdout, stderr) => {
    if (err !== null) {
      console.log('Error', err)
      process.exit(1)
    }
    const changedFiles = stdout.trim().split('\n')
    const modelsChanged = changedFiles.some(file => file.startsWith('models/'))
    const versionChanged = changedFiles.some(file => file.endsWith('version.txt'))
    if (modelsChanged && !versionChanged) {
      throw new Error('Please update model version')
    }
    console.log('OK')
  })
})