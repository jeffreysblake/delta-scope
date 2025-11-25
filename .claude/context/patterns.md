# Code Patterns

Common patterns used throughout delta-scope. Follow these for consistency.

## Service Pattern

Services are singletons with factory functions:

```typescript
// services/example.ts
interface ExampleService {
  doThing(input: string): Promise<Result>;
}

let instance: ExampleService | null = null;

export function getExampleService(): ExampleService {
  if (!instance) {
    instance = createExampleService();
  }
  return instance;
}

export function closeExampleService(): void {
  if (instance) {
    instance.cleanup?.();
    instance = null;
  }
}

function createExampleService(): ExampleService {
  return {
    doThing: async (input) => {
      // implementation
    }
  };
}
```

## Component Pattern

Ink components with keyboard handling:

```typescript
// components/Example.tsx
import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  data: SomeType[];
}

export function Example({ onClose, data }: Props): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(i + 1, data.length - 1));
    }
    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
  });

  return (
    <Box flexDirection="column">
      {data.map((item, i) => (
        <Text key={item.id} inverse={i === selectedIndex}>
          {item.name}
        </Text>
      ))}
    </Box>
  );
}
```

## Test Pattern

Vitest with proper mocking for ESM:

```typescript
// services/__tests__/example.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing module under test
vi.mock('../dependency.js', () => ({
  getDependency: vi.fn(() => ({
    method: vi.fn(),
  })),
}));

// Import AFTER mocks are set up
import { getExampleService } from '../example.js';
import { getDependency } from '../dependency.js';

describe('ExampleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do thing', async () => {
    // Arrange
    vi.mocked(getDependency().method).mockResolvedValue('result');

    // Act
    const service = getExampleService();
    const result = await service.doThing('input');

    // Assert
    expect(result).toBe('expected');
    expect(getDependency().method).toHaveBeenCalledWith('input');
  });
});
```

## Async Data Loading Pattern

```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const loadData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await fetchData();
    setData(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  loadData();
}, [loadData]);
```

## Type Definitions

Centralize in `types/index.ts`:

```typescript
// types/index.ts
export interface GitRepo {
  path: string;
  name: string;
  branch: string;
  status: 'clean' | 'uncommitted' | 'unpushed';
  // ... other fields
}

export interface AppConfig {
  basePaths: string[];
  excludePatterns: string[];
  // ... other fields
}
```

## Import Conventions

```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';
import { join } from 'path';

// 2. External packages
import React from 'react';
import { Box, Text } from 'ink';

// 3. Internal modules (with .js extension)
import { scanForRepos } from '../services/gitScanner.js';
import type { GitRepo } from '../types/index.js';
```
