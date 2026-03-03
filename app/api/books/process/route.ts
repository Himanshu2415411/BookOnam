import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose, { ClientSession } from "mongoose";
import { put } from "@vercel/blob";
import { connectToDatabase } from "@/database/mongoose";
import { generateSlug, serializeData } from "@/lib/utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/bookSegment.model";
import { TextSegment, IBook, PDFTextItem } from "@/types";

// Helper function to split text into segments with page numbers
function splitIntoSegments(
    textByPage: Map<number, string>,
    segmentSize: number = 500,
    overlapSize: number = 50
): TextSegment[] {
    const segments: TextSegment[] = [];
    let globalSegmentIndex = 0;

    // Process each page
    const sortedPages = Array.from(textByPage.keys()).sort((a, b) => a - b);
    
    for (const pageNum of sortedPages) {
        const pageText = textByPage.get(pageNum) || "";
        const words = pageText.split(/\s+/).filter((word) => word.length > 0);
        
        let startIndex = 0;
        
        while (startIndex < words.length) {
            const endIndex = Math.min(startIndex + segmentSize, words.length);
            const segmentWords = words.slice(startIndex, endIndex);
            const segmentText = segmentWords.join(" ");

            segments.push({
                text: segmentText,
                segmentIndex: globalSegmentIndex,
                pageNumber: pageNum,
                wordCount: segmentWords.length,
            });

            globalSegmentIndex++;

            if (endIndex >= words.length) break;
            startIndex = endIndex - overlapSize;
        }
    }

    return segments;
}

// Helper function to parse PDF on the server (extract text with page numbers)
async function parsePDFFile(buffer: ArrayBuffer): Promise<{ 
    content: TextSegment[];
    totalPages: number;
    totalWords: number;
}> {
    // Use legacy build for Node.js environment (avoids DOMMatrix reference error)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
    
    // Set worker source to legacy build
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url,
    ).toString();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdfDocument = await loadingTask.promise;

    // Check if PDF is encrypted (password protected)
    if (pdfDocument.isEncrypted) {
        await pdfDocument.destroy();
        throw new Error("PDF is password protected");
    }

    const textByPage = new Map<number, string>();
    let totalWords = 0;

    // Extract text from all pages with page numbers
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as Array<any>)
                .filter((item: any) => "str" in item && typeof (item as { str: unknown }).str === "string")
                .map((item: any) => (item as { str: string }).str)
                .join(" ");
            
            // Count words on this page
            const words = pageText.split(/\s+/).filter((word: string) => word.length > 0);
            totalWords += words.length;
            
            textByPage.set(pageNum, pageText);
        } catch (pageError) {
            console.error(`Error extracting text from page ${pageNum}:`, pageError);
            // Continue with other pages even if one fails
        }
    }

    // Clean up
    await pdfDocument.destroy();

    if (textByPage.size === 0) {
        throw new Error("No text could be extracted from the PDF. The file may be scanned or corrupted.");
    }

    const content = splitIntoSegments(textByPage);

    if (content.length === 0) {
        throw new Error("PDF contains no readable text content");
    }

    return {
        content,
        totalPages: pdfDocument.numPages,
        totalWords,
    };
}

export async function POST(request: Request) {
    let dbSession: ClientSession | null = null;
    
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse multipart form data
        const formData = await request.formData();
        
        const pdfFile = formData.get("pdfFile") as File;
        const coverImage = formData.get("coverImage") as File | null;
        const title = formData.get("title") as string;
        const author = formData.get("author") as string;
        const voice = formData.get("voice") as string | null;

        if (!pdfFile || !title || !author) {
            return NextResponse.json(
                { error: "Missing required fields: pdfFile, title, and author are required" },
                { status: 400 }
            );
        }

        // Validate file type
        if (pdfFile.type !== 'application/pdf') {
            return NextResponse.json(
                { error: "Invalid file type. Only PDF files are accepted" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Generate slug
        const slug = generateSlug(title);

        // Check if book already exists FOR THIS USER
        // This prevents users from uploading the same book twice, but allows different users to have books with the same slug
        const existingBook = await Book.findOne({ slug, clerkId: userId }).lean();
        if (existingBook) {
            return NextResponse.json({
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            });
        }

        // Read PDF file as buffer
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Parse PDF on server
        let pdfParseResult: { 
            content: TextSegment[];
            totalPages: number;
            totalWords: number;
        };
        
        try {
            pdfParseResult = await parsePDFFile(arrayBuffer);
        } catch (pdfError: unknown) {
            console.error("Error parsing PDF:", pdfError);
            const errorMessage = pdfError instanceof Error ? pdfError.message : "Unknown error";
            
            if (errorMessage.includes("password protected") || errorMessage.includes("encrypted")) {
                return NextResponse.json(
                    { error: "This PDF is password protected. Please remove the password and try again." },
                    { status: 400 }
                );
            }
            
            if (errorMessage.includes("No readable text") || errorMessage.includes("scanned or corrupted")) {
                return NextResponse.json(
                    { error: "Could not extract text from this PDF. It may be a scanned image or corrupted file." },
                    { status: 400 }
                );
            }
            
            return NextResponse.json(
                { error: "Failed to parse PDF file. Please ensure it's a valid PDF with selectable text." },
                { status: 500 }
            );
        }

        // Start a MongoDB transaction for atomic operations
        const mongoConn = mongoose.connection;
        dbSession = await mongoConn.startSession();
        
        let book: any = null;
        let coverURL = "";
        let coverBlobKey = "";
        
        // Upload cover image if provided
        if (coverImage) {
            try {
                console.log("📸 Starting cover image upload:", {
                    name: coverImage.name,
                    size: coverImage.size,
                    type: coverImage.type
                });
                
                // Convert File to Buffer/Uint8Array
                const coverBuffer = await coverImage.arrayBuffer();
                console.log("✓ Cover buffer created, size:", coverBuffer.byteLength, "bytes");
                
                // Check if token exists
                if (!process.env.BLOB_READ_WRITE_TOKEN) {
                    throw new Error("BLOB_READ_WRITE_TOKEN not configured");
                }
                console.log("✓ Blob token found");
                
                // Upload to Vercel Blob
                const coverBlob = await put(
                    `covers/${slug}-${Date.now()}.${coverImage.type.split('/')[1] || 'png'}`,
                    new Blob([coverBuffer], { type: coverImage.type }),
                    {
                        access: "public",
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                    }
                );
                
                console.log("📦 Vercel Blob response:", {
                    url: coverBlob?.url,
                    pathname: coverBlob?.pathname,
                    contentType: coverBlob?.contentType,
                });
                
                if (coverBlob?.url) {
                    coverURL = coverBlob.url;
                    coverBlobKey = coverBlob.pathname;
                    console.log("✅ Cover image uploaded successfully!");
                    console.log("   URL:", coverURL);
                    console.log("   Pathname:", coverBlobKey);
                } else {
                    console.error("⚠️ Blob response missing URL:", coverBlob);
                }
            } catch (coverError: any) {
                console.error("❌ Error uploading cover image:", {
                    message: coverError?.message,
                    code: coverError?.code,
                    stack: coverError?.stack,
                    error: coverError
                });
                // Continue without cover image, don't fail the book creation
            }
        } else {
            console.log("ℹ️ No cover image provided");
        }
        
        await (dbSession as ClientSession).withTransaction(async () => {
            // Create book first
            book = await Book.create([{
                clerkId: userId,
                title,
                author,
                slug,
                persona: voice || undefined,
                fileURL: "", // Will be updated after blob upload
                fileBlobKey: "",
                coverURL: coverURL, // Cover uploaded
                coverBlobKey: coverBlobKey, // Store blob key for deletion if needed
                fileSize: pdfFile.size,
                totalSegments: 0,
            }], { session: dbSession });

            book = book[0];

            // Save segments with page numbers
            if (pdfParseResult.content && pdfParseResult.content.length > 0) {
                const segmentsToInsert = pdfParseResult.content.map(
                    ({ text, segmentIndex, pageNumber, wordCount }: TextSegment): any => ({
                        clerkId: userId,
                        bookId: book._id,
                        content: text,
                        segmentIndex,
                        pageNumber,
                        wordCount,
                    })
                );

                await BookSegment.insertMany(segmentsToInsert, { session: dbSession as ClientSession });

                // Update total segments in book
                await Book.findByIdAndUpdate(book._id, { 
                    totalSegments: pdfParseResult.content.length 
                }, { session: dbSession as ClientSession });
            } else {
                throw new Error("No segments created from PDF content");
            }
        });

        // End the session
        (dbSession as ClientSession).endSession();

        if (!book) {
            throw new Error("Failed to create book");
        }

        return NextResponse.json({
            success: true,
            data: serializeData(book),
            alreadyExists: false,
            segmentsCount: pdfParseResult.content.length,
            totalPages: pdfParseResult.totalPages,
            totalWords: pdfParseResult.totalWords,
        });

    } catch (error) {
        console.error("Error processing book:", error);
        
        // End session if it exists
        if (dbSession) {
            try {
                await (dbSession as ClientSession).endSession();
            } catch (sessionError) {
                console.error("Error ending session:", sessionError);
            }
        }
        
        // Don't expose internal errors to client
        return NextResponse.json(
            { error: "Failed to process book. Please try again." },
            { status: 500 }
        );
    }
}
