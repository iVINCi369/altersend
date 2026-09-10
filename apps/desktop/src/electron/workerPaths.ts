import { app } from 'electron'
import path from 'path'
import { isLinux, isWindows } from 'which-runtime'

export function getAppPath(): string | null {
  if (!app.isPackaged) return null
  if (isLinux && process.env.APPIMAGE) return process.env.APPIMAGE
  if (isWindows) return process.execPath
  return path.join(process.resourcesPath, '..', '..')
}

export function getWorkerEntryPath(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'node_modules/@ruqa/core/dist/worklet/index.js')
  }
  return path.join(app.getAppPath(), '../../packages/core/dist/worklet/index.js')
}

export function getWorkerClientPath(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'node_modules/@ruqa/core/dist/client/worker-client.js')
  }
  return path.join(app.getAppPath(), '../../packages/core/dist/client/worker-client.js')
}
