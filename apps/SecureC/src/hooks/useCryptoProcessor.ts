'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { downloadFile, genid } from '@/lib'
import { useProcessStore } from '@/store/useProcessStore'
import type { FileInfo, ProcessResult } from '@/types'
import { InputModeEnum, ModeEnum, StatusEnum } from '@/types'

export function useCryptoProcessor() {
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<InputModeEnum>(InputModeEnum.FILE)
  const [activeTab, setActiveTab] = useState<ModeEnum>(ModeEnum.ENCRYPT)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const { addResult, updateResult, processResults, removeResult } =
    useProcessStore(
      useShallow((state) => ({
        addResult: state.addResult,
        updateResult: state.updateResult,
        processResults: state.processResults,
        removeResult: state.removeResult,
      })),
    )

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/cryptoWorker.ts', import.meta.url),
    )

    return () => {
      workerRef.current?.terminate()

      const results = useProcessStore.getState().processResults
      results.forEach((result) => {
        if (result.downloadUrl) {
          URL.revokeObjectURL(result.downloadUrl)
        }
      })
    }
  }, [])

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file)
    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        type:
          file.type ||
          (file.name.endsWith('.enc') ? 'application/encrypted' : 'Unknown'),
      })
    } else {
      setFileInfo(null)
    }
  }, [])

  const clearInput = useCallback(() => {
    setSelectedFile(null)
    setFileInfo(null)
    setTextInput('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleTabChange = useCallback(
    (value: ModeEnum) => {
      setActiveTab(value)
      clearInput()
    },
    [clearInput],
  )

  const handleDownloadResult = useCallback((result: ProcessResult) => {
    if (result.status !== StatusEnum.COMPLETED) return
    if (result.inputMode === InputModeEnum.MESSAGE) {
      const filename =
        result.mode === ModeEnum.ENCRYPT
          ? `encrypted_text_${result.timestamp}.enc`
          : `${result.timestamp}.txt`
      downloadFile(result.data, filename)
    } else if (result.fileInfo) {
      downloadFile(result.data, result.fileInfo.name)
    }
    toast.success('File downloaded successfully')
  }, [])

  const processInput = useCallback(async () => {
    const mode = activeTab

    if (inputMode === InputModeEnum.FILE && !selectedFile) {
      toast.error('Please select a file first')
      return
    }
    if (inputMode === InputModeEnum.MESSAGE && !textInput.trim()) {
      toast.error('Please input the message for processing')
      return
    }
    if (!password) {
      toast.error('Please enter a password')
      return
    }

    const taskId = String(genid.nextId())

    const initialResult: ProcessResult = {
      id: taskId,
      mode,
      inputMode,
      data: new ArrayBuffer(0),
      fileInfo: fileInfo || undefined,
      timestamp: Date.now(),
      status: StatusEnum.PROCESSING,
      progress: 0,
      stage: 'Initializing...',
    }

    addResult(initialResult)
    toast.info(
      `${mode === ModeEnum.ENCRYPT ? 'Encryption' : 'Decryption'} started`,
    )

    try {
      const worker = workerRef.current
      if (!worker) throw new Error('Web Worker not initialized')

      if (inputMode === InputModeEnum.FILE && selectedFile) {
        const result = await new Promise<{
          data: Blob
          filename: string
          base64?: string
          originalExtension?: string
        }>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const { data, error, progress, stage } = e.data
            if (error) {
              reject(new Error(error))
            } else if (progress !== undefined) {
              updateResult(taskId, {
                progress,
                stage: stage || `Processing... ${progress}%`,
              })
            } else if (data) {
              resolve(data)
            }
          }

          worker.postMessage({
            mode,
            file: selectedFile,
            filename: selectedFile.name,
            password,
            isTextMode: false,
          })
        })

        const resultArrayBuffer = await result.data.arrayBuffer()

        const blob = new Blob([resultArrayBuffer], { type: result.data.type })
        const downloadUrl = URL.createObjectURL(blob)

        updateResult(taskId, {
          data: resultArrayBuffer,
          status: StatusEnum.COMPLETED,
          progress: 100,
          stage: 'Complete!',
          downloadUrl,
          fileInfo: {
            name: result.filename,
            size: result.data.size,
            type: result.data.type,
            originalExtension: result.originalExtension,
          },
        })

        toast.success(
          `File ${mode === ModeEnum.ENCRYPT ? 'encrypted' : 'decrypted'} successfully!`,
        )

        clearInput()
      } else if (inputMode === InputModeEnum.MESSAGE) {
        const result = await new Promise<{
          data: Blob
          filename: string
          base64: string
        }>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const { data, error, progress, stage } = e.data
            if (error) {
              reject(new Error(error))
            } else if (progress !== undefined) {
              updateResult(taskId, {
                progress,
                stage: stage || `Processing... ${progress}%`,
              })
            } else if (data) {
              resolve(data)
            }
          }

          worker.postMessage({
            mode,
            text: textInput,
            password,
            isTextMode: true,
          })
        })

        const resultArrayBuffer = await result.data.arrayBuffer()

        updateResult(taskId, {
          data: resultArrayBuffer,
          text: result.base64,
          status: StatusEnum.COMPLETED,
          progress: 100,
          stage: 'Complete!',
        })

        toast.success(
          `Text ${mode === ModeEnum.ENCRYPT ? 'encrypted' : 'decrypted'} successfully! Check the history to view result.`,
        )

        clearInput()
      }
    } catch (error) {
      updateResult(taskId, {
        status: StatusEnum.FAILED,
        error: error instanceof Error ? error.message : 'An error occurred',
        progress: 0,
        stage: 'Failed',
      })

      toast.error(
        error instanceof Error
          ? error.message
          : 'An error occurred during processing',
      )
    }
  }, [
    activeTab,
    inputMode,
    selectedFile,
    textInput,
    password,
    fileInfo,
    addResult,
    updateResult,
    clearInput,
  ])

  const isProcessDisabled =
    (inputMode === InputModeEnum.FILE && !selectedFile) ||
    (inputMode === InputModeEnum.MESSAGE && !textInput.trim()) ||
    !password

  return {
    password,
    setPassword,
    selectedFile,
    fileInfo,
    textInput,
    setTextInput,
    inputMode,
    setInputMode,
    activeTab,
    handleTabChange,
    fileInputRef,
    handleFileSelect,
    processInput,
    handleDownloadResult,
    processResults,
    removeResult,
    isProcessDisabled,
  }
}
