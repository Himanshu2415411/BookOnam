declare module 'pdfjs-dist/legacy/build/pdf.min.mjs' {
    export const getDocument: (source: ArrayBuffer | Uint8Array | { data: ArrayBuffer | Uint8Array }) => {
        promise: Promise<PDFDocumentProxy>;
    };
    export const GlobalWorkerOptions: {
        workerSrc: string;
    };

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
}
