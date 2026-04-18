# ContextCast — Frontend-Only UI Requirements

## Project Goal
Create a high-fidelity, interactive frontend-only prototype for ContextCast. The focus is on layout, navigation, component design, and "feel." No functional backend, database, or API calls (AWS/Claude) should be implemented. All data should be hardcoded (mocked).

---

## 1. Global Layout & Navigation
The app follows a "Fixed Shell" architecture common in audio platforms.

### A. Persistent Left Sidebar
* **Logo/Branding:** "ContextCast" placeholder at the top.
* **Primary Navigation:**
    * `Create Podcast` (Icon + Text)
    * `My Podcasts` (Icon + Text)
    * `My Cheat Sheets` (Icon + Text)
* **Topics Section:**
    * Heading: "Topics"
    * A list of clickable links. Each link includes a colored circle icon, the Topic Name, and a numerical badge (e.g., "History • 4").
* **Behavior:** Clicking navigation items swaps the main content area. Sidebar remains fixed.

### B. Persistent Player Bar (Bottom)
* **Visual State (Empty):** Shows a "No track selected" message.
* **Visual State (Active):**
    * **Left:** Episode Title (clickable) and Subtext (Topic name | Voice name).
    * **Center:**
        * Row of buttons: Shuffle (toggle style), Previous, Play/Pause (large), Next.
        * Progress Slider: A horizontal bar with timestamps (0:00 / 0:00) on either side.
    * **Right:** "View Cheat Sheet" button and a Volume icon/slider.
* **Behavior:** Stays visible on every page.

---

## 2. Page Components & Features

### Page 1: Create Podcast
The layout for a multi-step or multi-input generation form.

* **Source Input Selector:**
    * A tabbed interface with four options: `Text`, `URL`, `File`, `Record`.
    * **Text View:** A large, styled auto-expanding textarea.
    * **URL View:** A single-line text input with a "Fetch" button decoration.
    * **File View:** A drag-and-drop "dropzone" box with an upload icon.
    * **Record View:** A "Start Recording" button with a mock timer (00:00).
* **Configuration Grid:**
    * **Topic Selector:** A dropdown menu that includes an "+ Add New Topic" option.
    * **Style Selection:** A horizontal row of "Pill" buttons (Informative, Funny, Story-driven, Interview).
    * **Depth Selection:** A horizontal row of "Pill" buttons (Beginner, Intermediate, Expert).
    * **Voice Grid:** A selection area (cards or grid) showing various voice options with flag icons (US, UK, AUS, IND) and gender labels.
* **Primary Action:**
    * Large "Generate" button.
    * **Interaction Design:** When clicked, it should trigger a mock "Loading State" (e.g., a progress bar or rotating text: "Writing script...", "Generating audio...") for 3 seconds before navigating to the "My Podcasts" page.

### Page 2: My Podcasts
A library view organized by category.

* **Topic Rows:** The page is divided into vertical sections by Topic.
    * **Section Header:** Topic Name and a "Play All" text link.
    * **Horizontal Carousel:** Each topic has a horizontally scrollable list of Episode Cards.
* **Episode Card Component:**
    * **Thumbnail:** A square box with a background color and a large central emoji.
    * **Badges:** A small overlay badge indicating the "Style" (e.g., "Funny").
    * **Text:** Title (bold) and duration/depth (e.g., "12 min • Expert").
    * **Actions:**
        * `Play` button: Visually updates the card to "Playing" state (accent border).
        * `Cheat Sheet` button: Navigation link.

### Page 3: My Cheat Sheets
A vertical feed of summarized content.

* **Cheat Sheet Card:**
    * **Top Bar:** Title, Topic Dot, and a "Play Episode" button.
    * **Key Terms Section:** A flex-wrap container of small tags/pills.
    * **Key Concepts Section:** A styled bulleted list (3-5 items).
    * **Takeaway Box:** A high-visibility "callout" box with a different background color for the main insight.
* **Navigation Behavior:** Clicking "View Cheat Sheet" from the Player Bar or a Podcast Card should scroll the page to the specific card for that episode.

---

## 3. Visual States & Mock Interactions
To make the frontend feel "alive" without a backend:

* **Active Links:** Current navigation items in the sidebar should have an active background/text color.
* **Hover States:** All cards, buttons, and list items must have subtle hover transformations (scaling, color shifts).
* **Empty States:** If a user clicks "My Cheat Sheets" and no podcasts have been "generated," show a "No cheat sheets yet" graphic.
* **Mock Playback:** Clicking "Play" on any card should update the Global Player Bar with that card's specific title and data.

## 4. Technical Constraints (Frontend Only)
* **No API Keys:** No Claude, AWS, or Supabase keys should be required or used.
* **Local State Only:** Use standard frontend state management (e.g., React `useState`) to handle UI changes.
* **Mock Data:** Use a JSON object or hardcoded array to populate the Topics, Podcasts, and Cheat Sheets.