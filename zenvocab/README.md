# ZenVocab (静心背单词)

A React-based vocabulary learning application with AI parsing, spaced repetition, and dictation modes.

## 1. Hosting on GitHub (Deployment)

To make this app accessible for a WeChat Mini Program, you first need to host it as a secure (HTTPS) website.

### Steps:
1.  Initialize Git:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  Create a repository on GitHub.
3.  Push your code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    git push -u origin main
    ```
4.  **Deploy to Vercel (Recommended for best performance/HTTPS):**
    *   Go to [Vercel.com](https://vercel.com) and login with GitHub.
    *   Import your repository.
    *   Framework Preset: Create React App (or Vite depending on build tool).
    *   Deploy. You will get a URL like `https://zenvocab.vercel.app`.

## 2. Deploying to WeChat Mini Program (微信小程序)

Since this is a Web Application, the easiest integration method is using a **WebView**.

### Prerequisites:
*   A WeChat Official Account / Mini Program Account (Corporate/Enterprise accounts usually required for WebView of external domains, though personal accounts can sometimes use it for debugging).
*   WeChat Developer Tools.

### Steps:
1.  **Configure Business Domain (业务域名):**
    *   Log in to [WeChat Official Accounts Platform](https://mp.weixin.qq.com/).
    *   Go to **Development (开发) -> Development Settings (开发设置) -> Business Domain (业务域名)**.
    *   Add the domain where you hosted the app (e.g., `zenvocab.vercel.app`).
    *   You may need to download a validation file and upload it to your host's root directory.

2.  **Create Mini Program:**
    *   Open WeChat Developer Tools.
    *   Create a new project.
    *   Select "Mini Program".
    *   Language: JavaScript.

3.  **Update Code (`pages/index/index.wxml`):**
    Replace the content with:
    ```html
    <web-view src="https://YOUR-DEPLOYED-URL.vercel.app"></web-view>
    ```

4.  **Upload & Release:**
    *   Test in the simulator.
    *   Click "Upload" in Developer Tools.
    *   Submit for audit in the WeChat admin panel.

## Features
*   **AI Parsing**: Parses PDF/Word/Images via Gemini API.
*   **Study Mode**: Spaced repetition (Known/Vague/Unknown).
*   **Dictation Mode**: Spelling practice with British pronunciation.
*   **Error Log**: Review incorrect words.
*   **History**: Track learning sessions and accuracy.
