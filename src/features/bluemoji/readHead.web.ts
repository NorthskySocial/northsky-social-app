const HEAD_BYTES = 65536

/** The first bytes of a picked image, for sniffing its format. */
export async function readHead(uri: string): Promise<Uint8Array> {
  const blob = await fetch(uri).then(r => r.blob())
  return new Uint8Array(await blob.slice(0, HEAD_BYTES).arrayBuffer())
}
