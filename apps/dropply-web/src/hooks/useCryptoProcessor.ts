'use client'

import { detect } from '@cdlab/cipher'
import { StatusEnum } from '@cdlab/ui/IK'
import { downloadFile } from '@cdlab/utils'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { genid } from '@/lib/genid'
import { useProcessStore } from '@/store/useProcessStore'
import type { FileInfo, ProcessResult } from '@/types/crypto'
import { InputModeEnum, ModeEnum } from '@/types/crypto'

export function useCryptoProcessor() {
  const t = useTranslations('toast')
  const [password, setPassword] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([])
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
    }
  }, [])

  const handleFileSelect = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return

    setSelectedFiles((prev) => [...prev, ...newFiles])

    let hasEncrypted = false
    const newInfos: FileInfo[] = []

    for (const file of newFiles) {
      const { encryptionType } = await detect(file)
      const isEncrypted = encryptionType !== 'unencrypted'
      if (isEncrypted) hasEncrypted = true
      newInfos.push({
        name: file.name,
        size: file.size,
        type: file.type || (isEncrypted ? 'application/encrypted' : 'Unknown'),
      })
    }

    setFileInfos((prev) => [...prev, ...newInfos])
    if (hasEncrypted) {
      setActiveTab(ModeEnum.DECRYPT)
    }
  }, [])

  const handleTextInputChange = useCallback(async (value: string) => {
    setTextInput(value)
    const trimmed = value.trim()
    if (trimmed.length >= 3) {
      const { encryptionType } = await detect(trimmed)
      if (encryptionType !== 'unencrypted') {
        setActiveTab(ModeEnum.DECRYPT)
      }
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFileInfos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearInput = useCallback(() => {
    setSelectedFiles([])
    setFileInfos([])
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

  const handleDownloadResult = useCallback(
    (result: ProcessResult) => {
      if (result.status !== StatusEnum.COMPLETED) return
      if (result.inputMode === InputModeEnum.MESSAGE) {
        const filename =
          result.mode === ModeEnum.ENCRYPT
            ? `encrypted_text_${result.timestamp}.enc`
            : `${result.timestamp}.txt`
        downloadFile({
          data: new Blob([result.data], { type: 'application/octet-stream' }),
          filename,
        })
      } else if (result.fileInfo) {
        downloadFile({
          data: new Blob([result.data], { type: 'application/octet-stream' }),
          filename: result.fileInfo.name,
        })
      }
      toast.success(t('downloadSuccess'))
    },
    [t],
  )

  const processOneFile = useCallback(
    (file: File, taskId: string, mode: ModeEnum): Promise<void> => {
      return new Promise(async (resolve) => {
        try {
          const worker = workerRef.current
          if (!worker) throw new Error('Web Worker not initialized')

          const result = await new Promise<{
            data: Blob
            filename: string
            base64?: string
            originalExtension?: string
          }>((res, rej) => {
            worker.onmessage = (e: MessageEvent) => {
              const { data, error, progress, stage } = e.data
              if (error) {
                rej(new Error(error))
              } else if (progress !== undefined) {
                updateResult(taskId, {
                  progress,
                  stage: stage || `Processing... ${progress}%`,
                })
              } else if (data) {
                res(data)
              }
            }

            worker.postMessage({
              mode,
              file,
              filename: file.name,
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
        } catch (error) {
          updateResult(taskId, {
            status: StatusEnum.FAILED,
            error: error instanceof Error ? error.message : 'An error occurred',
            progress: 0,
            stage: 'Failed',
          })
        }

        resolve()
      })
    },
    [password, updateResult],
  )

  const processInput = useCallback(async () => {
    const mode = activeTab

    if (inputMode === InputModeEnum.FILE && selectedFiles.length === 0) {
      toast.error(t('selectFile'))
      return
    }
    if (inputMode === InputModeEnum.MESSAGE && !textInput.trim()) {
      toast.error(t('enterMessage'))
      return
    }
    if (!password) {
      toast.error(t('enterPassword'))
      return
    }

    toast.info(
      mode === ModeEnum.ENCRYPT
        ? t('encryptionStarted')
        : t('decryptionStarted'),
    )

    if (inputMode === InputModeEnum.FILE) {
      const filesToProcess = [...selectedFiles]
      const infosToProcess = [...fileInfos]
      clearInput()

      // Create all task entries upfront so all loading cards appear immediately
      const taskIds: string[] = []
      for (let i = 0; i < filesToProcess.length; i++) {
        const taskId = String(genid.nextId())
        taskIds.push(taskId)
        addResult({
          id: taskId,
          mode,
          inputMode: InputModeEnum.FILE,
          data: new ArrayBuffer(0),
          fileInfo: infosToProcess[i],
          timestamp: Date.now(),
          status: StatusEnum.PROCESSING,
          progress: 0,
          stage: 'Queued',
        })
      }

      // Process files sequentially through the single worker
      for (let i = 0; i < filesToProcess.length; i++) {
        await processOneFile(filesToProcess[i], taskIds[i], mode)
      }

      toast.success(
        mode === ModeEnum.ENCRYPT ? t('fileEncrypted') : t('fileDecrypted'),
      )
    } else if (inputMode === InputModeEnum.MESSAGE) {
      const taskId = String(genid.nextId())

      const initialResult: ProcessResult = {
        id: taskId,
        mode,
        inputMode,
        data: new ArrayBuffer(0),
        timestamp: Date.now(),
        status: StatusEnum.PROCESSING,
        progress: 0,
        stage: 'Initializing...',
      }

      addResult(initialResult)

      try {
        const worker = workerRef.current
        if (!worker) throw new Error('Web Worker not initialized')

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
          mode === ModeEnum.ENCRYPT ? t('textEncrypted') : t('textDecrypted'),
        )

        clearInput()
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
    }
  }, [
    activeTab,
    inputMode,
    selectedFiles,
    fileInfos,
    textInput,
    password,
    addResult,
    updateResult,
    clearInput,
    processOneFile,
    t,
  ])

  const isProcessDisabled =
    (inputMode === InputModeEnum.FILE && selectedFiles.length === 0) ||
    (inputMode === InputModeEnum.MESSAGE && !textInput.trim()) ||
    !password

  return {
    password,
    setPassword,
    selectedFiles,
    fileInfos,
    textInput,
    setTextInput: handleTextInputChange,
    inputMode,
    setInputMode,
    activeTab,
    handleTabChange,
    fileInputRef,
    handleFileSelect,
    removeFile,
    processInput,
    handleDownloadResult,
    processResults,
    removeResult,
    isProcessDisabled,
  }
}
