# NoZar E2E Test Suite

This directory contains automated end-to-end tests for the NoZar platform using Playwright. The tests cover critical user flows, authentication, dashboard functionality, chat system, and platform reliability.

## Test Structure

```
e2e/
├── auth.spec.ts          # Authentication flow tests
├── landing.spec.ts        # Landing page tests
├── dashboard.spec.ts      # Dashboard functionality tests
├── chat.spec.ts          # Chat/messaging tests
├── profile.spec.ts       # Profile page tests
├── legal.spec.ts         # Legal page tests
├── screenshots/           # Screenshots taken during tests
└── README.md             # This file
```

## Test Coverage

### P0: Critical MVP Tests (Blocking)
- ✅ Landing page load & core sections
- ✅ Google OAuth authentication flow
- ✅ Dashboard feed & region toggle
- ✅ Asset detail page & edit flow
- ✅ Pings/Chat thread list & messaging
- ✅ Profile page user data
- ✅ Legal pages rendering
- ✅ Authentication guards & access control
- ✅ Trust profiles system

### P1: Important Functionality Tests
- ✅ Landing page performance & core interactions
- ✅ Image upload & display
- ✅ Search & filtering
- ✅ Form validation & error handling
- ✅ Cross-browser compatibility
- ✅ Error recovery & graceful degradation

### P2: Enhancement & Edge Case Tests
- ✅ Advanced chat features
- ✅ Accessibility compliance
- ✅ Performance under load
- ✅ Mobile-specific features
- ✅ Internationalization & localization

## Prerequisites

1. **Node.js**: Ensure you have Node.js v18 or higher
2. **npm**: npm should be installed with Node.js
3. **Playwright**: Test dependencies are included in the project

## Installation

If you haven't installed Playwright browsers yet, run:

```bash
npm install
npx playwright install
```

## Running Tests

### All Tests
Run all tests across all browsers:

```bash
npx playwright test
```

### Specific Test File
Run tests for a specific module:

```bash
npx playwright test auth.spec.ts
npx playwright test dashboard.spec.ts
npx playwright test chat.spec.ts
npx playwright test profile.spec.ts
npx playwright test legal.spec.ts
```

### Specific Browser
Run tests on a specific browser:

```bash
npx playwright test --headed --browser=chromium
npx playwright test --headed --browser=firefox
npx playwright test --headed --browser=webkit
```

### Headless Mode
Run tests without browser UI (default in CI):

```bash
npx playwright test
```

### Headed Mode
Run tests with browser UI visible:

```bash
npx playwright test --headed
```

### Debug Mode
Run tests in debug mode with pause on failure:

```bash
npx playwright test --debug
```

### Watch Mode
Watch for file changes and re-run tests:

```bash
npx playwright test --watch
```

### Specific Test Tags
Run tests with specific tags:

```bash
# Run only P0 critical tests
npx playwright test --grep "P0"

# Run only performance tests
npx playwright test --grep "performance"
```

## Test Results

### HTML Report
Generate a comprehensive HTML report:

```bash
npx playwright show-report
```

### JSON Report
Generate JSON report for CI integration:

```bash
npx playwright test --reporter=json
```

### Trace Viewer
View detailed traces of failed tests:

```bash
npx playwright show-trace
```

## Configuration

### Environment Variables
- `CI=1`: Run in CI mode (retries, headed mode, etc.)
- `PLAYWRIGHT_TEST_BASE_URL`: Override the base URL
- `PLAYWRIGHT_TEST_TIMEOUT`: Override test timeout

### Browser Configuration
The tests run on:
- Desktop: Chrome, Firefox, Safari
- Mobile: Pixel 5 (Chrome), iPhone 12 (Safari)

### Viewport Sizes
- Desktop: 1920x1080
- Mobile: 375x812 (iPhone X/12)

## Test Data

### Authentication Tests
- Tests use Google OAuth
- For CI/CD, you'll need to configure Google test accounts
- Mock authentication can be set up for testing

### Test Environment
- All tests run against the production URL: https://no-zar-r66j.vercel.app
- Tests use clean browser sessions
- Screenshots are captured for debugging

## Continuous Integration

### GitHub Actions
The tests are configured to run in CI via GitHub Actions:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test
```

### CI Best Practices
- Use `--headed` mode for debugging CI failures
- Configure screenshots and traces for failed tests
- Use parallel execution for faster test runs
- Set up proper authentication for CI environment

## Troubleshooting

### Common Issues

1. **Browser Installation**
   ```bash
   npx playwright install
   ```

2. **Stale Screenshots**
   ```bash
   rm -rf e2e/screenshots/
   npx playwright test
   ```

3. **Authentication Issues**
   - Ensure you're logged out before running auth tests
   - Use incognito mode for clean sessions
   - Check Google OAuth configuration

4. **Network Issues**
   - Ensure the production URL is accessible
   - Check for proxy or firewall issues
   - Use `--headed` mode to debug network problems

### Debugging Commands

```bash
# Run a single test with debug mode
npx playwright test --grep "Authentication" --debug

# Show console logs
npx playwright test --grep "Dashboard" --headed

# Generate detailed trace
npx playwright test --trace=on
```

## Contributing

### Adding New Tests
1. Create a new test file following the naming convention: `*.spec.ts`
2. Use the existing test files as templates
3. Follow the test organization:
   - P0 tests (critical)
   - P1 tests (important)
   - P2 tests (enhancement)
4. Add screenshots for visual verification
5. Include error handling and edge cases

### Test Best Practices
- Use descriptive test names that explain what's being tested
- Include both positive and negative test cases
- Use data-testid attributes for reliable element selection
- Take screenshots for visual bugs
- Use proper assertions with meaningful error messages
- Keep tests focused and independent
- Use page.waitForLoadState() for proper timing

### Maintenance
- Update screenshots when UI changes
- Review and update test selectors when DOM changes
- Add new test cases for new features
- Remove obsolete tests
- Keep test dependencies up to date

## Performance Considerations

### Test Execution Time
- Full test suite: ~15-20 minutes
- Individual modules: ~3-5 minutes
- Mobile tests: ~2-3 minutes longer

### Optimization Tips
- Use parallel execution for faster runs
- Group related tests to minimize setup/teardown
- Use page.waitForLoadState() instead of fixed timeouts
- Reuse browser contexts where possible
- Implement proper error handling to avoid flaky tests

## Security Notes

- Never store sensitive credentials in test files
- Use environment variables for authentication
- Avoid testing with real user data in production
- Use test accounts for authentication tests
- Follow security best practices for test data

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review existing test files for patterns
3. Check Playwright documentation
4. Contact the development team

---

**Last Updated:** 2026-04-02  
**Maintained by:** NoZar Development Team  
**Test Environment:** Production (https://no-zar-r66j.vercel.app)