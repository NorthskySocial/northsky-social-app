import {execFileSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'

// Sync maintainers capture this inventory before merging, not from merged files.
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'})
const [command, snapshot, upstream] = process.argv.slice(2)
const iconRoot = 'src/components/icons/'
const exportNames = source =>
  [
    ...source.matchAll(/^export (?:const|function|class) ([A-Za-z0-9_]+)/gm),
  ].map(match => match[1])
if (command === 'capture') {
  const ref = git('rev-parse', 'HEAD').trim()
  const policy = JSON.parse(readFileSync('scripts/owned-assets.json', 'utf8'))
  const mapping = JSON.parse(
    readFileSync('src/features/tablerIcons/mapping.json', 'utf8'),
  )
  const tracked = git('ls-tree', '-rz', '--name-only', ref)
    .split('\0')
    .filter(Boolean)
  const owned = new Set([
    ...policy.files,
    ...Object.keys(mapping).map(file => `src/components/icons/${file}`),
  ])
  const paths = tracked.filter(
    file =>
      owned.has(file) || policy.roots.some(root => file.startsWith(`${root}/`)),
  )
  const target = git('rev-parse', upstream).trim()
  const base = git('merge-base', ref, target).trim()
  const changes = git('diff', '--name-status', '-z', '-M', base, target).split(
    '\0',
  )
  const renames = []
  for (let i = 0; i < changes.length && changes[i];) {
    const status = changes[i++]
    const from = changes[i++]
    if (status.startsWith('R') || status.startsWith('C')) {
      const to = changes[i++]
      if (
        status.startsWith('R') &&
        paths.includes(from) &&
        !tracked.includes(to)
      )
        renames.push(to)
    }
  }
  // Keep upstream's contract outside the files that restoration overwrites.
  const requirements = {}
  for (const file of git('ls-tree', '-rz', '--name-only', target).split('\0')) {
    if (
      file.startsWith(iconRoot) &&
      file.endsWith('.tsx') &&
      (mapping[file.slice(iconRoot.length)] || !tracked.includes(file))
    ) {
      requirements[file] = exportNames(git('show', `${target}:${file}`))
    }
  }
  writeFileSync(
    snapshot,
    JSON.stringify({ref, paths, renames, requirements}, null, 2) + '\n',
  )
} else if (command === 'restore') {
  const {ref, paths, renames, requirements} = JSON.parse(
    readFileSync(snapshot, 'utf8'),
  )
  if (!requirements)
    throw new Error(
      'Snapshot lacks upstream icon requirements; capture again before merging',
    )
  // Literal pathspecs prevent asset names from being interpreted as git patterns.
  for (const file of renames)
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
  console.log(`Restored ${paths.length} owned assets from ${ref}`)
  const mapping = JSON.parse(
    readFileSync('src/features/tablerIcons/mapping.json', 'utf8'),
  )
  const unresolved = []
  for (const [file, names] of Object.entries(requirements)) {
    let present = []
    try {
      present = exportNames(readFileSync(file, 'utf8'))
    } catch {
      // Missing modules must be reported alongside missing mappings.
    }
    const mapped = mapping[file.slice(iconRoot.length)] ?? {}
    for (const name of names) {
      if (!Object.hasOwn(mapped, name) || !present.includes(name))
        unresolved.push(`${file}: ${name} (missing mapping or restored export)`)
    }
  }
  if (unresolved.length)
    throw new Error(
      `Unresolved upstream icon requirements after preserving owned glyphs:\n${unresolved.join('\n')}\nAdd mappings and exports explicitly before completing the sync.`,
    )
} else {
  throw new Error(
    'Usage: node owned-assets.mjs capture SNAPSHOT UPSTREAM | restore SNAPSHOT',
  )
}
