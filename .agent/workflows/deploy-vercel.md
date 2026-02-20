---
description: how to deploy the application to Vercel
---

1. Push your latest changes to GitHub.
2. Go to [Vercel](https://vercel.com) and log in with GitHub.
3. Click **Add New** > **Project**.
4. Import your `ai-saju` repository.
5. In the **Environment Variables** section, add:
   - Key: `VITE_SHEET_URL`
   - Value: (Your Google Apps Script URL)
6. Click **Deploy**.
7. Once finished, you can find your project at `<project-name>.vercel.app`.
