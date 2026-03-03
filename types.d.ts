import { Document, Types, ClientSession } from 'mongoose';
import { ReactNode } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { LucideIcon } from 'lucide-react';
import z from 'zod';
import { UploadSchema } from '@/lib/zod';

// ============================================
// PDFJS MODULE DECLARATIONS
// ============================================

declare module 'pdfjs-dist/legacy/build/pdf.min.mjs' {
    export const getDocument: (source: ArrayBuffer | Uint8Array | { data: ArrayBuffer | Uint8Array }) => {
        promise: Promise<PDFDocumentProxy>;
    };
    export const GlobalWorkerOptions: {
        workerSrc: string;
    };
}

export interface PDFTextItem {
    str: string;
    transform?: number[];
    width?: number;
    height?: number;
    hasEOL?: boolean;
}

export interface PDFTextContent {
    items: PDFTextItem[];
    styles?: Record<string, any>;
}

export interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
    getOperatorList(): Promise<any>;
}

export interface PDFDocumentProxy {
    numPages: number;
    isEncrypted: boolean;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): Promise<void>;
}

// ============================================
// DATABASE MODELS
// ============================================

export interface IBook extends Document {
    _id: string;
    clerkId: string;
    title: string;
    slug: string;
    author: string;
    persona?: string;
    fileURL?: string;
    fileBlobKey?: string;
    coverURL?: string;
    coverBlobKey?: string;
    fileSize?: number;
    totalSegments: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IBookSegment extends Document {
    clerkId: string;
    bookId: Types.ObjectId;
    content: string;
    segmentIndex: number;
    pageNumber?: number;
    wordCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IVoiceSession extends Document {
    _id: string;
    clerkId: string;
    bookId: Types.ObjectId;
    startedAt: Date;
    endedAt?: Date;
    durationSeconds: number;
    billingPeriodStart: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// FORM & INPUT TYPES
// ============================================

export type BookUploadFormValues = z.infer<typeof UploadSchema>;

export interface CreateBook {
    clerkId: string;
    title: string;
    author: string;
    persona?: string;
    fileURL?: string;
    fileBlobKey?: string;
    coverURL?: string;
    coverBlobKey?: string;
    fileSize?: number;
}

export interface TextSegment {
    text: string;
    segmentIndex: number;
    pageNumber?: number;
    wordCount: number;
}

export interface BookCardProps {
    title: string;
    author: string;
    coverURL: string;
    slug: string;
}

export interface Messages {
    role: string;
    content: string;
}

export interface ShadowBoxProps {
    children: ReactNode;
    className?: string;
}

export interface VoiceSelectorProps {
    disabled?: boolean;
    className?: string;
    value?: string;
    onChange: (voiceId: string) => void;
}

export interface InputFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    placeholder?: string;
    disabled?: boolean;
}

export interface FileUploadFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    acceptTypes: string[];
    disabled?: boolean;
    icon: LucideIcon;
    placeholder: string;
    hint: string;
}
export interface StartSessionResult {
    success: boolean;
    sessionId?: string;
    maxDurationMinutes?: number;
    error?: string;
    isBillingError?: boolean;
}

export interface EndSessionResult {
    success: boolean;
    error?: string;
}

// ============================================
// BILLING RESPONSES
// ============================================

export interface CreateBookResponse {
    success: boolean;
    data?: any;
    alreadyExists?: boolean;
    message?: string;
    billingError?: boolean;
}
