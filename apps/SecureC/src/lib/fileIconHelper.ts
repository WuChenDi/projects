import type { LucideIcon } from 'lucide-react'
import {
  Binary,
  Database,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Package,
  Presentation,
} from 'lucide-react'

export interface FileTypeConfig {
  icon: LucideIcon
  color: string
  bgColor: string
  darkBgColor: string
  label: string
}

const fileTypeMap: Record<string, FileTypeConfig> = {
  image: {
    icon: FileImage,
    label: 'Image',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    darkBgColor: 'dark:bg-purple-900/30',
  },
  video: {
    icon: FileVideo,
    label: 'Video',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    darkBgColor: 'dark:bg-pink-900/30',
  },
  audio: {
    icon: FileAudio,
    label: 'Audio',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    darkBgColor: 'dark:bg-orange-900/30',
  },
  code: {
    icon: FileCode,
    label: 'Code',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    darkBgColor: 'dark:bg-green-900/30',
  },
  archive: {
    icon: FileArchive,
    label: 'Archive',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    darkBgColor: 'dark:bg-yellow-900/30',
  },
  document: {
    icon: FileText,
    label: 'Document',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-900/30',
  },
  spreadsheet: {
    icon: FileSpreadsheet,
    label: 'Spreadsheet',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    darkBgColor: 'dark:bg-emerald-900/30',
  },
  presentation: {
    icon: Presentation,
    label: 'Presentation',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    darkBgColor: 'dark:bg-red-900/30',
  },
  database: {
    icon: Database,
    label: 'Database',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    darkBgColor: 'dark:bg-cyan-900/30',
  },
  package: {
    icon: Package,
    label: 'Package',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    darkBgColor: 'dark:bg-indigo-900/30',
  },
  binary: {
    icon: Binary,
    label: 'Binary',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    darkBgColor: 'dark:bg-gray-800/30',
  },
  default: {
    icon: File,
    label: 'File',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    darkBgColor: 'dark:bg-gray-800/30',
  },
}

const extensionMap: Record<string, keyof typeof fileTypeMap> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  bmp: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  tiff: 'image',
  heic: 'image',

  mp4: 'video',
  avi: 'video',
  mov: 'video',
  wmv: 'video',
  flv: 'video',
  mkv: 'video',
  webm: 'video',
  m4v: 'video',

  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  ogg: 'audio',
  wma: 'audio',
  m4a: 'audio',
  opus: 'audio',

  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  py: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  h: 'code',
  cs: 'code',
  php: 'code',
  rb: 'code',
  go: 'code',
  rs: 'code',
  swift: 'code',
  kt: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  json: 'code',
  xml: 'code',
  yaml: 'code',
  yml: 'code',
  sh: 'code',
  bash: 'code',

  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
  xz: 'archive',

  txt: 'document',
  doc: 'document',
  docx: 'document',
  pdf: 'document',
  rtf: 'document',
  odt: 'document',
  md: 'document',

  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  csv: 'spreadsheet',
  ods: 'spreadsheet',

  ppt: 'presentation',
  pptx: 'presentation',
  odp: 'presentation',
  key: 'presentation',

  db: 'database',
  sqlite: 'database',
  sql: 'database',
  mdb: 'database',

  exe: 'package',
  msi: 'package',
  dmg: 'package',
  pkg: 'package',
  deb: 'package',
  rpm: 'package',
  apk: 'package',

  bin: 'binary',
  dat: 'binary',
  enc: 'binary',
}

export function getFileTypeConfig(filename: string): FileTypeConfig {
  const extension = filename.split('.').pop()?.toLowerCase()
  const typeKey = (extension && extensionMap[extension]) || 'default'
  return fileTypeMap[typeKey]
}

export function getFileTypeConfigByMime(mimeType: string): FileTypeConfig {
  if (mimeType.startsWith('image/')) return fileTypeMap.image
  if (mimeType.startsWith('video/')) return fileTypeMap.video
  if (mimeType.startsWith('audio/')) return fileTypeMap.audio
  if (mimeType.startsWith('text/')) return fileTypeMap.document
  if (mimeType.includes('zip') || mimeType.includes('compressed'))
    return fileTypeMap.archive
  if (mimeType.includes('pdf')) return fileTypeMap.document
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return fileTypeMap.spreadsheet
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return fileTypeMap.presentation

  return fileTypeMap.default
}

export function getFileIcon(
  filename: string,
  mimeType?: string,
): FileTypeConfig {
  const configByFilename = getFileTypeConfig(filename)

  if (configByFilename === fileTypeMap.default && mimeType) {
    return getFileTypeConfigByMime(mimeType)
  }

  return configByFilename
}
export function getFileTypeLabel(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return fileTypeMap.default.label

  const specialLabels: Record<string, string> = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    ppt: 'PPT',
    pptx: 'PPT',
    md: 'Markdown',
  }

  if (specialLabels[ext]) {
    return specialLabels[ext]
  }

  return getFileTypeConfig(filename).label
}
