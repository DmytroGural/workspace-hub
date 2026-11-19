# Workspace Hub — Modern Style Web Client for Trello

**Workspace Hub** is a modern **Vue 3 + TypeScript** web client with a **modern style** interface that brings together boards, lists, and cards from connected **Trello** accounts into a unified workspace.

---

## Key Features

1. **Unified Cross-Board Dashboard (`/dashboard`)**:
   - Aggregates tasks across all visible boards and connected accounts in one place.
   - Displays status and deadline summaries (`Today`, `Overdue`, `Upcoming`) with quick navigation to urgent tasks, boards, and filtered task views.

2. **4 Modern Style Workspace Views**:
   - **Dashboard**: cross-board overview, progress metrics, and urgent deadlines.
   - **List**: structured table view supporting grouping by list, smart section, board, account, label, or flat list, with collapsible groups and URL-synced pagination.
   - **Board**: Kanban board organized by board lists (with drag-and-drop card moves between lists) or cross-board smart sections (`Overdue Action`, `Due Today`, `Next 7 Days`, `Later / Someday`, `Completed`).
   - **Calendar**: monthly deadline grid with month navigation, task creation, and completion toggles.

3. **Interactive Task Management**:
   - **Task Detail Drawer**: slide-over panel for editing titles, descriptions, due dates, labels, and assignees, jumping to the parent project/board, and managing checklists and comments.
   - File attachments supported in both task descriptions and comments.
   - One-click task completion toggles with celebration confetti (`canvas-confetti`) and quick task creation via `NewTaskModal`.

4. **Multi-Account Sync & Extensible Connectors**:
   - Manage multiple provider accounts in `/settings` and filter by account, board, label, search query, or assigned tasks.
   - Built-in **Trello REST API** connector with automatic provider plugin discovery (`src/connectors/*/*ProviderPlugin.ts`).

---

## Tech Stack

- **Vue 3** (Composition API, `<script setup lang="ts">`)
- **TypeScript**
- **Vue Router**
- **Vite**
- **Tailwind CSS**
- **Lucide Icons** (`lucide-vue-next`)
- **Luxon**
- **Canvas Confetti**
- **Biome**

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Type-check and build for production
npm run build

# Preview the production build
npm run preview
```

### Code Quality

```bash
# Run lint and format checks
npm run check

# Auto-fix formatting and safe lint rules
npm run check:fix

# Run lint or formatting only
npm run lint
npm run format
```

---

## License

This project is licensed under the **MIT** License.
