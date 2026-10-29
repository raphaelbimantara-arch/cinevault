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

In the Actors page, Grid cards show each actor's movie count. List view includes actor name, date of birth, age, debut age, total film size, total duration in minutes, movie count, and a rightmost Uncensored movie count; click column headings to sort ascending or descending. The Debut Age column sorts from youngest to oldest and vice versa. On phone screens, actor names and DOB values wrap to show their full text, the Min column shows only its numeric value, and Uncensored is abbreviated to Uncen so the columns fit without horizontal scrolling. Edit actor name and date of birth with the List Edit action or from actor details. Date of birth has optional year, month, and day selectors; any selected parts are saved, and clearing all three removes the date. For age calculation, a missing month defaults to January and a missing day defaults to the first. Actor details show all saved aliases below the actor's name; add aliases individually with **Save alias** in the edit form. Aliases are also available when searching for actors and selecting movie credits. Actor details show current age, debut age (based on birth year and the earliest released credited film), and the total movie count in the Movies Title heading. Click an actor in a movie's Starring Cast to open that actor's details, or click a movie in an actor's filmography to open the movie details; the Back button returns to the previous detail. Film size, duration, and count are calculated from the movies in the catalog. Sort and search controls are shown in Grid view; List and Cover views use a compact toolbar without those controls.

In **Settings → Duplicates**, switch between movie and actor candidates. Use **Keep These** after reviewing a group and deciding all entries should remain; confirmation marks that group reviewed on this device without changing or deleting its data. Actor matching checks names and registered aliases for exact matches, likely typos, reordered name parts, and similar first/last names. These are suggestions; review the candidate profiles before choosing which actor name to keep and merge into. Merging updates movie credits, combines Favorite/Review status, and preserves alternate names as aliases.
