import type { PeerIdentityStore } from './peer-identity-store'
import { RacingTransport, type TransportFactory } from './racing'
import { TransferSwarm } from './swarm'
import { IrohTransport } from './iroh/transport'
import type { TransferTransport, TransferTransportCallbacks } from './transport'

export interface TransportOptions {
  identityStore?: PeerIdentityStore
  drive?: boolean
  /**
   * Порт локального моста iroh. Сайдкар поднимает хост-процесс (Electron main
   * или нативный модуль на мобильных) и передаёт порт сюда: Bare не грузит
   * Node-API, поэтому в самом воркл ете iroh жить не может.
   * Не задан — работает только hyperswarm, как раньше.
   */
  irohBridgePort?: number
  /**
   * Имя сессии в сайдкаре. Сайдкар держит по Endpoint'у на сессию, и join
   * закрывает только свою: иначе сопряжение устройств выбивало бы активную
   * передачу и наоборот.
   */
  irohSession?: string
}

export function createTransferTransport(
  callbacks: TransferTransportCallbacks,
  options: TransportOptions = {}
): TransferTransport {
  const swarmFactory: TransportFactory = (cb) =>
    new TransferSwarm(cb, { identityStore: options.identityStore, drive: options.drive })

  if (!options.irohBridgePort) return swarmFactory(callbacks)

  const irohFactory: TransportFactory = (cb) =>
    new IrohTransport(cb, {
      bridgePort: options.irohBridgePort as number,
      session: options.irohSession,
      drive: options.drive
    })

  return new RacingTransport(callbacks, [irohFactory, swarmFactory])
}
