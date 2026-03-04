'use server';

import VoiceSession from "@/database/models/voiceSession.model";
import { connectToDatabase } from "@/database/mongoose";
import {StartSessionResult, EndSessionResult} from "@/types";
import { getCurrentBillingPeriodStart, PLAN_LIMITS, PlanType } from "@/lib/subscription.constants";
import { canStartSession, getMaxSessionDuration } from "@/lib/billing.utils";




export const startVoiceSession = async (clerkId: string, bookId:string): Promise<StartSessionResult> => {
    try{
        // Ensure user is authenticated
        await connectToDatabase();

        // Count sessions started this billing month for the user
        const billingPeriodStart = getCurrentBillingPeriodStart();
        const monthlySessionCount = await VoiceSession.countDocuments({
            clerkId,
            billingPeriodStart,
        });

        // Check if user can start a session based on their plan
        const { allowed, reason } = await canStartSession(monthlySessionCount);
        if (!allowed) {
            return {
                success: false,
                error: reason || 'You have reached your session limit for this month',
                isBillingError: true,
            };
        }

        // Get max duration for user's plan
        const maxDurationSeconds = await getMaxSessionDuration();

        const session = await VoiceSession.create({
            clerkId,
            bookId, 
            startedAt: new Date(),
            billingPeriodStart,
            durationSeconds: 0,
        });
        return {
            success: true,
            sessionId: session._id.toString(),
            maxDurationMinutes: maxDurationSeconds / 60,
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

/**
 * Server action to get max session duration based on user's plan
 * This is called from the client and must be a server action to access Clerk auth
 */
export const getMaxSessionDurationAction = async (): Promise<number> => {
    try {
        const maxDurationSeconds = await getMaxSessionDuration();
        return maxDurationSeconds;
    } catch (error) {
        console.error("Error getting max session duration:", error);
        // Default to free tier (5 minutes)
        return PLAN_LIMITS[PlanType.FREE].maxSessionDurationMinutes * 60;
    }
}
