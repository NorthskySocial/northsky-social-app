/**
 * Puts the Northsky label at the head of the report comment.
 *
 * Ozone shows the comment to moderators but does not show `modTool.meta`, so
 * the label must travel in the comment to be read. The report keeps the
 * structured copy in `modTool.meta` for queries. The identifier is used, not
 * the display name, because it is the same value a moderator applies as a
 * label.
 *
 * The angle brackets keep the label readable when Ozone collapses the newline.
 * A web page collapses a newline to a space unless the style says otherwise,
 * so the bracket is what separates the label from the reporter's own words.
 */
export function composeReportComment({
  label,
  details,
}: {
  label?: string
  details?: string
}): string | undefined {
  if (!label) return details
  const tag = `<${label}>`
  if (!details) return tag
  return `${tag}\n${details}`
}
