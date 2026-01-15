# Giaway Dinner

This project is a React application built with Vite and TypeScript.

## 🚀 Getting Started

### Prerequisites

- Node.js (v20 or higher recommended)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    - Create a `.env.local` file in the root directory.
    - Add your Gemini API key:
      ```env
      VITE_GEMINI_API_KEY=your_api_key_here
      ```
    *(Note: Ensure your code uses `import.meta.env.VITE_GEMINI_API_KEY` to access it)*

### Running Locally

To start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🛠️ Build

To build the application for production:

```bash
npm run build
```

The output will be in the `dist` directory.

## 📦 Deployment

This project is configured to deploy to **GitHub Pages** automatically using GitHub Actions.

### Steps to Enable Deployment:

1.  Go to your repository **Settings** on GitHub.
2.  Navigate to **Pages** (under the "Code and automation" section).
3.  Under **Build and deployment** > **Source**, select **GitHub Actions**.
4.  Push your changes to the `main` branch. The deployment workflow will trigger automatically.

## 📂 Project Structure

- `src/` - Source code
- `.github/workflows/` - CI/CD configurations
- `dist/` - Production build output (ignored by git)
