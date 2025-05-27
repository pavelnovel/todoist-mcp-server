# Contributing to Todoist MCP Server

This document provides guidelines and instructions for contributing to this project.

## Development Workflow

### Branch Structure
- `main`: Production-ready code
- `dev`: Development branch for ongoing work
- `feature/*`: Feature branches for specific features
- `bugfix/*`: Branches for bug fixes

### Getting Started
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/todoist-mcp-server.git
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/pavelnovel/todoist-mcp-server.git
   ```

### Development Process
1. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/your-bug-fix
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

3. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request (PR) from your branch to the `dev` branch

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing
- Test your changes thoroughly
- Ensure all existing tests pass
- Add new tests for new features

### Pull Request Process
1. Update the README.md if needed
2. Update the documentation if needed
3. Ensure your code follows the style guidelines
4. Link any related issues
5. Wait for review and address any feedback

### Commit Messages
Use clear and descriptive commit messages:
```
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
chore: update dependencies
```

## Getting Help
- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be clear and specific in your issue description

## License
By contributing to this project, you agree that your contributions will be licensed under the project's MIT License. 