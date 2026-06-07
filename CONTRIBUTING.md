# 🤝 Contributing to Universal Task Structurer

Thank you for your interest in contributing to the Universal Task Structurer! We welcome community contributions to help improve the AI task extraction engine and frontend experience.

## 📋 Code of Conduct

By participating in this project, you agree to abide by our code of conduct and maintain a respectful, constructive environment.

## 🚀 How to Contribute

### 1. Report Bugs or Request Features
If you find a bug or have an idea for a feature, please search existing issues first. If it is new, open a detailed issue using our GitHub templates.

### 2. Local Setup
Follow the instructions in the [README.md](README.md) to set up the Vite development server locally.

### 3. Submitting Changes
- Create a new branch named `feature/your-feature-name` or `bugfix/your-fix-name`.
- Write clean, modular React (TypeScript) or Google Apps Script code.
- Ensure that the TypeScript compiler passes without errors:
  ```bash
  npm run lint
  ```
- Run the production builder to ensure compilation succeeds:
  ```bash
  npm run build
  node build-gas.js
  ```
- Open a Pull Request pointing to the `main` branch. Describe your changes clearly in the PR template.

## 📄 License
By contributing, you agree that your contributions will be licensed under the project's MIT License.
