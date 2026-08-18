import {describe, expect, it} from '@jest/globals'

import {composeReportComment} from '../comment'

describe('composeReportComment', () => {
  it('puts the wrapped label above the details', () => {
    expect(
      composeReportComment({label: 'ableism', details: 'see the third reply'}),
    ).toBe('<ableism>\nsee the third reply')
  })

  it('sends the wrapped label alone when there are no details', () => {
    expect(composeReportComment({label: 'ableism'})).toBe('<ableism>')
    expect(composeReportComment({label: 'ableism', details: ''})).toBe(
      '<ableism>',
    )
  })

  it('leaves the details alone when there is no label', () => {
    expect(composeReportComment({details: 'see the third reply'})).toBe(
      'see the third reply',
    )
  })

  it('sends nothing when there is neither', () => {
    expect(composeReportComment({})).toBeUndefined()
  })

  /*
   * Ozone collapses the newline when it shows the comment, so the brackets
   * must still separate the label from the reporter's words on one line.
   */
  it('stays readable when the newline is collapsed to a space', () => {
    const comment = composeReportComment({
      label: 'apologia-transphobia',
      details: 'see the third reply',
    })
    expect(comment?.replace('\n', ' ')).toBe(
      '<apologia-transphobia> see the third reply',
    )
  })
})
