const exec = require('child_process').exec

exec('git describe --tags --abbrev=0', (err, stdout, stderr) => {
  if (err !== null) {
    process.exit(1)
  }
  const tag = stdout.trim()
  exec(`git fetch --tags && git diff ${tag} --name-only`, (err, stdout, stderr) => {
    if (err !== null) {
      process.exit(1)
    }
    const changedFiles = stdout.trim().split('\n')
    const modelsChanged = changedFiles.some(file => file.startsWith('models/'))
    const versionChanged = changedFiles.some(file => file.endsWith('version.txt'))
    if (modelsChanged && !versionChanged) {
      console.log('Please update model version')
      process.exit(1)
    }
  })
})