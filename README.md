<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/05dbe0b3-f678-4d90-9177-ec26f808c69a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Using Google Drive Images

Paste a Google Drive sharing link into a movie's poster URL or an actor's photo URL. In Google Drive, open **Share** and set **General access** to **Anyone with the link** (Viewer); private files cannot be displayed. The app converts standard Drive file-sharing links to image URLs automatically.