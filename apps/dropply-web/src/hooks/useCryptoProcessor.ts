'use client'

import { detect } from '@cdlab/cipher'
import { StatusEnum } from '@cdlab/ui/IK'
import { downloadFile } from '@cdlab/utils'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { genid } from '@/lib/genid'
import {
  deriveKeyPair,
  isHexString,
  isMnemonicPhrase,
  validateBase58PublicKey,
} from '@/lib/keys'
import { useProcessStore } from '@/store/useProcessStore'
import type { FileInfo, ProcessResult } from '@/types/crypto'
import { InputModeEnum, ModeEnum } from '@/types/crypto'
import type { EncryptionMode } from '@/types/keys'

interface KeyPayload {
  encryptionMode: EncryptionMode
  password?: string
  publicKey?: string
  privateKey?: string
}

export function useCryptoProcessor() {
  const t = useTranslations('toast')
  const [password, setPassword] = useState('')
  const [encryptionMode, setEncryptionMode] =
    useState<EncryptionMode>('password')
  const [keyInput, setKeyInput] = useState('')
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
    let detectedMode: EncryptionMode | null = null
    const newInfos: FileInfo[] = []

    for (const file of newFiles) {
      const { encryptionType } = await detect(file)
      const isEncrypted = encryptionType !== 'unencrypted'
      if (isEncrypted) {
        hasEncrypted = true
        if (!detectedMode) {
          detectedMode = encryptionType === 'pwd' ? 'password' : 'publickey'
        }
      }
      newInfos.push({
        name: file.name,
        size: file.size,
        type: file.type || (isEncrypted ? 'application/encrypted' : 'Unknown'),
      })
    }

    setFileInfos((prev) => [...prev, ...newInfos])
    // The mode is derived from the input: ciphertext → decrypt (with the mode
    // read from its magic bytes), anything else → encrypt. No manual tabs.
    if (hasEncrypted) {
      setActiveTab(ModeEnum.DECRYPT)
      if (detectedMode) setEncryptionMode(detectedMode)
    } else {
      setActiveTab(ModeEnum.ENCRYPT)
    }
  }, [])

  const handleTextInputChange = useCallback(async (value: string) => {
    setTextInput(value)
    const trimmed = value.trim()
    if (trimmed.length >= 3) {
      const { encryptionType } = await detect(trimmed)
      if (encryptionType !== 'unencrypted') {
        setActiveTab(ModeEnum.DECRYPT)
        setEncryptionMode(encryptionType === 'pwd' ? 'password' : 'publickey')
        return
      }
    }
    setActiveTab(ModeEnum.ENCRYPT)
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFileInfos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearInput = useCallback(() => {
    setSelectedFiles([])
    setFileInfos([])
    setTextInput('')
    setActiveTab(ModeEnum.ENCRYPT)
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

  const resolveKeyPayload = useCallback(
    (mode: ModeEnum): KeyPayload => {
      if (encryptionMode === 'password') {
        return { encryptionMode, password }
      }
      const trimmed = keyInput.trim()
      if (mode === ModeEnum.ENCRYPT) {
        if (!validateBase58PublicKey(trimmed).isValid) {
          throw new Error(t('invalidPublicKey'))
        }
        return { encryptionMode, publicKey: trimmed }
      }
      // Decrypt: accept a 64-char hex private key or a mnemonic to derive it.
      if (isHexString(trimmed) && trimmed.length === 64) {
        return { encryptionMode, privateKey: trimmed }
      }
      if (isMnemonicPhrase(keyInput)) {
        return {
          encryptionMode,
          privateKey: deriveKeyPair(keyInput).privateKey,
        }
      }
      throw new Error(t('invalidPrivateKey'))
    },
    [encryptionMode, password, keyInput, t],
  )

  const processOneFile = useCallback(
    (
      file: File,
      taskId: string,
      mode: ModeEnum,
      keyPayload: KeyPayload,
    ): Promise<void> => {
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
              isTextMode: false,
              ...keyPayload,
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
    [updateResult],
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
    if (encryptionMode === 'password' && !password) {
      toast.error(t('enterPassword'))
      return
    }
    if (encryptionMode === 'publickey' && !keyInput.trim()) {
      toast.error(
        mode === ModeEnum.ENCRYPT ? t('enterPublicKey') : t('enterPrivateKey'),
      )
      return
    }
    let keyPayload: KeyPayload
    try {
      keyPayload = resolveKeyPayload(mode)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('invalidKey'))
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
        await processOneFile(filesToProcess[i], taskIds[i], mode, keyPayload)
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
            isTextMode: true,
            ...keyPayload,
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
    encryptionMode,
    keyInput,
    resolveKeyPayload,
    addResult,
    updateResult,
    clearInput,
    processOneFile,
    t,
  ])

  const needsKey = encryptionMode === 'password' ? !password : !keyInput.trim()
  const isProcessDisabled =
    (inputMode === InputModeEnum.FILE && selectedFiles.length === 0) ||
    (inputMode === InputModeEnum.MESSAGE && !textInput.trim()) ||
    needsKey

  return {
    password,
    setPassword,
    encryptionMode,
    setEncryptionMode,
    keyInput,
    setKeyInput,
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
