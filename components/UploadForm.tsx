'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UploadSchema, type UploadFormValues, type VoiceType } from '@/lib/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'
import { Upload, Image, X, Loader2 } from 'lucide-react'
import { 
  voiceOptions,
  voiceCategories
} from '@/lib/constants'
import { toast } from 'sonner'

interface UploadFormProps {
  onSubmit?: (data: UploadFormValues) => Promise<void>
}

export default function UploadForm({ onSubmit }: UploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const { userId } = useAuth()
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      pdfFile: undefined as unknown as File,
      coverImage: undefined as unknown as File,
      title: '',
      author: '',
      voice: undefined as unknown as VoiceType
    }
  })

  const selectedVoice = form.watch('voice')

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPdfPreview(file)
      form.setValue('pdfFile', file, { shouldValidate: true })
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverPreview(file)
      form.setValue('coverImage', file, { shouldValidate: true })
    }
  }

  const removePdf = () => {
    setPdfPreview(null)
    form.setValue('pdfFile', undefined as unknown as File, { shouldValidate: true })
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
    }
  }

  const removeCover = () => {
    setCoverPreview(null)
    form.setValue('coverImage', undefined as unknown as File, { shouldValidate: true })
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }

  const handleFormSubmit = async (data: UploadFormValues) => {
    if (!userId) {
      toast.error('You must be logged in to upload a book')
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)
    
    try {
      // Create FormData for server-side processing
      const formData = new FormData()
      formData.append('pdfFile', data.pdfFile)
      formData.append('title', data.title)
      formData.append('author', data.author)
      if (data.voice) {
        formData.append('voice', data.voice)
      }
      if (data.coverImage) {
        formData.append('coverImage', data.coverImage)
      }

      // Simulate upload progress
      setUploadProgress(20)
      
      // Send to server-side API route (processes PDF and saves to DB)
      toast.info('Processing your book...')
      const response = await fetch('/api/books/process', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(60)

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to process book')
        return
      }

      setUploadProgress(100)

      if (result.success) {
        toast.success('Book uploaded successfully!')
        
        // Reset form
        form.reset()
        setPdfPreview(null)
        setCoverPreview(null)
        setUploadProgress(0)
        
        if (pdfInputRef.current) pdfInputRef.current.value = ''
        if (coverInputRef.current) coverInputRef.current.value = ''
        
        // Call optional onSubmit callback
        if (onSubmit) {
          await onSubmit(data)
        }
      } else {
        toast.error(result.message || 'Failed to create book')
      }
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('An error occurred while uploading the book')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  const voiceGroups = [
    { label: 'Male Voices', voices: voiceCategories.male },
    { label: 'Female Voices', voices: voiceCategories.female }
  ]

  return (
    <>
      {isSubmitting && (
        <div className="loading-wrapper">
          <div className="loading-shadow-wrapper bg-white">
            <div className="loading-shadow">
              <Loader2 className="loading-animation w-12 h-12 text-[#663820] animate-spin" />
              <p className="loading-title">Processing your book...</p>
              <div className="loading-progress">
                <div className="loading-progress-item">
                  <span className="loading-progress-status" style={{ width: `${uploadProgress}%` }}></span>
                  <span className="text-[var(--text-secondary)]">Processing - {uploadProgress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* PDF File Upload */}
          <FormField
            control={form.control}
            name="pdfFile"
            render={({ field: { onChange, ref: formRef, value, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>PDF File</FormLabel>
                <FormControl>
                  <div>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setPdfPreview(file)
                          onChange(file)
                        }
                      }}
                      ref={(el: HTMLInputElement | null) => {
                        pdfInputRef.current = el
                        formRef?.(el)
                      }}
                      className="hidden"
                      id="pdf-upload"
                      {...fieldProps}
                    />
                    {pdfPreview ? (
                      <div className="upload-dropzone upload-dropzone-uploaded">
                        <div className="flex flex-col items-center">
                          <p className="upload-dropzone-text font-medium text-lg text-[#663820]">
                            {pdfPreview.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              removePdf()
                              onChange(undefined as unknown as File)
                            }}
                            className="upload-dropzone-remove mt-2"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="pdf-upload"
                        className="upload-dropzone border-2 border-dashed border-[var(--border-medium)] cursor-pointer block"
                      >
                        <Upload className="upload-dropzone-icon" />
                        <p className="upload-dropzone-text">Click to upload PDF</p>
                        <p className="upload-dropzone-hint">PDF file (max 50MB)</p>
                      </label>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cover Image Upload */}
          <FormField
            control={form.control}
            name="coverImage"
            render={({ field: { onChange, ref: formRef, value, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>Cover Image</FormLabel>
                <FormControl>
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setCoverPreview(file)
                          onChange(file)
                        }
                      }}
                      ref={(el: HTMLInputElement | null) => {
                        coverInputRef.current = el
                        formRef?.(el)
                      }}
                      className="hidden"
                      id="cover-upload"
                      {...fieldProps}
                    />
                    {coverPreview ? (
                      <div className="upload-dropzone upload-dropzone-uploaded">
                        <div className="flex flex-col items-center">
                          <p className="upload-dropzone-text font-medium text-lg text-[#663820]">
                            {coverPreview.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              removeCover()
                              onChange(undefined as unknown as File)
                            }}
                            className="upload-dropzone-remove mt-2"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="cover-upload"
                        className="upload-dropzone border-2 border-dashed border-[var(--border-medium)] cursor-pointer block"
                      >
                        <Image className="upload-dropzone-icon" />
                        <p className="upload-dropzone-text">Click to upload cover image</p>
                        <p className="upload-dropzone-hint">Leave empty to use default cover</p>
                      </label>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title Input */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    id="title"
                    placeholder="ex: Rich Dad Poor Dad"
                    className="form-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Author Input */}
          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    id="author"
                    placeholder="ex: Robert Kiyosaki"
                    className="form-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Voice Selector */}
          <FormField
            control={form.control}
            name="voice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose Assistant Voice</FormLabel>
                <div className="space-y-4">
                  {voiceGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                        {group.label}
                      </p>
                      <div className="voice-selector-options">
                        {group.voices.map((voiceKey) => {
                          const voice = voiceOptions[voiceKey as keyof typeof voiceOptions]
                          const isSelected = selectedVoice === voiceKey
                          return (
                            <div
                              key={voiceKey}
                              onClick={() => field.onChange(voiceKey)}
                              className={`voice-selector-option cursor-pointer ${
                                isSelected 
                                  ? 'voice-selector-option-selected' 
                                  : 'voice-selector-option-default'
                              }`}
                            >
                              <div className="text-center">
                                <p className="font-medium text-[var(--text-primary)]">{voice.name}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{voice.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="form-btn w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Begin Synthesis'
            )}
          </Button>
        </form>
      </Form>
    </>
  )
}
