import b4a from 'b4a'
import c from 'compact-encoding'
import {
  sendFile,
  type ChunkHeader,
  type ControlMessage,
  type DriveChannel
} from '@altersend/drive'
import { chunkEncoding, type ChunkFrame } from '@altersend/drive/transport'
import type { PeerDriveLike } from '../transport'
import type { BridgeSocket, BridgeStream, IrohBridge } from './bridge'

/**
 * Кадры внутри одного QUIC-стрима: `[u32 len][u8 kind][payload]`.
 * kind 0 — ControlMessage движка (JSON), kind 1 — чанк тем же `chunkEncoding`,
 * что и в Protomux-варианте, так что провод совместим по смыслу.
 */
const KIND_CONTROL = 0
const KIND_CHUNK = 1

function frame(kind: number, payload: Uint8Array): Uint8Array {
  const out = b4a.alloc(5 + payload.length)
  const len = payload.length + 1
  out[0] = (len >>> 24) & 0xff
  out[1] = (len >>> 16) & 0xff
  out[2] = (len >>> 8) & 0xff
  out[3] = len & 0xff
  out[4] = kind
  out.set(payload, 5)
  return out
}

function readLength(buf: Uint8Array): number {
  return ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0
}

class IrohDriveChannel implements DriveChannel {
  private socket: BridgeSocket | null = null
  private readonly outbox: Uint8Array[] = []
  private buf: Uint8Array = b4a.alloc(0)
  private onMessageCb: ((message: ControlMessage) => void) | null = null
  private onChunkCb: ((header: ChunkHeader, data: Uint8Array) => void) | null = null
  private readonly waiters: (() => void)[] = []
  private pendingBytes = 0
  private closed = false

  bind(stream: BridgeStream): void {
    if (this.closed) {
      stream.socket.destroy()
      return
    }
    this.socket = stream.socket
    this.buf = b4a.concat([this.buf, stream.rest])
    stream.socket.on('data', (chunk: Uint8Array) => {
      this.buf = b4a.concat([this.buf, chunk])
      this.parse()
    })
    stream.socket.on('drain', () => this.drained())
    stream.socket.on('close', () => this.drained())
    while (this.outbox.length) {
      const next = this.outbox.shift()
      if (next) this.rawWrite(next)
    }
    this.parse()
  }

  private drained(): void {
    this.pendingBytes = 0
    const waiting = this.waiters.splice(0)
    for (const resolve of waiting) resolve()
  }

  private rawWrite(data: Uint8Array): void {
    const socket = this.socket
    if (!socket) {
      this.outbox.push(data)
      return
    }
    this.pendingBytes += data.length
    if (socket.write(data) !== false) this.pendingBytes = 0
  }

  private parse(): void {
    for (;;) {
      if (this.buf.length < 4) return
      const len = readLength(this.buf)
      if (this.buf.length < 4 + len) return
      const kind = this.buf[4]
      const body = b4a.from(this.buf.subarray(5, 4 + len))
      this.buf = this.buf.subarray(4 + len)

      if (kind === KIND_CONTROL) {
        try {
          this.onMessageCb?.(JSON.parse(b4a.toString(body)) as ControlMessage)
        } catch (err) {
          console.warn('IrohDriveChannel: битый control-кадр', err)
        }
      } else if (kind === KIND_CHUNK) {
        const decoded = c.decode(chunkEncoding, body) as ChunkFrame
        this.onChunkCb?.({ transferId: decoded.transferId, index: decoded.index }, decoded.data)
      }
    }
  }

  send(message: ControlMessage): void {
    this.rawWrite(frame(KIND_CONTROL, b4a.from(JSON.stringify(message))))
  }

  sendChunk(header: ChunkHeader, data: Uint8Array): void {
    this.rawWrite(frame(KIND_CHUNK, c.encode(chunkEncoding, { ...header, data })))
  }

  onMessage(handler: (message: ControlMessage) => void): void {
    this.onMessageCb = handler
    this.parse()
  }

  onChunk(handler: (header: ChunkHeader, data: Uint8Array) => void): void {
    this.onChunkCb = handler
    this.parse()
  }

  bufferedAmount(): number {
    return this.pendingBytes
  }

  whenWritable(): Promise<void> {
    if (this.closed || this.pendingBytes === 0) return Promise.resolve()
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.drained()
    try {
      this.socket?.end()
    } catch {}
    this.socket = null
  }

  /** Сообщить движку об обрыве так же, как это делает Protomux-вариант. */
  notifyDisconnect(transferId: string): void {
    const cancel: ControlMessage = {
      type: 'cancel',
      transferId,
      reason: 'Peer disconnected'
    }
    if (this.onMessageCb) this.onMessageCb(cancel)
  }
}

/** Канал чанков поверх iroh: один QUIC-стрим на файл. */
export class IrohDrive implements PeerDriveLike {
  readonly supported: Promise<boolean> = Promise.resolve(true)

  private readonly bridge: IrohBridge
  private readonly channels = new Map<string, IrohDriveChannel>()
  private readonly sends = new Map<string, AbortController>()
  private destroyed = false

  constructor(bridge: IrohBridge) {
    this.bridge = bridge
  }

  session(fileId: string): DriveChannel {
    const existing = this.channels.get(fileId)
    if (existing) return existing
    const channel = new IrohDriveChannel()
    this.channels.set(fileId, channel)
    if (this.destroyed) channel.notifyDisconnect(fileId)
    return channel
  }

  /** Входящий стрим с заголовком `{stream:'file', fileId}` — привязать к ожидающему каналу. */
  attachStream(fileId: string, stream: BridgeStream): void {
    const channel = this.channels.get(fileId) ?? (this.session(fileId) as IrohDriveChannel)
    channel.bind(stream)
  }

  async serve(fileId: string, name: string, localPath: string | null): Promise<void> {
    const previous = this.sends.get(fileId)
    if (previous) previous.abort()

    const abort = new AbortController()
    this.sends.set(fileId, abort)

    const channel = this.session(fileId) as IrohDriveChannel

    try {
      if (this.destroyed) return
      if (!localPath) {
        channel.send({
          type: 'cancel',
          transferId: fileId,
          reason: 'File is no longer readable on the sender'
        })
        return
      }

      const stream = await this.bridge.open({ stream: 'file', fileId, name })
      channel.bind(stream)

      await sendFile(localPath, channel, {
        transferId: fileId,
        name,
        signal: abort.signal,
        notifyPeerOnCancel: false
      })
    } finally {
      channel.close()
      this.channels.delete(fileId)
      if (this.sends.get(fileId) === abort) this.sends.delete(fileId)
    }
  }

  cancel(): void {
    for (const abort of this.sends.values()) abort.abort()
  }

  destroy(): void {
    this.destroyed = true
    this.cancel()
    for (const [fileId, channel] of this.channels) {
      channel.notifyDisconnect(fileId)
      channel.close()
    }
    this.channels.clear()
  }
}
