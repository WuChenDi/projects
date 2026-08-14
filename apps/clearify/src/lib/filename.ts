// Strips only the last extension (e.g. "my.photo.jpg" -> "my.photo"), unlike
// `split('.')[0]` which truncates at the first dot in the name.
export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^./]+$/, '')
}
