import { Directory, File, Paths } from 'expo-file-system'

const MARKER_DIRNAME = 'ruqa'
const MARKER_FILENAME = 'onboarding.completed'

function getMarkerFile(): File | null {
  const documentDirectory = Paths.document
  if (!documentDirectory?.uri) return null
  return new File(new Directory(documentDirectory, MARKER_DIRNAME), MARKER_FILENAME)
}

function ensureDir(): Directory | null {
  const documentDirectory = Paths.document
  if (!documentDirectory?.uri) return null
  const dir = new Directory(documentDirectory, MARKER_DIRNAME)
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true })
  return dir
}

export function isOnboardingCompleted(): boolean {
  try {
    const file = getMarkerFile()
    return file?.exists ?? false
  } catch {
    return false
  }
}

export function markOnboardingCompleted(): void {
  try {
    ensureDir()
    const file = getMarkerFile()
    if (file && !file.exists) file.create()
  } catch (err) {
    console.warn('onboardingStorage: markOnboardingCompleted failed', err)
  }
}

export function resetOnboardingCompleted(): void {
  try {
    const file = getMarkerFile()
    if (file?.exists) {
      file.delete()
    }
  } catch {}
}
