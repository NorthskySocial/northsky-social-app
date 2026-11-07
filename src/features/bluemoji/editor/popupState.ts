/**
 * Remembers that the completion popup was dismissed with Escape, and for which
 * query. Dismissal holds while the user keeps typing the same thing, and ends as
 * soon as the query changes or a new `:` starts, so the popup does not nag after
 * Escape but still comes back when they carry on.
 */
export class DismissState {
  private query: string | null = null

  dismiss(query: string) {
    this.query = query
  }

  /** A fresh suggestion session (a new `:`) always starts undismissed. */
  reset() {
    this.query = null
  }

  isDismissed(query: string) {
    return this.query !== null && this.query === query
  }
}
