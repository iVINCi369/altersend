import { app, Menu, nativeImage, nativeTheme, Tray } from 'electron'
import fs from 'fs'
import path from 'path'
import { isMac, isWindows } from 'which-runtime'
import { createJsonStore } from './store/index.js'

/**
 * Значок в трее.
 *
 * Передача живёт в воркл ете, а он умирает вместе с процессом, поэтому на
 * Windows и Linux закрытие окна прячет его, а не завершает приложение —
 * иначе половина отправок обрывалась бы на полпути. Выход только явный,
 * из меню значка. На macOS приложение и так переживает закрытие окна,
 * там значок просто даёт быстрый доступ.
 */

export interface TrayDeps {
  /** Показать окно или создать заново, если его уже нет. */
  reveal: () => void
  productName: string
}

const hintStore = createJsonStore('tray.json', { closeHintShown: false })

let tray: Tray | null = null
let quitting = false

/** Локали в главном процессе нет: @ruqa/locales тянет react-i18next. */
function strings() {
  const ru = app.getLocale().toLowerCase().startsWith('ru')
  return {
    open: (name: string) => (ru ? `Открыть ${name}` : `Open ${name}`),
    quit: ru ? 'Выход' : 'Quit',
    hintTitle: (name: string) => (ru ? `${name} продолжает работать` : `${name} is still running`),
    hintBody: ru
      ? 'Передачи идут в фоне. Выйти можно через значок в трее.'
      : 'Transfers keep going in the background. Quit from the tray icon.'
  }
}

/** Упакованное приложение: electron-builder кладёт значки в ресурсы, forge — рядом с app. */
function iconDir(): string | null {
  const candidates: string[] = []
  if (app.isPackaged) candidates.push(path.join(process.resourcesPath, 'tray'))
  candidates.push(path.join(app.getAppPath(), 'build', 'tray'))
  return candidates.find((dir) => fs.existsSync(dir)) ?? null
}

function iconFile(dir: string): string {
  // Суффикс Template в имени — сигнал macOS, что значок нужно перекрашивать самой.
  if (isMac) return path.join(dir, 'trayTemplate.png')
  const variant = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  const ico = path.join(dir, `tray-${variant}.ico`)
  if (isWindows && fs.existsSync(ico)) return ico
  return path.join(dir, `tray-${variant}.png`)
}

export function isQuitting(): boolean {
  return quitting
}

export function trayActive(): boolean {
  return tray !== null && !tray.isDestroyed()
}

/** Единственный путь к настоящему выходу, когда значок держит приложение. */
export function beginQuit(): void {
  quitting = true
  app.quit()
}

export function setupTray(deps: TrayDeps): void {
  if (tray) return

  const dir = iconDir()
  if (!dir) {
    console.warn('[tray] значки не найдены, значок в трее выключен')
    return
  }

  const image = nativeImage.createFromPath(iconFile(dir))
  if (image.isEmpty()) {
    console.warn('[tray] значок не читается, значок в трее выключен')
    return
  }

  tray = new Tray(image)
  tray.setToolTip(deps.productName)

  const t = strings()
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: t.open(deps.productName), click: deps.reveal },
      { type: 'separator' },
      { label: t.quit, click: beginQuit }
    ])
  )

  // На macOS клик по значку в меню-баре и так раскрывает меню — вешать на него
  // ещё и открытие окна значит показывать одновременно и то, и другое.
  if (!isMac) {
    tray.on('click', deps.reveal)
    tray.on('double-click', deps.reveal)
  }

  // В Windows 11 панель задач меняет тему вместе с системной; без этого
  // значок на половине машин сливается с фоном.
  nativeTheme.on('updated', () => {
    if (!tray || tray.isDestroyed()) return
    const current = iconDir()
    if (current) tray.setImage(nativeImage.createFromPath(iconFile(current)))
  })

  app.on('before-quit', () => {
    quitting = true
  })

  app.on('will-quit', () => {
    tray?.destroy()
    tray = null
  })
}

/** Первый раз окно прячется молча — объясняем, куда оно делось. */
export async function noteWindowHidden(productName: string): Promise<void> {
  if (!isWindows || !tray || tray.isDestroyed()) return
  try {
    const state = await hintStore.read()
    if (state.closeHintShown) return
    await hintStore.write({ closeHintShown: true })
    if (!tray || tray.isDestroyed()) return
    const t = strings()
    tray.displayBalloon({ title: t.hintTitle(productName), content: t.hintBody })
  } catch (err) {
    console.warn('[tray] не удалось показать подсказку', err)
  }
}
