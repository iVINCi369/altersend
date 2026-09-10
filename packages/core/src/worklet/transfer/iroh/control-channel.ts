import b4a from 'b4a'
import { PROTOCOL_VERSION, type PeerControlMessage } from '../control-channel'
import { isValidControlMessage } from '../control-validation'
import type { ControlChannelLike } from '../transport'
import type { BridgeSocket, BridgeStream } from './bridge'

/**
 * Управляющий канал поверх выделенного QUIC-стрима: построчный JSON.
 * Protomux здесь не нужен — стрим и так свой, мультиплексировать нечего.
 */
export class IrohControlChannel implements ControlChannelLike {
  private socket: BridgeSocket | null = null
  private buf: Uint8Array = b4a.alloc(0)
  private readonly pending: PeerControlMessage[] = []
  private readonly onmessage: (message: PeerControlMessage) => void

  constructor(onmessage: (message: PeerControlMessage) => void) {
    this.onmessage = onmessage
  }

  bind(stream: BridgeStream): void {
    this.socket = stream.socket
    this.buf = b4a.concat([this.buf, stream.rest])
    stream.socket.on('data', (chunk: Uint8Array) => {
      this.buf = b4a.concat([this.buf, chunk])
      this.flushIn()
    })
    while (this.pending.length) {
      const next = this.pending.shift()
      if (next) this.write(next)
    }
    this.flushIn()
  }

  private flushIn(): void {
    for (;;) {
      let nl = -1
      for (let i = 0; i < this.buf.length; i++) {
        if (this.buf[i] === 0x0a) {
          nl = i
          break
        }
      }
      if (nl === -1) return
      const line = b4a.toString(this.buf.subarray(0, nl)).trim()
      this.buf = this.buf.subarray(nl + 1)
      if (!line) continue

      let raw: unknown
      try {
        raw = JSON.parse(line)
      } catch {
        console.warn('IrohControlChannel: битая строка управления')
        continue
      }
      if (!isValidControlMessage(raw)) {
        const m = raw as { type?: unknown; protocolVersion?: unknown } | null
        console.warn(
          'IrohControlChannel: dropping invalid message',
          'protocolVersion=',
          m?.protocolVersion,
          'type=',
          m?.type
        )
        continue
      }
      this.onmessage(raw)
    }
  }

  private write(message: PeerControlMessage): void {
    this.socket?.write(JSON.stringify({ ...message, protocolVersion: PROTOCOL_VERSION }) + '\n')
  }

  send(message: PeerControlMessage): void {
    if (!this.socket) {
      this.pending.push(message)
      return
    }
    this.write(message)
  }

  close(): void {
    try {
      this.socket?.end()
    } catch {}
    this.socket = null
  }
}
