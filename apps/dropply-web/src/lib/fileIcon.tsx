import {
  Archive,
  Database,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image,
  Music,
  Presentation,
  Video,
} from 'lucide-react'

// File type configuration mapping
const FILE_TYPE_CONFIG = {
  image: {
    extensions: [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'webp',
      'svg',
      'ico',
      'tiff',
    ],
    icon: Image,
    color: 'text-green-500',
  },
  video: {
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'],
    icon: Video,
    color: 'text-red-500',
  },
  audio: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
    icon: Music,
    color: 'text-purple-500',
  },
  document: {
    extensions: ['doc', 'docx', 'rtf', 'odt'],
    icon: FileText,
    color: 'text-blue-500',
  },
  pdf: {
    extensions: ['pdf'],
    icon: FileText,
    color: 'text-red-600',
  },
  spreadsheet: {
    extensions: ['xls', 'xlsx', 'csv', 'ods', 'epub'],
    icon: FileSpreadsheet,
    color: 'text-green-600',
  },
  presentation: {
    extensions: ['ppt', 'pptx', 'odp'],
    icon: Presentation,
    color: 'text-orange-500',
  },
  code: {
    extensions: [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'php',
      'rb',
      'go',
      'rs',
      'swift',
      'kt',
      'scala',
      'html',
      'css',
      'scss',
      'less',
      'json',
      'xml',
      'yaml',
      'yml',
      'sql',
      'sh',
      'bat',
      'ps1',
    ],
    icon: FileCode,
    color: 'text-indigo-500',
  },
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    icon: Archive,
    color: 'text-yellow-600',
  },
  database: {
    extensions: ['db', 'sqlite', 'sqlite3', 'mdb'],
    icon: Database,
    color: 'text-teal-500',
  },
  text: {
    extensions: ['txt', 'md', 'readme', 'log'],
    icon: FileText,
    color: 'text-gray-600',
  },
} as const

// Create extension to file type mapping for fast lookup
const EXTENSION_MAP = new Map<string, keyof typeof FILE_TYPE_CONFIG>()
Object.entries(FILE_TYPE_CONFIG).forEach(([type, config]) => {
  config.extensions.forEach((ext) => {
    EXTENSION_MAP.set(ext, type as keyof typeof FILE_TYPE_CONFIG)
  })
})

/**
 * Get the corresponding file icon based on the file name
 * @param fileName File name
 * @param size Icon size, default is 16
 * @returns React icon component
 */
export const getFileIcon = (fileName: string, size: number = 16) => {
  // Extract file extension
  const extension = fileName.split('.').pop()?.toLowerCase()

  // If no extension, return default file icon
  if (!extension) {
    return <File size={size} className="text-gray-500" />
  }

  // Look up file type from mapping
  const fileType = EXTENSION_MAP.get(extension)

  // If no matching file type found, return default icon
  if (!fileType) {
    return <File size={size} className="text-gray-500" />
  }

  // Get corresponding icon configuration
  const config = FILE_TYPE_CONFIG[fileType]
  const IconComponent = config.icon

  return <IconComponent size={size} className={config.color} />
}
