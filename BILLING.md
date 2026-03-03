# Clerk Billing Integration Guide

This document explains the Clerk Billing implementation for BookOnam and how to use or extend it.

## Overview

The app uses Clerk's Billing system to manage subscription plans with three tiers:
- **Free**: 1 book, 5 sessions/month, 5 min/session, no history
- **Standard**: 10 books, 100 sessions/month, 15 min/session, with history
- **Pro**: 100 books, unlimited sessions, 60 min/session, priority support

## Architecture

### Plan Configuration
- Plans are configured in the Clerk Dashboard with slugs: `"standard"` and `"pro"`
- Users without an active subscription are on the Free tier
- Plan limits are defined in `lib/subscription.constants.ts`

```typescript
// Plan slugs as configured in Clerk Dashboard
export const PLAN_SLUGS = {
    [PlanType.STANDARD]: 'standard',
    [PlanType.PRO]: 'pro',
};

// Limits for each plan
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    [PlanType.FREE]: { maxBooks: 1, maxSessionsPerMonth: 5, ... },
    [PlanType.STANDARD]: { maxBooks: 10, maxSessionsPerMonth: 100, ... },
    [PlanType.PRO]: { maxBooks: 100, maxSessionsPerMonth: -1, ... },
};
```

## File Structure

### Core Files
- **`lib/subscription.constants.ts`** - Plan definitions and limits
- **`lib/billing.utils.ts`** - Server-side utilities for checking plans
- **`lib/billing.hooks.ts`** - Client-side React hooks for UI components
- **`app/(root)/subscriptions/page.tsx`** - Pricing page with PricingTable component

### Modified Files
- **`lib/actions/book.actions.ts`** - Added plan enforcement for book creation
- **`lib/actions/session.actions.ts`** - Added plan enforcement for voice sessions
- **`types.d.ts`** - Added billing-related types
- **`app/globals.css`** - Added pricing page and Clerk PricingTable styling

## Server-Side Usage

### Checking User's Plan

```typescript
import { getUserPlan, getPlanLimits } from '@/lib/billing.utils';

// Get user's current plan
const plan = await getUserPlan(); // Returns: 'free' | 'standard' | 'pro'

// Get plan limits
const limits = await getPlanLimits();
```

### Enforcing Book Creation Limits

```typescript
import { canCreateBook } from '@/lib/billing.utils';

// In server action
const userBookCount = await Book.countDocuments({ clerkId });
const { allowed, reason } = await canCreateBook(userBookCount);

if (!allowed) {
    return { success: false, message: reason, billingError: true };
}
```

### Enforcing Session Limits

```typescript
import { canStartSession, getMaxSessionDuration, getCurrentBillingPeriodStart } from '@/lib/billing.utils';

// Check monthly session limit
const monthlyCount = await VoiceSession.countDocuments({
    clerkId,
    billingPeriodStart: getCurrentBillingPeriodStart(),
});

const { allowed, reason } = await canStartSession(monthlyCount);

// Get max duration for this session
const maxDurationSeconds = await getMaxSessionDuration();
```

## Client-Side Usage

### React Hooks

```typescript
import { useUserPlan, usePlanLimits, useHasFeature, useNeedsUpgrade } from '@/lib/billing.hooks';

// In a component
const MyComponent = () => {
    const plan = useUserPlan(); // 'free' | 'standard' | 'pro'
    const limits = usePlanLimits(); // PlanLimits object
    
    // Check specific features
    const hasHistory = useHasFeature('session-history');
    const unlimited = useHasFeature('unlimited-sessions');
    
    // Check if upgrade needed
    const needsProUpgrade = useNeedsUpgrade(PlanType.PRO);
    
    return (
        <>
            {needsProUpgrade && <UpgradePrompt />}
        </>
    );
};
```

### PricingTable Component

The pricing page at `/subscriptions` displays the Clerk PricingTable component:

```tsx
import { PricingTable } from '@clerk/nextjs';

export default function SubscriptionsPage() {
    return <PricingTable />;
}
```

## Billing Period Management

Monthly limits reset on the 1st of each month at 00:00:00 UTC.

```typescript
// Get current billing period start (always 1st of month)
const billingStart = getCurrentBillingPeriodStart();

// When creating sessions, store billingPeriodStart
await VoiceSession.create({
    clerkId,
    bookId,
    billingPeriodStart: getCurrentBillingPeriodStart(),
    // ...
});
```

## Dashboard Links

- **Manage Plans**: [Clerk Dashboard - Billing Plans](https://dashboard.clerk.com/~/billing/plans)
- **Monitor Subscriptions**: [Clerk Dashboard - Subscriptions](https://dashboard.clerk.com/~/billing/subscriptions)

## Extension Points

### Adding New Plan Features

1. Update `PLAN_LIMITS` in `subscription.constants.ts`:
```typescript
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    [PlanType.FREE]: {
        // ... existing fields
        newFeature: false, // Add new feature
    },
    // ...
};
```

2. Add check utility in `billing.utils.ts`:
```typescript
export const hasNewFeature = async (): Promise<boolean> => {
    const limits = await getPlanLimits();
    return limits.newFeature;
};
```

3. Add client hook in `billing.hooks.ts`:
```typescript
export const useNewFeature = (): boolean => {
    return useHasFeature('new-feature');
};
```

### Adding New Limit Checks

Create a new server action enforcement in `lib/actions/`:

```typescript
import { getPlanLimits } from '@/lib/billing.utils';

export const canUseFeature = async (): Promise<{ allowed: boolean; reason?: string }> => {
    const limits = await getPlanLimits();
    
    if (!limits.newFeature) {
        return {
            allowed: false,
            reason: `This feature requires an upgraded plan`,
        };
    }
    
    return { allowed: true };
};
```

## Error Handling

All billing utilities handle errors gracefully and fail conservatively:

```typescript
try {
    const plan = await getUserPlan();
} catch (error) {
    console.error('Billing error:', error);
    return PlanType.FREE; // Default to free tier
}
```

Responses include `billingError` flag for UI handling:

```typescript
if (response.billingError) {
    // Show upgrade prompt or billing-specific error message
    showUpgradePrompt(response.message);
} else if (!response.success) {
    // Show general error
    showError(response.message);
}
```

## Testing Plan Limits

### Local Development
1. Use Clerk's test mode
2. Manually set `privateMetadata.subscription` in Clerk Dashboard for test users
3. Query database to test limits

### Production
- Monitor subscription changes in Clerk Dashboard
- Set up webhooks to sync subscription changes
- Test with actual Stripe integration

## Important Notes

1. **Billing periods are calendar months** - The 1st of each month resets counters
2. **Free tier has no subscription** - Users without active subscriptions get Free plan
3. **Synchronous checks** - All plan checks are synchronous and happen on the server
4. **Graceful degradation** - If billing checks fail, the app defaults to Free tier to prevent data loss

## Future Enhancements

- [ ] Add billing webhooks for real-time subscription updates
- [ ] Implement soft limits with warnings before hard limits
- [ ] Add usage analytics dashboard
- [ ] Support for custom plans per company
- [ ] Add downgrade/upgrade prorations handling
- [ ] Implement grace period for expired subscriptions
