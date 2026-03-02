import { NextResponse } from "next/server";
import {auth} from "@clerk/nextjs/server";
import {handleUpload, HandleUploadBody} from "@vercel/blob/client";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { json } from "zod";

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;
    try{
        const jsonResponse = await handleUpload({body, 
            request, 
            token: process.env.BLOB_READ_WRITE_TOKEN,
            onBeforeGenerateToken: async() => 
            {
                const {userId} =  await auth();
                if (!userId) {
                    throw new Error("Unauthorized");
                }
                return{
                    allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
                    addRandomSuffix: true,
                    maxFileSize: MAX_FILE_SIZE,
                    tokenPayload: JSON.stringify({userId}),
                }
            },
            onUploadCompleted: async ({blob, tokenPayload}) => {
                console.log("Upload completed:", blob.url);
                // You can perform additional actions here, such as saving blob info to your database
                // Remember to parse tokenPayload if you need user information
                const payload = tokenPayload ? JSON.parse(tokenPayload) : null;
                const userId = payload?.userId;
            }
    });
        return NextResponse.json(jsonResponse);
    } catch (error) {
        console.error("Error handling upload:", error);
        const status = (error as any)?.message?.includes("Unauthorized") ? 401 : 500;
        return NextResponse.json({error: "Failed to handle upload"}, {status});
    }
}