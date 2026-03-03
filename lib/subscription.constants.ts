// ============================================
// BILLING PERIOD
// ============================================

export const getCurrentBillingPeriodStart = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // First day of the current month
}

// ============================================
// SUBSCRIPTION PLANS & LIMITS
// ============================================

export enum PlanType {
    FREE = 'free',
    STANDARD = 'standard',
    PRO = 'pro'
}

export interface PlanLimits {
    name: string;
    maxBooks: number;
    maxSessionsPerMonth: number;
    maxSessionDurationMinutes: number;
    hasSessionHistory: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    [PlanType.FREE]: {
        name: 'Free',
        maxBooks: 1,
        maxSessionsPerMonth: 5,
        maxSessionDurationMinutes: 5,
        hasSessionHistory: false,
    },
    [PlanType.STANDARD]: {
        name: 'Standard',
        maxBooks: 10,
        maxSessionsPerMonth: 100,
        maxSessionDurationMinutes: 15,
        hasSessionHistory: true,
    },
    [PlanType.PRO]: {
        name: 'Pro',
        maxBooks: 100,
        maxSessionsPerMonth: -1, // unlimited
        maxSessionDurationMinutes: 60,
        hasSessionHistory: true,
    },
};

// Plan slugs as configured in Clerk Dashboard
export const PLAN_SLUGS = {
    [PlanType.STANDARD]: 'standard',
    [PlanType.PRO]: 'pro',
} as const;