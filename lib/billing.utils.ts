/**
 * Server-side billing utilities for checking user subscription plans
 * Uses Clerk's auth and user object to determine plan type and enforce limits
 */

import { currentUser, auth } from "@clerk/nextjs/server";
import { PlanType, PLAN_LIMITS, PLAN_SLUGS } from "@/lib/subscription.constants";

/**
 * Determine user's plan type based on their Clerk subscription
 * Returns FREE if user has no active subscription
 */
export const getUserPlan = async (): Promise<PlanType> => {
    try {
        const { userId } = await auth();
        if (!userId) {
            return PlanType.FREE;
        }

        const user = await currentUser();
        if (!user) {
            return PlanType.FREE;
        }

        // Check subscription using the has() method
        // This checks if user has an active subscription for the given plan slug
        if (user.privateMetadata?.subscription && typeof user.privateMetadata.subscription === 'string') {
            const subscription = user.privateMetadata.subscription;
            
            if (subscription === PLAN_SLUGS[PlanType.PRO]) {
                return PlanType.PRO;
            } else if (subscription === PLAN_SLUGS[PlanType.STANDARD]) {
                return PlanType.STANDARD;
            }
        }

        // No other fallback available - check privateMetadata above
        return PlanType.FREE;
    } catch (error) {
        console.error('Error getting user plan:', error);
        return PlanType.FREE;
    }
};

/**
 * Get the limits for a specific plan or the user's current plan
 */
export const getPlanLimits = async (planType?: PlanType) => {
    const plan = planType || (await getUserPlan());
    return PLAN_LIMITS[plan];
};

/**
 * Check if user can create a new book based on their plan limits
 * @param userBookCount - Current number of books the user owns
 */
export const canCreateBook = async (userBookCount: number): Promise<{ allowed: boolean; reason?: string }> => {
    try {
        const plan = await getUserPlan();
        const limits = PLAN_LIMITS[plan];

        if (userBookCount >= limits.maxBooks) {
            return {
                allowed: false,
                reason: `You've reached the maximum of ${limits.maxBooks} books on the ${limits.name} plan. Upgrade to add more.`
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking book creation permission:', error);
        // Be conservative - fail open to prevent bugs
        return { allowed: false, reason: 'Could not verify subscription status' };
    }
};

/**
 * Check if user can start a new voice session based on their plan limits
 * @param monthlySessionCount - Number of sessions started this billing month
 */
export const canStartSession = async (monthlySessionCount: number): Promise<{ allowed: boolean; reason?: string }> => {
    try {
        const plan = await getUserPlan();
        const limits = PLAN_LIMITS[plan];

        // Check monthly session limit (unlimited = -1)
        if (limits.maxSessionsPerMonth !== -1 && monthlySessionCount >= limits.maxSessionsPerMonth) {
            return {
                allowed: false,
                reason: `You've reached your monthly session limit of ${limits.maxSessionsPerMonth} on the ${limits.name} plan. Upgrade for more.`
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking session permission:', error);
        return { allowed: false, reason: 'Could not verify subscription status' };
    }
};

/**
 * Check session duration limit for user's plan
 */
export const getMaxSessionDuration = async (): Promise<number> => {
    try {
        const limits = await getPlanLimits();
        return limits.maxSessionDurationMinutes * 60; // Return in seconds
    } catch (error) {
        console.error('Error getting max session duration:', error);
        return PLAN_LIMITS[PlanType.FREE].maxSessionDurationMinutes * 60;
    }
};

/**
 * Check if user has access to session history feature
 */
export const hasSessionHistory = async (): Promise<boolean> => {
    try {
        const limits = await getPlanLimits();
        return limits.hasSessionHistory;
    } catch (error) {
        console.error('Error checking session history access:', error);
        return false;
    }
};
