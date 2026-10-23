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

## Movie Library

In the library, press and hold a movie to select it. Once selection mode is active, click anywhere on a movie card or row to select or deselect it; the checkbox is also available. Outside selection mode, clicking a movie opens its details. Press and hold inside Movie Details to open quick actions for Favorite, Review, and Delete. Cover view displays movie posters with an Uncensored badge where applicable; its selected number of columns is remembered between view changes and visits. In List view, Title, Year, Size, Min, Resolution, Actor, Studio, and Genre headers sort in ascending or descending order; the column headings stay visible while scrolling and fit the phone screen without horizontal scrolling. Size and minute values are right-aligned, and the full size value is shown on phone screens. Use the single edit button at the far right of the List header to edit displayed movie data, then save or cancel from that same header. Favorite and Review icons appear in the far-right column. Editable fields clear when focused. Genre is optional when adding or editing a movie. Size accepts only digits and a comma; the GB suffix is added automatically. Resolution, Actor, Studio, and Genre show existing catalog options when focused and filter them as you type; use the keyboard arrow keys and Enter to choose a suggestion, or enter a new value to add it when saving. Actor suggestions also include registered aliases; choosing an alias saves the actor's original name in the movie credit. Use the Movie Detail edit form to mark a film Uncensored; its detail title and Library List title then show the Uncensored label on a separate line so it does not cover the title. The Library filter can show all Uncensored movies. While the Library or Actors page is active, press a letter key to jump-scroll to the first matching title or actor; the full alphabetically sorted list remains visible and can still be scrolled. Keyboard shortcuts are ignored while typing in a field. Click a movie's resolution in its details to filter the Library to films with the same resolution. The phone Back button returns to the previous in-app page or detail. Use the selection actions to add selected movies to Favorites, mark them for Review, or delete them. After marking movies Favorite or Reviewed, they remain selected so you can apply both statuses or delete them; use Clear to end selection. Movie Favorite and Review markers use icons. Actors can be selected by long-press or checkbox, then marked Favorite or Review. Actor Grid cards display movie counts, and Actor List provides editable name, date of birth, catalog-calculated size and duration, movie count, and count of Uncensored movies. Actor aliases remain available in actor details. If any selected item already has that status, the notification offers to remove the existing mark. Favorite and Review markers appear alongside movie and actor names and in their details. Successful favorite, review, and delete actions show a notification. Filter the catalog by Favorites or Reviewed from the category menu. Movie and actor search, sort, filters, and view controls stay pinned below the top navigation while you scroll through their lists.

## Actors

In the Actors page, Grid cards show each actor's movie count. List view includes actor name, alias, date of birth, age, total film size, total duration in minutes, and movie count; click any of those column headings to sort ascending or descending, and edit actor name, alias, and date of birth with the List Edit action. Actor details show the alias below the name, age beside date of birth, and the total movie count in the Movies Title heading. Click an actor in a movie's Starring Cast to open that actor's details, or click a movie in an actor's filmography to open the movie details; the Back button returns to the previous detail. Film size, duration, and count are calculated from the movies in the catalog. Sort and search controls are shown in Grid view; List and Cover views use a compact toolbar without those controls.

## Shared Catalog with Google Sheets

The web app and Android APK can share a movie catalog through a Google Sheet. The Vercel API proxies requests to Apps Script so the Apps Script URL and shared key are not embedded in the app bundle.

### One-time setup

1. Create a Google Sheet for the catalog. Copy its spreadsheet ID from the URL between `/d/` and `/edit`.
2. In the sheet, open **Extensions → Apps Script**, replace the editor contents with [`google-apps-script/Code.gs`](./google-apps-script/Code.gs), and save. When updating an existing deployment, choose **Deploy → Manage deployments → Edit → New version → Deploy**. The script adds newly required headers (including Uncensored) to an existing Movies sheet automatically.
3. In Apps Script, open **Project Settings → Script Properties** and add:
   - `SPREADSHEET_ID`: the spreadsheet ID.
   - `CINEVAULT_SHARED_SECRET`: a strong, randomly generated access key. Keep it private.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as** to your account and **Who has access** to **Anyone**, then deploy and authorize it. Copy the Web app URL ending in `/exec`.
5. In the Vercel project settings, add these **Production Environment Variables**:
   - `GOOGLE_SHEETS_WEB_APP_URL`: the Apps Script `/exec` URL.
   - `CINEVAULT_SHARED_SECRET`: exactly the same secret set in Apps Script.
   - Optionally, `CINEVAULT_ALLOWED_ORIGINS`: comma-separated additional app origins if using a Vercel domain other than `https://cinevault-delta-lake.vercel.app`.
6. Redeploy the Vercel project so the API receives the new environment variables.
7. Open CineVault **Settings → Shared** on the device that has the catalog you want to keep. Enter the shared key and connect. If the Sheet is empty, choose **Salin film ini ke Google Sheets** to initialize it with that device's catalog.
8. On every other browser or APK, open **Settings → Shared** and enter the same shared key. The app loads the shared catalog when opened and saves subsequent catalog changes automatically. Other devices see updates the next time they open or reload the app.

The shared key is a shared password: anyone who knows it can read and replace the full movie list. Use a long random value, do not publish it, and do not place it in source code or Vercel's `VITE_` environment variables. In **Settings → Shared**, use **Save to Database** to replace the shared catalog with this device's catalog, or **Update Database** to replace this device's catalog with the latest non-empty shared catalog. Saving confirms before replacing the entire shared catalog. After deploying an updated Apps Script, save the catalog from the device that has any unsynced Uncensored marks before loading the shared database on other devices. If the shared catalog is empty or cannot be loaded, the device's existing catalog is kept. Keep CSV exports as backups. Simultaneous edits from multiple devices use last-save-wins behavior.