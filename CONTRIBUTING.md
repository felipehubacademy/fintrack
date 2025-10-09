# Contributing to FinTrack

Thank you for your interest in contributing to FinTrack! 🎉

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/FinTrack.git
   cd FinTrack
   ```

3. Run setup script:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

4. Configure environment variables (see `.env.example`)

5. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd web
   npm run dev
   ```

## Project Structure

```
FinTrack/
├── backend/          # Node.js + Express API
│   ├── services/    # Business logic (Pluggy, Supabase, WhatsApp)
│   └── routes/      # API endpoints
├── web/             # Next.js frontend
│   ├── pages/       # Next.js pages (routes)
│   └── components/  # React components
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

## Code Style

### JavaScript/JSX

- Use ES6+ features
- Use functional components in React
- Use async/await for async operations
- Add comments for complex logic

### Naming Conventions

- **Files**: camelCase for JS files, PascalCase for React components
- **Functions**: camelCase (e.g., `fetchTransactions`)
- **Components**: PascalCase (e.g., `ExpenseTable`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `PLUGGY_BASE_URL`)

### Example:

```javascript
// Good
export async function fetchTransactions(apiKey, accountId) {
  // Implementation
}

// Bad
export async function FetchTransactions(api_key, account_id) {
  // Implementation
}
```

## Adding Features

### New Service Integration

1. Create service file in `backend/services/`
2. Export clear, documented functions
3. Handle errors gracefully
4. Add tests

Example:
```javascript
// backend/services/newservice.js
import fetch from 'node-fetch';

/**
 * Fetch data from New Service
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Array>} List of items
 */
export async function fetchData(apiKey) {
  try {
    const response = await fetch('https://api.newservice.com/data', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}
```

### New React Component

1. Create component in `web/components/`
2. Use Tailwind CSS for styling
3. Keep components focused and reusable
4. Add PropTypes or TypeScript types

Example:
```jsx
// web/components/NewComponent.jsx
export default function NewComponent({ data, onAction }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">{data.title}</h2>
      <button
        onClick={onAction}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Action
      </button>
    </div>
  );
}
```

### New API Endpoint

1. Create or update route in `backend/routes/`
2. Add proper error handling
3. Document in `docs/API.md`

Example:
```javascript
// backend/routes/newroute.js
import express from 'express';

const router = express.Router();

router.get('/new-endpoint', async (req, res) => {
  try {
    // Implementation
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

## Testing

### Manual Testing

```bash
# Test backend
chmod +x scripts/test-backend.sh
./scripts/test-backend.sh

# Test frontend
# Open browser to http://localhost:3000
# Test login flow
# Test dashboard features
```

### API Testing with cURL

```bash
# Health check
curl http://localhost:3000/health

# Check transactions
curl http://localhost:3000/check

# Test auth
curl -X POST http://localhost:3000/auth
```

## Pull Request Process

1. **Create a branch**: `git checkout -b feature/your-feature-name`

2. **Make changes**: Follow code style guidelines

3. **Test thoroughly**: Test locally before committing

4. **Commit with clear messages**:
   ```bash
   git commit -m "Add: New expense categorization feature"
   ```

   Commit message prefixes:
   - `Add:` - New feature
   - `Fix:` - Bug fix
   - `Update:` - Update existing feature
   - `Refactor:` - Code refactoring
   - `Docs:` - Documentation changes

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**:
   - Go to GitHub and create PR
   - Describe changes clearly
   - Reference any related issues

7. **Wait for review**: Maintainer will review and provide feedback

## Feature Ideas

Here are some ideas for contributions:

### Backend
- [ ] Add expense categorization (food, transport, etc.)
- [ ] Implement monthly spending limits
- [ ] Add support for multiple bank accounts
- [ ] Create expense analytics endpoints
- [ ] Add PDF report generation
- [ ] Implement recurring expense detection

### Frontend
- [ ] Add dark mode
- [ ] Create monthly/yearly views
- [ ] Add expense categories filter
- [ ] Implement budget tracking
- [ ] Add export to Excel/CSV
- [ ] Create expense trends charts
- [ ] Add expense search/advanced filters
- [ ] Mobile responsive improvements

### Integrations
- [ ] Add Telegram bot support
- [ ] Integrate with Google Sheets
- [ ] Add email notifications
- [ ] Support for other banks via Pluggy
- [ ] Add receipt upload (S3/Cloudinary)

### DevOps
- [ ] Add Docker support
- [ ] Implement CI/CD tests
- [ ] Add logging service integration
- [ ] Create database migration scripts
- [ ] Add API rate limiting

## Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: How to recreate the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, Node version, browser
6. **Logs**: Relevant error logs

Example:
```markdown
## Bug: WhatsApp notifications not sending

**Description**: New transactions are saved but WhatsApp messages are not sent.

**Steps to Reproduce**:
1. Run `/check` endpoint
2. New transaction is detected
3. No WhatsApp message received

**Expected**: WhatsApp message with buttons

**Actual**: No message sent

**Environment**: 
- Node v18.17.0
- Backend deployed on Render
- WhatsApp API v18.0

**Logs**:
```
Error: WhatsApp API error: Invalid phone number format
```
```

## Code Review Guidelines

For reviewers:

- Check code follows style guidelines
- Verify error handling is present
- Ensure no sensitive data in commits
- Test functionality locally
- Provide constructive feedback
- Approve when ready

## Questions?

Feel free to:
- Open an issue for questions
- Ask in pull request comments
- Check existing issues/PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to FinTrack! 🙏

