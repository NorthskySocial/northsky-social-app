import {type Line} from '#/lib/code/highlight'
import {colorForScope, MONO_FONT, useCodeColors} from '#/lib/code/theme'
import {Text} from '#/components/Typography'

/**
 * One highlighted line, as colored spans.
 *
 * An empty line renders a space so it still occupies a row.
 */
export function CodeSpans({line}: {line: Line}) {
  const colors = useCodeColors()

  if (line.length === 0) return <> </>

  return (
    <>
      {line.map((span, i) => (
        // The parent Text sets MONO_FONT, but each nested Text re-applies a
        // font family, so repeat it here or the span reverts to the body UI
        // font.
        <Text
          key={i}
          emoji
          style={{
            color: colorForScope(span.scope, colors),
            fontFamily: MONO_FONT,
          }}>
          {span.value}
        </Text>
      ))}
    </>
  )
}
