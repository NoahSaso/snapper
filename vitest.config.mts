import { ViteUserConfig, defineConfig } from 'vitest/config'

export const vitestConfig: Required<
  Pick<
    Required<ViteUserConfig>['test'],
    'testTimeout' | 'hookTimeout' | 'watch' | 'hideSkippedTests'
  >
> = {
  watch: false,
  hideSkippedTests: true,
  // 1 hour timeout for tests.
  testTimeout: 3_600_000,
  hookTimeout: 3_600_000,
}

export default defineConfig({
  test: vitestConfig,
})
