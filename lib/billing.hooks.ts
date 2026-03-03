/**
 * Client-side billing utilities using React hooks
 * These utilities work in browser-based components
 */

import { useAuth } from "@clerk/nextjs";
import { PlanType, PLAN_LIMITS, PLAN_SLUGS } from "@/lib/subscription.constants";
import { useMemo } from "react";

/**
 * Hook to get the current user's plan type
 * Returns FREE if not authenticated or no subscription
 */
export const useUserPlan = (): PlanType => {
    const { userId, sessionClaims } = useAuth();

    return useMemo(() => {
        if (!userId) {
            return PlanType.FREE;
        }

        // Check subscription claim from Clerk
        const subscriptionSlug = (sessionClaims?.metadata as any)?.subscription;

        if (!subscriptionSlug) {
            return PlanType.FREE;
        }

        if (subscriptionSlug === PLAN_SLUGS[PlanType.PRO]) {
            return PlanType.PRO;
        } else if (subscriptionSlug === PLAN_SLUGS[PlanType.STANDARD]) {
            return PlanType.STANDARD;
        }

        return PlanType.FREE;
    }, [userId, sessionClaims]);
};

/**
 * Hook to get plan limits for the current user
 */
export const usePlanLimits = () => {
    const plan = useUserPlan();
    return useMemo(() => PLAN_LIMITS[plan], [plan]);
};

/**
 * Hook to check if user has a specific feature
 */
export const useHasFeature = (feature: 'session-history' | 'unlimited-sessions' | 'extended-duration'): boolean => {
    const limits = usePlanLimits();

    return useMemo(() => {
        switch (feature) {
            case 'session-history':
                return limits.hasSessionHistory;
            case 'unlimited-sessions':
                return limits.maxSessionsPerMonth === -1;
            case 'extended-duration':
                return limits.maxSessionDurationMinutes >= 15;
            default:
                return false;
        }
    }, [limits]);
};

/**
 * Hook to check if user needs to upgrade for a feature
 */
export const useNeedsUpgrade = (requiredPlan: PlanType): boolean => {
    const currentPlan = useUserPlan();

    const planPriority: Record<PlanType, number> = {
        [PlanType.FREE]: 0,
        [PlanType.STANDARD]: 1,
        [PlanType.PRO]: 2,
    };

    return planPriority[currentPlan] < planPriority[requiredPlan];
};

/**
 * Get upgrade message for a user
 */
export const useUpgradeMessage = (feature: string): string => {
    const limits = usePlanLimits();
    const plan = useUserPlan();

    const upgradePath = plan === PlanType.FREE ? 'Standard' : 'Pro';

    return `Upgrade to ${upgradePath} to access ${feature}`;
};
