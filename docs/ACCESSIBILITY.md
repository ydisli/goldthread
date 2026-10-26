# Accessibility

Goldthread aims for **WCAG 2.1 AA**. This page says what is checked, how, and what still needs a person.

## What is checked automatically

`npm run e2e` runs these in a real Chromium:

- **axe-core scan, WCAG 2.0/2.1 A and AA rules**, on the sign-in page and 16 main pages (Home, Inbox, All tools, Stakeholders, Signals, Bets, Specs, Requirements, Process models, Backlog, Roadmap, Releases, Meetings, Workspace settings, Field guide, Ask), in **both light and dark themes**. The test fails on any violation.
- **Keyboard journeys:**
  - the first Tab reaches "Skip to content";
  - after navigating, focus moves to the new page's heading and the tab title changes;
  - the editor drawer focuses its first field, keeps Tab inside, closes with Escape and gives focus back to the button that opened it;
  - quick capture opens with `c` and closes with Escape.

Automated rules find only part of the problems. Passing them is the minimum, not proof that the app is accessible.

## What was fixed to get there

- **Contrast.** Secondary text was 3.2–3.6:1 in the light theme; it is now at least 4.6:1 on every surface, and at least 5:1 in the dark theme. Avatar colours were darkened so white initials reach 4.5:1.
- **Names for every control.** Every form field in the editor has a `<label for>`. Around 55 filters, inline editors, selects and search boxes that had only a placeholder now have an accessible name. Rating scales are labelled groups, and their buttons report `aria-pressed`.
- **Spoken names match the visible text.** The workspace switcher and the account menu used to be announced as "Switch workspace" and "Account menu", which isn't what they show (WCAG 2.5.3, Label in Name). They now take their names from their text.
- **Dialogs.** Drawers and modals have `aria-modal` and a name taken from their heading. Focus moves in when they open, stays inside while they are open, and goes back to the opener when they close.
- **Keyboard access to boards.** Roadmap tiles and bars, story-map cards, request-board cards and clickable table rows used to respond only to the mouse. They can now be reached with Tab and opened with Enter.
- **Errors are announced.** Form errors use `role="alert"` and scroll into view.

## Known gaps

- **Drag and drop has no keyboard equivalent.** This affects the roadmap lanes, the story map and the request board. Every move can still be made by keyboard: open the item and change its horizon, release or status in the editor. A keyboard "move to…" menu on each tile would be better.
- **Process modeller canvas.** You can select and edit steps, lanes and connections with the keyboard in the side panel. Placing steps on the canvas still needs a pointer. The list view and the step-by-step comparison are text alternatives to the diagram.
- **Charts** (roadmap timeline, forecast fan, metrics) have hover tooltips and text summaries next to them, but no table view yet.
- **Live updates** from other people (SSE) refresh the page quietly. They are not announced through a live region.

## What needs a person

None of these have been done yet. Each needs a human tester, and ideally people who use these tools every day:

- **Screen readers:** VoiceOver with Safari (macOS and iOS), NVDA with Firefox or Chrome, and JAWS with Chrome. Cover sign-in, capture, editing an item, the comment @mention picker, the conflict dialog, the process modeller's side panel and the Field Guide quizzes.
- **Zoom and reflow:** 200% and 400% zoom, and a 320 px-wide viewport (WCAG 1.4.10).
- **Windows High Contrast / forced colours.**
- **Voice control** (Voice Control on macOS, Dragon): check that every control can be targeted by its visible name.
- **Cognitive load:** plain-language review of the guidance and error messages.

To report a barrier, open an issue with the label `accessibility`. Include the page, what you were trying to do, and the assistive technology and browser you used.
