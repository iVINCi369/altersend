import { Directory, File, Paths } from 'expo-file-system'

const DIRNAME = 'ruqa'
const FILENAME = 'crash-reporting.enabled'

function getMarkerFile(): File | null {
  const documentDirectory = Paths.document
  if (!documentDirectory?.uri) return null
  return new File(new Directory(documentDirectory, DIRNAME), FILENAME)
}

export function isCrashReportingEnabled(): boolean {
  try {
    return getMarkerFile()?.exists ?? false
  } catch {
    return false
  }
}

export function setCrashReportingEnabled(value: boolean): void {
  try {
    const documentDirectory = Paths.document
    if (!documentDirectory?.uri) return
    const dir = new Directory(documentDirectory, DIRNAME)
    const file = new File(dir, FILENAME)
    if (value) {
      if (!dir.exists) dir.create({ idempotent: true, intermediates: true })
      if (!file.exists) file.create()
    } else if (file.exists) {
      file.delete()
    }
  } catch (err) {
    console.warn('crashReportingStorage: setCrashReportingEnabled failed', err)
  }
}
