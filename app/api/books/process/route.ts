import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose, { ClientSession } from "mongoose";
import { put } from "@vercel/blob";
import sharp from "sharp";
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

// Helper function to generate a cover image with book title
async function generateCoverImage(title: string, author: string): Promise<Buffer | null> {
    try {
        console.log("📸 Generating auto cover image for:", title);
        
        // Create SVG with book title and author
        const svgImage = `
            <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
                <!-- Gradient background -->
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#3d485e;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#212a3b;stop-opacity:1" />
                    </linearGradient>
                </defs>
                
                <!-- Background -->
                <rect width="300" height="400" fill="url(#grad)"/>
                
                <!-- Decorative elements -->
                <circle cx="150" cy="100" r="40" fill="#f97316" opacity="0.3"/>
                <circle cx="50" cy="300" r="60" fill="#0ea5e9" opacity="0.2"/>
                
                <!-- Title -->
                <text 
                    x="150" 
                    y="180" 
                    font-size="28" 
                    font-weight="bold" 
                    text-anchor="middle" 
                    fill="white"
                    font-family="Arial, sans-serif"
                    word-spacing="100%"
                >
                    <tspan x="150" dy="0">${title.substring(0, 20)}</tspan>
                    ${title.length > 20 ? `<tspan x="150" dy="35">${title.substring(20, 40)}</tspan>` : ''}
                </text>
                
                <!-- Author -->
                <text 
                    x="150" 
                    y="320" 
                    font-size="16" 
                    text-anchor="middle" 
                    fill="#e0e7ff"
                    font-family="Arial, sans-serif"
                    font-style="italic"
                >
                    by ${author.substring(0, 30)}
                </text>
            </svg>
        `;
        
        // Convert SVG to PNG using sharp
        const coverBuffer = await sharp(Buffer.from(svgImage))
            .png()
            .toBuffer();
        
        console.log("✅ Cover image generated:", coverBuffer.length, "bytes");
        return coverBuffer;
    } catch (error) {
        console.error("❌ Error generating cover image:", error);
        return null;
    }
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
        
        // Process cover image: use provided or generate automatic
        let coverImageBuffer: Buffer | null = null;
        let coverImageName = "";
        
        try {
            if (coverImage) {
                // User provided cover image
                console.log("📸 Using user-provided cover image:", {
                    name: coverImage.name,
                    size: coverImage.size,
                    type: coverImage.type
                });
                
                const coverArrayBuffer = await coverImage.arrayBuffer();
                coverImageBuffer = Buffer.from(coverArrayBuffer);
                coverImageName = `${slug}-${Date.now()}-cover`;
            } else {
                // Generate automatic cover image from title and author
                console.log("🎨 Generating automatic cover image...");
                coverImageBuffer = await generateCoverImage(title, author);
                coverImageName = `${slug}-${Date.now()}-auto-cover`;
            }
            
            // Upload cover image to Vercel Blob
            if (coverImageBuffer && coverImageBuffer.length > 0) {
                console.log("✓ Cover buffer ready, size:", coverImageBuffer.length, "bytes");
                
                if (!process.env.BLOB_READ_WRITE_TOKEN) {
                    throw new Error("BLOB_READ_WRITE_TOKEN not configured");
                }
                
                const coverBlob = await put(
                    `covers/${coverImageName}.png`,
                    coverImageBuffer,
                    {
                        access: "public",
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                    }
                );
                
                console.log("📦 Vercel Blob response:", {
                    url: coverBlob?.url,
                    pathname: coverBlob?.pathname,
                });
                
                if (coverBlob?.url) {
                    coverURL = coverBlob.url;
                    coverBlobKey = coverBlob.pathname;
                    console.log("✅ Cover image uploaded successfully!");
                    console.log("   URL:", coverURL);
                } else {
                    console.error("⚠️ Blob response missing URL");
                }
            } else {
                console.warn("⚠️ No cover image available for upload");
            }
        } catch (coverError: any) {
            console.error("❌ Error processing/uploading cover image:", {
                message: coverError?.message,
                code: coverError?.code,
            });
            // Continue without cover image, don't fail the book creation
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
