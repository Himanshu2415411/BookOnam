'use server';

import VoiceSession from "@/database/models/voiceSession.model";
import { connectToDatabase } from "@/database/mongoose";
import {StartSessionResult, EndSessionResult} from "@/types";
import { getCurrentBillingPeriodStart } from "@/lib/subscription.constants";




export const startVoiceSession = async (clerkId: string, bookId:string): Promise<StartSessionResult> => {
    try{
        // Ensure user is authenticated
        await connectToDatabase();

        const session = await VoiceSession.create({
            clerkId,
            bookId, 
            startedAt: new Date(),
            billingPeriodStart: getCurrentBillingPeriodStart(),
            durationSeconds: 0,
        });
        return {
            success: true,
            sessionId: session._id.toString(),
            // maxDurationMinutes: limits.maxSessionMinutes
        }
    }catch(error) {
        console.error("Error starting voice session:", error);
        return {
            success: false,
            error: "Failed to start voice session"
        }
    }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {
    try {
        await connectToDatabase();

        const session = await VoiceSession.findById(sessionId);
        
        if (!session) {
            return {
                success: false,
                error: "Session not found"
            };
        }

        session.endedAt = new Date();
        session.durationSeconds = durationSeconds;

        await session.save();

        return {
            success: true
        };
    } catch (error) {
        console.error("Error ending voice session:", error);
        return {
            success: false,
            error: "Failed to end voice session"
        };
    }
}
