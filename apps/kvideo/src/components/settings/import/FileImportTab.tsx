'use client'

import { useRef, useState } from 'react'

interface FileImportTabProps {
  onImport: (content: string) => Promise<boolean> | boolean
}

export function FileImportTab({ onImport }: FileImportTabProps) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess(false)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const result = await onImport(content)

        if (result) {
          setSuccess(true)
          setError('')
        } else {
          setError('导入失败：文件格式无效')
          setSuccess(false)
        }
      } catch (err) {
        console.error(err)
        setError('导入失败：无法读取文件或格式错误')
        setSuccess(false)
      }
    }
    reader.readAsText(file)

    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
        <p className="text-[var(--text-color-secondary)] text-sm mb-4">
          选择之前导出的设置文件（JSON 配置文件）。支持新旧版本格式。
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={success}
          className="w-full px-6 py-8 rounded-[var(--radius-2xl)] bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] border-2 border-dashed border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_5%,transparent)] hover:border-[var(--accent-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] group-hover:scale-110 transition-transform duration-200">
              <svg
                className="w-6 h-6 text-[var(--text-color-secondary)] group-hover:text-[var(--accent-color)] transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="font-medium">点击选择文件</span>
          </div>
        </button>

        {error && (
          <div className="mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-[var(--radius-2xl)] px-4 py-3 border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-[var(--radius-2xl)] px-4 py-3 flex items-center gap-2 border border-green-100 dark:border-green-900/30">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            导入成功！正在刷新...
          </div>
        )}
      </div>
    </div>
  )
}
