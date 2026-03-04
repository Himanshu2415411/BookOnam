import { z } from 'zod';
import { 
  MAX_FILE_SIZE, 
  ACCEPTED_PDF_TYPES, 
  MAX_IMAGE_SIZE, 
  ACCEPTED_IMAGE_TYPES 
} from './constants';

// Voice type
export const VoiceEnum = z.enum(['dave', 'daniel', 'chris', 'rachel', 'sarah']);
export type VoiceType = z.infer<typeof VoiceEnum>;

// File validation helpers (must be within the schema context)
const pdfFileSchema = z
  .instanceof(File, { message: 'PDF file is required' })
  .refine((file) => file.size <= MAX_FILE_SIZE, 'PDF file must be less than 50MB')
  .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), 'Only PDF files are allowed');

const coverImageSchema = z
  .instanceof(File)
  .optional()
  .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, 'Cover image must be less than 10MB')
  .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only JPEG, PNG, and WebP images are allowed');

// Upload form schema
export const UploadSchema = z.object({
  pdfFile: pdfFileSchema,
  coverImage: coverImageSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  author: z.string().min(1, 'Author is required').max(100, 'Author must be less than 100 characters'),
  voice: VoiceEnum.optional(),
});

export type UploadFormValues = z.infer<typeof UploadSchema>;
