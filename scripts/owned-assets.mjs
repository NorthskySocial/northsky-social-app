import {execFileSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'
import {isDeepStrictEqual} from 'node:util'

const git = (...args) => execFileSync('git', args, {encoding: 'utf8'})
const [command, snapshot, upstream] = process.argv.slice(2)
const iconRoot = 'src/components/icons/'
const exportNames = source =>
  [
    ...source.matchAll(/^export (?:const|function|class) ([A-Za-z0-9_]+)/gm),
  ].map(match => match[1])

function validatePaths(paths) {
  if (
    !Array.isArray(paths) ||
    new Set(paths).size !== paths.length ||
    paths.some(
      file =>
        typeof file !== 'string' ||
        file.includes('\\') ||
        /[\x00-\x1f\x7f]/.test(file) ||
        file
          .split('/')
          .some(part => !part || ['.', '..', '.git'].includes(part)),
    )
  )
    throw new Error(
      'Invalid inventory paths: expected unique repository-relative paths',
    )
}

function capture(ref, target) {
  const policy = JSON.parse(git('show', `${ref}:scripts/owned-assets.json`))
  validatePaths(policy.files)
  validatePaths(policy.roots)
  const mapping = JSON.parse(
    git('show', `${ref}:src/features/tablerIcons/mapping.json`),
  )
  if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object')
    throw new Error('Invalid icon mapping inventory')
  validatePaths(Object.keys(mapping))
  for (const [file, names] of Object.entries(mapping)) {
    if (
      !file.endsWith('.tsx') ||
      !names ||
      typeof names !== 'object' ||
      Array.isArray(names)
    )
      throw new Error(`Invalid icon mapping: ${file}`)
  }
  const tracked = git('ls-tree', '-rz', '--name-only', ref)
    .split('\0')
    .filter(Boolean)
  const owned = new Set([
    ...policy.files,
    ...Object.keys(mapping).map(file => `${iconRoot}${file}`),
  ])
  const paths = tracked.filter(
    file =>
      owned.has(file) || policy.roots.some(root => file.startsWith(`${root}/`)),
  )
  validatePaths(paths)
  const absent = [...owned].filter(file => !tracked.includes(file))
  const base = git('merge-base', ref, target).trim()
  const changes = git('diff', '--name-status', '-z', '-M', base, target).split(
    '\0',
  )
  const renames = []
  const renamedIcons = new Set()
  for (let i = 0; i < changes.length && changes[i];) {
    const status = changes[i++]
    const from = changes[i++]
    if (status.startsWith('R') || status.startsWith('C')) {
      const to = changes[i++]
      if (
        status.startsWith('R') &&
        paths.includes(from) &&
        !tracked.includes(to)
      ) {
        renames.push(to)
        if (from.startsWith(iconRoot)) renamedIcons.add(to)
      }
    }
  }
  validatePaths(renames)
  const requirements = {}
  const additions = []
  for (const file of git('ls-tree', '-rz', '--name-only', target).split('\0')) {
    if (!file.startsWith(iconRoot) || !file.endsWith('.tsx')) continue
    if (owned.has(file) || paths.includes(file) || renamedIcons.has(file)) {
      requirements[file] = exportNames(git('show', `${target}:${file}`))
    } else if (!tracked.includes(file)) additions.push(file)
  }
  return {
    version: 1,
    ref,
    target,
    paths,
    absent,
    renames,
    requirements,
    additions,
  }
}

if (command === 'capture') {
  if (!snapshot || !upstream)
    throw new Error('Capture requires SNAPSHOT and UPSTREAM')
  const ref = git('rev-parse', '--verify', 'HEAD^{commit}').trim()
  const target = git('rev-parse', '--verify', `${upstream}^{commit}`).trim()
  writeFileSync(snapshot, JSON.stringify(capture(ref, target), null, 2) + '\n')
} else if (command === 'restore' || command === 'check') {
  const state = JSON.parse(readFileSync(snapshot, 'utf8'))
  if (
    state.version !== 1 ||
    !/^[a-f0-9]{40,64}$/.test(state.ref) ||
    !/^[a-f0-9]{40,64}$/.test(state.target) ||
    !isDeepStrictEqual(state, capture(state.ref, state.target))
  )
    throw new Error(
      'Invalid or stale owned-assets snapshot; capture again before merging',
    )
  const {ref, paths, absent, renames, requirements, additions} = state
  if (command === 'restore') {
    for (const file of [...absent, ...renames])
      git('rm', '-f', '--ignore-unmatch', '--', `:(literal)${file}`)
    for (const file of paths)
      git(
        'restore',
        `--source=${ref}`,
        '--staged',
        '--worktree',
        '--',
        `:(literal)${file}`,
      )
    console.log(
      `Restored ${paths.length} owned assets from ${ref}; preserved ${absent.length} explicit absences`,
    )
  } else {
    for (const file of additions)
      console.log(
        `Unowned upstream icon retained without requiring a mapping: ${file}`,
      )
    const unresolved = []
    for (const [file, names] of Object.entries(requirements)) {
      let present = []
      try {
        present = exportNames(readFileSync(file, 'utf8'))
      } catch {
        unresolved.push(`${file}: missing restored module`)
      }
      for (const name of names)
        if (!present.includes(name))
          unresolved.push(`${file}: missing restored export ${name}`)
    }
    if (unresolved.length) {
      console.error(
        `Unresolved upstream icon requirements after preserving owned glyphs:\n${unresolved.join('\n')}\nSync reviewers must reconcile these imports and owned exports explicitly before merging; do not replace owned glyphs automatically.`,
      )
      process.exitCode = 1
    } else console.log('Owned icon compatibility check passed')
  }
} else {
  throw new Error(
    'Usage: node owned-assets.mjs capture SNAPSHOT UPSTREAM | restore SNAPSHOT | check SNAPSHOT',
  )
}
