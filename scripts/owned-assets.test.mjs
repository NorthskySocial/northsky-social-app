import assert from 'node:assert/strict'
import {execFileSync, spawnSync} from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
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
        JSON.stringify({roots: ['glyphs'], files: ['owned']}),
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
      if (scenario === 'directory-delete') git('rm', '-r', 'glyphs')
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
      put('unrelated', 'upstream\n')
      git('add', '.')
      commit('upstream')
      git('switch', 'fork')
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
      assert.equal(merge.status, scenario === 'conflict' ? 1 : 0)
      for (let attempt = 0; attempt < 2; attempt++) {
        const restored = spawnSync(
          process.execPath,
          [helper, 'restore', 'snapshot.json'],
          {cwd, encoding: 'utf8'},
        )
        const missing = scenario === 'new-export' || scenario === 'new-module'
        assert.equal(restored.status, missing ? 1 : 0)
        if (missing) {
          assert.match(restored.stderr, /Unresolved upstream icon requirements/)
          assert.match(restored.stderr, /Added/)
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
        scenario === 'rename-heavy',
      )
      assert.equal(git('ls-files', '-u'), '')
    } finally {
      rmSync(cwd, {recursive: true, force: true})
    }
  })
}
