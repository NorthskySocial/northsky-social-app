import assert from 'node:assert/strict'
import {execFileSync, spawnSync} from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  chmodSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'

const helper = fileURLToPath(new URL('./owned-assets.mjs', import.meta.url))
for (const scenario of [
  'edit',
  'delete',
  'rename',
  'conflict',
  'directory-delete',
  'mapped-delete',
  'new-export',
  'new-module',
  'rename-heavy',
  'icon-rename',
  'collision',
  'additions',
  'tombstone',
]) {
  test(`restores owned assets after upstream ${scenario}`, () => {
    const cwd = mkdtempSync(join(tmpdir(), 'northsky-assets-'))
    const git = (...args) =>
      execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    const put = (file, text) => {
      mkdirSync(join(cwd, file, '..'), {recursive: true})
      writeFileSync(join(cwd, file), text)
    }
    try {
      git('init', '-b', 'fork')
      mkdirSync(join(cwd, 'scripts'))
      mkdirSync(join(cwd, 'src/features/tablerIcons'), {recursive: true})
      put(
        'scripts/owned-assets.json',
        JSON.stringify({
          roots: ['glyphs'],
          files: ['owned', 'absent', 'literal[1]*.svg'],
        }),
      )
      put(
        'src/features/tablerIcons/mapping.json',
        JSON.stringify({'Example.tsx': {Existing: {tabler: 'original'}}}),
      )
      put(
        'src/components/icons/Example.tsx',
        "export const Existing = 'owned glyph'\n",
      )
      put('glyphs/nested/icon.svg', '<svg>owned</svg>')
      put('owned', 'original\n')
      put('literal[1]*.svg', 'literal original')
      put('literal1other.svg', 'not owned')
      put('glyphs-other/icon.svg', 'not owned')
      put('unrelated', 'original\n')
      git('add', '.')
      const commit = message =>
        git(
          '-c',
          'user.name=Test',
          '-c',
          'user.email=test@example.invalid',
          'commit',
          '-m',
          message,
        )
      commit('base')
      git('switch', '-c', 'upstream')
      if (scenario === 'icon-rename')
        git(
          'mv',
          'src/components/icons/Example.tsx',
          'src/components/icons/Renamed.tsx',
        )
      else if (scenario === 'collision') git('mv', 'owned', 'renamed')
      else if (scenario === 'tombstone') put('absent', 'upstream addition')
      else if (scenario === 'additions')
        put('glyphs/new.svg', 'new upstream asset')
      else if (scenario === 'directory-delete') git('rm', '-r', 'glyphs')
      else if (scenario === 'mapped-delete')
        git('rm', 'src/components/icons/Example.tsx')
      else if (scenario === 'new-export' || scenario === 'new-module') {
        const module = scenario === 'new-export' ? 'Example' : 'New'
        put(
          `src/components/icons/${module}.tsx`,
          "export const Existing = 'upstream glyph'\nexport const Added = 'new glyph'\n",
        )
        put(
          'caller.ts',
          `import {Added} from './src/components/icons/${module}'\nconsole.log(Added)\n`,
        )
      } else if (scenario === 'rename-heavy') {
        git('mv', 'owned', 'renamed')
        put('renamed', 'completely rewritten upstream content\n')
      } else if (scenario === 'delete') git('rm', 'owned')
      else if (scenario === 'rename') git('mv', 'owned', 'renamed')
      else put('owned', 'upstream\n')
      put('literal[1]*.svg', 'changed')
      put('literal1other.svg', 'upstream unrelated')
      put('glyphs-other/icon.svg', 'upstream boundary')
      put('unrelated', 'upstream\n')
      git('add', '.')
      commit('upstream')
      git('switch', 'fork')
      if (scenario === 'collision') {
        put('renamed', 'fork destination')
        git('add', '.')
        commit('fork destination')
      }
      if (scenario === 'conflict') {
        put('owned', 'fork\n')
        git('add', '.')
        commit('fork')
      }
      execFileSync(
        process.execPath,
        [helper, 'capture', 'snapshot.json', 'upstream'],
        {cwd},
      )
      const merge = spawnSync(
        'git',
        [
          '-c',
          'user.name=Test',
          '-c',
          'user.email=test@example.invalid',
          'merge',
          '--no-commit',
          '--no-ff',
          'upstream',
        ],
        {cwd},
      )
      assert.equal(
        merge.status,
        ['conflict', 'collision'].includes(scenario) ? 1 : 0,
      )
      for (let attempt = 0; attempt < 2; attempt++) {
        const restored = spawnSync(
          process.execPath,
          [helper, 'restore', 'snapshot.json'],
          {cwd, encoding: 'utf8'},
        )
        assert.equal(restored.status, 0, restored.stderr)
        const checked = spawnSync(
          process.execPath,
          [helper, 'check', 'snapshot.json'],
          {cwd, encoding: 'utf8'},
        )
        const missing = scenario === 'new-export' || scenario === 'icon-rename'
        assert.equal(checked.status, missing ? 1 : 0, checked.stderr)
        if (scenario === 'new-module') {
          assert.match(checked.stdout, /Unowned upstream icon retained/)
          assert.match(
            readFileSync(join(cwd, 'src/components/icons/New.tsx'), 'utf8'),
            /Added/,
          )
        }
        if (missing) {
          assert.match(checked.stderr, /Unresolved upstream icon requirements/)
        }
        if (scenario === 'new-export') {
          assert.match(checked.stderr, /Added/)
          assert.match(
            readFileSync(join(cwd, 'caller.ts'), 'utf8'),
            /import \{Added\}/,
          )
        }
      }
      assert.equal(
        readFileSync(join(cwd, 'src/components/icons/Example.tsx'), 'utf8'),
        "export const Existing = 'owned glyph'\n",
      )
      assert.equal(
        readFileSync(join(cwd, 'glyphs/nested/icon.svg'), 'utf8'),
        '<svg>owned</svg>',
      )
      assert.equal(
        readFileSync(join(cwd, 'owned'), 'utf8'),
        scenario === 'conflict' ? 'fork\n' : 'original\n',
      )
      assert.equal(readFileSync(join(cwd, 'unrelated'), 'utf8'), 'upstream\n')
      // Git cannot identify a fully rewritten rename; preserve that unrelated addition.
      assert.equal(
        existsSync(join(cwd, 'renamed')),
        ['rename-heavy', 'collision'].includes(scenario),
      )
      const state = JSON.parse(readFileSync(join(cwd, 'snapshot.json'), 'utf8'))
      for (const file of state.paths) {
        const original = git('show', `${state.ref}:${file}`)
        assert.equal(git('show', `:${file}`), original)
        assert.equal(readFileSync(join(cwd, file), 'utf8'), original)
      }
      assert.equal(existsSync(join(cwd, 'absent')), false)
      assert.equal(
        readFileSync(join(cwd, 'literal1other.svg'), 'utf8'),
        'upstream unrelated',
      )
      assert.equal(
        readFileSync(join(cwd, 'glyphs-other/icon.svg'), 'utf8'),
        'upstream boundary',
      )
      if (scenario === 'additions')
        assert.equal(git('show', ':glyphs/new.svg'), 'new upstream asset')
      if (scenario === 'collision')
        assert.equal(existsSync(join(cwd, 'renamed')), true)
      else assert.equal(git('ls-files', '-u'), '')
      const before = git('diff', '--binary', 'HEAD')
      state.paths.push('unrelated')
      put('snapshot.json', JSON.stringify(state))
      const invalid = spawnSync(
        process.execPath,
        [helper, 'restore', 'snapshot.json'],
        {cwd, encoding: 'utf8'},
      )
      assert.equal(invalid.status, 1)
      assert.match(invalid.stderr, /Invalid or stale/)
      assert.equal(git('diff', '--binary', 'HEAD'), before)
    } finally {
      rmSync(cwd, {recursive: true, force: true})
    }
  })
}

const workflow = readFileSync(
  new URL('../.github/workflows/sync-upstream.yml', import.meta.url),
  'utf8',
)
function workflowRun(name) {
  const step = workflow
    .split(`      - name: ${name}\n`)[1]
    ?.split('\n      - name: ')[0]
  assert.ok(step, name)
  const script = step.split('        run: |\n')[1]
  assert.ok(script, name)
  return script
    .split('\n')
    .filter(line => line.startsWith('          ') || !line)
    .map(line => line.slice(10))
    .join('\n')
}

for (const failure of ['compatibility', 'restore', 'merge', 'conflict']) {
  test(`workflow ${failure} failure routing`, () => {
    const cwd = mkdtempSync(join(tmpdir(), 'northsky-workflow-'))
    const put = (file, content, executable = false) => {
      mkdirSync(join(cwd, file, '..'), {recursive: true})
      writeFileSync(join(cwd, file), content)
      if (executable) chmodSync(join(cwd, file), 0o755)
    }
    try {
      put('scripts/owned-assets.mjs', '')
      put(
        'bin/git',
        `#!/bin/bash
case "$1" in
  rev-parse) echo abc123 ;;
  merge) if [ "$FAILURE" = merge ]; then exit 2; elif [ "$FAILURE" = conflict ]; then exit 1; fi ;;
  ls-files) if [ "$FAILURE" = conflict ]; then echo 'conflicted asset'; fi ;;
esac
`,
        true,
      )
      put(
        'bin/node',
        `#!/bin/bash
echo "$2" >> "$TRACE"
if [ "$2" = restore ] && [ "$FAILURE" = restore ]; then exit 17; fi
if [ "$2" = check ]; then
  echo 'Person.tsx: missing restored export PersonPlus_Filled_Corner2_Rounded'
  echo 'Unowned upstream icon retained: community/BackerKit.tsx'
  exit 1
fi
`,
        true,
      )
      const env = {
        ...process.env,
        PATH: `${join(cwd, 'bin')}:${process.env.PATH}`,
        FAILURE: failure,
        TRACE: join(cwd, 'trace'),
        GITHUB_OUTPUT: join(cwd, 'output'),
        UPSTREAM_BRANCH: 'main',
        BASE_BRANCH: 'main',
        SYNC_BRANCH: 'fixture',
        KEEP_OURS: '',
      }
      const run = script =>
        spawnSync('bash', ['-c', script], {cwd, env, encoding: 'utf8'})
      const merged = run(
        workflowRun('Merge upstream and auto-resolve known conflicts'),
      )
      assert.equal(
        merged.status,
        failure === 'restore' ? 17 : failure === 'merge' ? 2 : 0,
        merged.stderr,
      )
      if (merged.status !== 0) {
        assert.doesNotMatch(readFileSync(join(cwd, 'trace'), 'utf8'), /check/)
        assert.equal(existsSync(join(cwd, 'pr-body.md')), false)
      } else {
        env.ASSET_STATE = readFileSync(join(cwd, 'output'), 'utf8').match(
          /^asset_state=(.+)$/m,
        )[1]
        const checked = run(workflowRun('Check owned icon compatibility'))
        assert.equal(checked.status, 1)
        assert.match(
          workflow,
          /id: assets\n        if: steps.check.outputs.proceed == 'true'\n        continue-on-error: true/,
        )
        Object.assign(env, {
          COMMITS: '1',
          UP_SHA: 'abc123',
          CLEAN: 'true',
          AUTO_RESOLVED: '',
          LOCK_REGENERATED: 'false',
          CONFLICTS: '',
          GITHUB_DIR_SKIPPED: '',
          ASSETS_OUTCOME: 'failure',
          INSTALL_OUTCOME: 'skipped',
          I18N_OUTCOME: 'skipped',
          TYPECHECK_OUTCOME: 'skipped',
          LINT_OUTCOME: 'skipped',
          TEST_OUTCOME: 'skipped',
        })
        const body = run(workflowRun('Build PR body'))
        assert.equal(body.status, 0, body.stderr)
        const report = readFileSync(join(cwd, 'pr-body.md'), 'utf8')
        assert.match(report, /Owned icon compatibility: ❌ fail/)
        assert.match(report, /PersonPlus_Filled_Corner2_Rounded/)
        assert.match(report, /community\/BackerKit.tsx/)
      }
      const output = readFileSync(join(cwd, 'output'), 'utf8')
      const state = output.match(/^asset_state=(.+)$/m)?.[1]
      if (state) rmSync(state, {recursive: true, force: true})
    } finally {
      rmSync(cwd, {recursive: true, force: true})
    }
  })
}
