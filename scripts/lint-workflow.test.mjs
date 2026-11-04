import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'

import {parse} from 'yaml'

const workflow = parse(
  readFileSync(
    new URL('../.github/workflows/lint.yml', import.meta.url),
    'utf8',
  ),
)

test('lint checks cover each platform and keep read-only permissions', () => {
  assert.deepEqual(workflow.permissions, {contents: 'read'})
  assert.deepEqual(workflow.jobs.linting.strategy.matrix.job, [
    'lint',
    'intl:lint',
    'prettier',
    'lexicons:verify',
    'typecheck:ios',
    'typecheck:android',
    'typecheck:web',
  ])
  assert.deepEqual(workflow.jobs.testing.strategy.matrix.shard, [1, 2, 3, 4])
})

test('summary checks cannot silently pass failed or skipped dependencies', () => {
  const lint = workflow.jobs['linting-summary']
  assert.equal(lint.if, 'always()')
  assert.deepEqual(lint.needs, ['linting', 'node-versions'])
  assert.match(lint.steps[0].run, /test "\$RESULT" = "success"/)
  assert.match(lint.steps[0].run, /test "\$NODE_VERSIONS_RESULT" = "success"/)
  const tests = workflow.jobs['testing-summary']
  assert.equal(tests.if, 'always()')
  assert.deepEqual(tests.needs, ['testing'])
  assert.match(tests.steps[0].run, /test "\$RESULT" = "success"/)
})

test('Node verification checks actual container runtimes against the engine range', () => {
  const script = workflow.jobs['node-versions'].steps.at(-1).run
  assert.match(script, /docker run --rm --entrypoint node/)
  assert.match(script, /pnpm dlx semver@7/)
  assert.match(script, /check "eas.json"/)
})
