# Import Updates

This document explains the changes made to imports throughout the codebase to use the new centralized types and singleton services.

## Overview

We've updated all imports to use:

1. The centralized type system from `@/lib/types`
2. The singleton services from `@/lib/binance`
3. The error handling utilities from `@/lib/error-handling`

## Benefits

These changes provide several benefits:

1. **Consistency**: All imports now follow a consistent pattern
2. **Type Safety**: All types are now properly imported from a single source
3. **Maintainability**: Changes to types or services only need to be made in one place
4. **Discoverability**: It's easier to find and understand the available types and services

## Examples

### Before

\`\`\`typescript
import { OrderSide, OrderType } from "@/lib/binance/binance-types"
import { binanceApiService } from "@/lib/binance/binance-api-service"
\`\`\`

### After

\`\`\`typescript
import { OrderSide, OrderType } from "@/lib/types"
import { binanceApiService } from "@/lib/binance"
\`\`\`

## Files Updated

We've updated imports in the following files:

1. WebSocket client
2. Market data service
3. Enhanced market data service
4. Trading service
5. UI components
6. Hooks
7. Utility functions

## Next Steps

If you're adding new files to the codebase, make sure to:

1. Import types from `@/lib/types`
2. Import services from `@/lib/binance`
3. Import error handling utilities from `@/lib/error-handling`
