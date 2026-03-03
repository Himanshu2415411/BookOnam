'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, Image, X, Loader2 } from 'lucide-react'
import { 
  MAX_FILE_SIZE, 
  ACCEPTED_PDF_TYPES, 
  MAX_IMAGE_SIZE, 
  ACCEPTED_IMAGE_TYPES,
  voiceOptions,
  voiceCategories
} from '@/lib/constants'

// Voice type
type VoiceType = 'dave' | 'daniel' | 'chris' | 'rachel' | 'sarah'

// Zod validation schema - using file validation function for better compatibility
const bookFormSchema = z.object({
  pdfFile: z.custom<File>((val) => val instanceof File, 'PDF file is required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'PDF file must be less than 50MB')
    .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), 'Only PDF files are allowed'),
  coverImage: z.custom<File>((val) => val instanceof File)
    .optional()
    .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, 'Cover image must be less than 10MB')
    .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only JPEG, PNG, and WebP images are allowed'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  author: z.string().min(1, 'Author is required').max(100, 'Author must be less than 100 characters'),
  voice: z.enum(['dave', 'daniel', 'chris', 'rachel', 'sarah'], {
    message: 'Please select a voice'
  })
})

type BookFormData = z.infer<typeof bookFormSchema>

interface UploadFormProps {
  onSubmit?: (data: BookFormData) => Promise<void>
}

export default function UploadForm({ onSubmit }: UploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      pdfFile: undefined as unknown as File,
      coverImage: undefined as unknown as File,
      title: '',
      author: '',
      voice: undefined as unknown as VoiceType
    }
  })

  const selectedVoice = watch('voice')

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPdfPreview(file)
      setValue('pdfFile', file, { shouldValidate: true })
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverPreview(file)
      setValue('coverImage', file, { shouldValidate: true })
    }
  }

  const removePdf = () => {
    setPdfPreview(null)
    setValue('pdfFile', undefined as unknown as File, { shouldValidate: true })
  }

  const removeCover = () => {
    setCoverPreview(null)
    setValue('coverImage', undefined as unknown as File, { shouldValidate: true })
  }

  const handleFormSubmit = async (data: BookFormData) => {
    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(data)
      } else {
        // Default submission logic - console log for demo
        console.log('Form submitted:', data)
        await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate submission
      }
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
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
              <Loader2 className="loading-animation w-12 h-12 text-[#663820]" />
              <p className="loading-title">Processing your book...</p>
              <div className="loading-progress">
                <div className="loading-progress-item">
                  <span className="loading-progress-status"></span>
                  <span className="text-[var(--text-secondary)]">Uploading files</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* PDF File Upload */}
        <div>
          <label className="form-label">PDF File</label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handlePdfChange}
            className="hidden"
            id="pdf-upload"
          />
          {pdfPreview ? (
            <div className="upload-dropzone upload-dropzone-uploaded">
              <div className="flex flex-col items-center">
                <p className="upload-dropzone-text font-medium text-lg text-[#663820]">
                  {pdfPreview.name}
                </p>
                <button
                  type="button"
                  onClick={removePdf}
                  className="upload-dropzone-remove mt-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="pdf-upload"
              className="upload-dropzone border-2 border-dashed border-[var(--border-medium)]"
            >
              <Upload className="upload-dropzone-icon" />
              <p className="upload-dropzone-text">Click to upload PDF</p>
              <p className="upload-dropzone-hint">PDF file (max 50MB)</p>
            </label>
          )}
          {errors.pdfFile && (
            <p className="text-red-500 text-sm mt-2">{errors.pdfFile.message as string}</p>
          )}
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="form-label">Cover Image</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleCoverChange}
            className="hidden"
            id="cover-upload"
          />
          {coverPreview ? (
            <div className="upload-dropzone upload-dropzone-uploaded">
              <div className="flex flex-col items-center">
                <p className="upload-dropzone-text font-medium text-lg text-[#663820]">
                  {coverPreview.name}
                </p>
                <button
                  type="button"
                  onClick={removeCover}
                  className="upload-dropzone-remove mt-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="cover-upload"
              className="upload-dropzone border-2 border-dashed border-[var(--border-medium)]"
            >
              <Image className="upload-dropzone-icon" />
              <p className="upload-dropzone-text">Click to upload cover image</p>
              <p className="upload-dropzone-hint">Leave empty to auto-generate from PDF</p>
            </label>
          )}
          {errors.coverImage && (
            <p className="text-red-500 text-sm mt-2">{errors.coverImage.message as string}</p>
          )}
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor="title" className="form-label">Title</label>
          <input
            {...register('title')}
            type="text"
            id="title"
            placeholder="ex: Rich Dad Poor Dad"
            className="form-input"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-2">{errors.title.message}</p>
          )}
        </div>

        {/* Author Input */}
        <div>
          <label htmlFor="author" className="form-label">Author Name</label>
          <input
            {...register('author')}
            type="text"
            id="author"
            placeholder="ex: Robert Kiyosaki"
            className="form-input"
          />
          {errors.author && (
            <p className="text-red-500 text-sm mt-2">{errors.author.message}</p>
          )}
        </div>

        {/* Voice Selector */}
        <div>
          <label className="form-label">Choose Assistant Voice</label>
          <input
            type="hidden"
            {...register('voice')}
            value={selectedVoice || ''}
          />
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
                        onClick={() => setValue('voice', voiceKey as VoiceType, { shouldValidate: true })}
                        className={`voice-selector-option ${
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
          {errors.voice && (
            <p className="text-red-500 text-sm mt-2">{errors.voice.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="form-btn"
        >
          Begin Synthesis
        </button>
      </form>
    </>
  )
}
