//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

// Runs bash scripts and bash command lines the same way on Linux, macOS and
// native Windows (via Git Bash), so the scripts themselves stay unchanged.
//
// Usage:
//   node bash.js <script.sh> [args...]   run a script file with bash
//   node bash.js --script <name> [args...]
//                                        run package.json "bashScripts"[name]
//                                        from the current directory; extra
//                                        args are appended, like npm does
//   node bash.js -c "<command>" [args...]
//                                        run a command line; extra args are
//                                        appended. Keep the command free of
//                                        $, ` and \ - the calling shell may
//                                        expand them before bash sees them
//
// On Windows bash is looked up in this order: GIT_BASH env variable, the Git
// for Windows install that owns `git` on PATH, the default install folders.
// C:\Windows\System32\bash.exe (the WSL launcher) is never used.

const fs = require('fs')
const path = require('path')
const { spawnSync, execFileSync } = require('child_process')

function fail (message) {
  console.error(`[bash.js] ${message}`)
  process.exit(1)
}

function findWindowsBash () {
  const candidates = []
  if (process.env.GIT_BASH) {
    if (!fs.existsSync(process.env.GIT_BASH)) {
      fail(`GIT_BASH is set to "${process.env.GIT_BASH}", but the file does not exist`)
    }
    return process.env.GIT_BASH
  }
  try {
    // e.g. C:/Program Files/Git/mingw64/libexec/git-core -> C:/Program Files/Git
    const execPath = execFileSync('git', ['--exec-path'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const gitRoot = path.resolve(execPath, '..', '..', '..')
    candidates.push(path.join(gitRoot, 'bin', 'bash.exe'))
  } catch (err) {
    // git is not on PATH, fall back to default locations
  }
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.ProgramW6432]) {
    if (base) candidates.push(path.join(base, 'Git', 'bin', 'bash.exe'))
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'))
  }
  const found = candidates.find((p) => fs.existsSync(p))
  if (found === undefined) {
    fail(
      'Git Bash was not found. Install Git for Windows (https://git-scm.com/download/win) ' +
        'or set GIT_BASH to the full path of bash.exe, e.g. C:\\Program Files\\Git\\bin\\bash.exe'
    )
  }
  return found
}

function bashArgs (argv) {
  if (argv.length === 0) {
    fail('usage: node bash.js <script.sh> [args...] | --script <name> [args...] | -c "<command>"')
  }
  if (argv[0] === '-c') {
    if (argv[1] === undefined) fail('-c expects a command')
    // extra arguments (e.g. appended by rush to a global command) go to the end of the command
    return ['-c', `${argv[1]} "$@"`, 'bash.js', ...argv.slice(2)]
  }
  if (argv[0] === '--script') {
    const name = argv[1]
    if (name === undefined) fail('--script expects a script name')
    const pkgPath = path.join(process.cwd(), 'package.json')
    let pkg
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    } catch (err) {
      fail(`cannot read ${pkgPath}: ${err.message}`)
    }
    const command = pkg.bashScripts?.[name]
    if (typeof command !== 'string') fail(`"bashScripts"."${name}" is not defined in ${pkgPath}`)
    // "$@" appends extra arguments the same way npm/rushx append them to a script
    return ['-c', `${command} "$@"`, `bashScripts:${name}`, ...argv.slice(2)]
  }
  return argv
}

const isWindows = process.platform === 'win32'
const bash = isWindows ? findWindowsBash() : 'bash'
const env = { ...process.env }
if (isWindows) {
  // Git Bash rewrites arguments that look like POSIX paths when it starts native
  // programs (UPLOAD_URL=/files -> UPLOAD_URL=C:/Program Files/Git/files).
  // Our scripts pass URLs and relative paths only, so turn this off unless the caller decided otherwise.
  if (env.MSYS_NO_PATHCONV === undefined) env.MSYS_NO_PATHCONV = '1'
  if (env.MSYS2_ARG_CONV_EXCL === undefined) env.MSYS2_ARG_CONV_EXCL = '*'
}

const result = spawnSync(bash, bashArgs(process.argv.slice(2)), { stdio: 'inherit', env })
if (result.error) fail(`failed to start ${bash}: ${result.error.message}`)
if (result.signal) {
  process.kill(process.pid, result.signal)
} else {
  process.exit(result.status ?? 1)
}
