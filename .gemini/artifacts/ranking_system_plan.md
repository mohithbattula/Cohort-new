# Implementation Plan: Organization-Wide Ranking System

## 1. Objective
Implement a tiered ranking system based on the average of Soft Skills and Development Skills scores. The system will categorize students into "Top Performers" and "At-Risk Zones" with strict visibility rules to maintain morale while encouraging improvement.

---

## 2. Ranking Logic
- **Score Calculation**: `(Average Soft Skills Score + Average Development Skills Score) / 2` for the current assessment period (current week).
- **Ranking Tiers**:
  - **Top 5**: The five students with the highest aggregate scores.
  - **Bottom 5**: The five students with the lowest aggregate scores.
    - **Yellow Zone (Warning)**: Bottom 3rd, 4th, and 5th members of the list.
    - **Red Zone (Risk)**: Bottom 2 members of the list.

---

## 3. Visibility Rules
| Section | Visible To |
| :--- | :--- |
| **Top 5 Leaderboard** | **Entire Organization** (All roles, all students) |
| **Bottom 5 List/Status** | **Only the students who are actually in the Bottom 5** (Private feedback) |
| **Full Rankings** | **Executives and Managers** (For oversight/mentorship) |

---

## 4. Implementation Steps

### Phase 1: Data Fetching Service
Create a service function `getOrganizationRankings` that:
1. Fetches all assessments for the current week.
2. Calculates the aggregate average for each student.
3. Sorts students by score descending.
4. Identifies the Top 5 and Bottom 5 IDs.

### Phase 2: Navigation & Sidebar Update
- Add a new "Ranking" item to the **CORE** or **COHORT** section of the sidebars (`Sidebar.jsx`).
- This item should be accessible to all roles.

### Phase 3: The Leaderboard Page (`LeaderboardPage.tsx`)
- **Top 5 Component**: 
  - Premium design with Gold, Silver, and Bronze accents for the top 3.
  - Displayed prominently at the top.
- **Bottom 5 / "My Status" Component**:
  - Contains a conditional check: `if (currentUserRank <= 5 from bottom)`.
  - **Yellow Zone UI**: "Attention Required" message with yellow progress bars.
  - **Red Zone UI**: "Risk Zone" message with red pulse animations and specific "Action Required" instructions.
  - If a student is **not** in the Top 5 or Bottom 5, they only see the Top 5 list.

### Phase 4: Role-Based Views
- **Executive/Manager View**: Display both the Top 5 and the Bottom 5 lists in a dashboard view to facilitate interventions.

---

## 5. Visual Aesthetics
- **Top 5**: Use `lucide-react` Trophy icons, gradients (Gold/Chrome), and NumberTickers for scores.
- **Yellow Zone**: Use `AlertTriangle` icon with #f59e0b (Amber) colors.
- **Red Zone**: Use `Activity` or `ShieldAlert` icons with #ef4444 (Red) colors and a subtle red glow effect.

---

## 6. Next Steps
1. Create `services/reviews/rankingService.ts` for calculations.
2. Create `components/shared/pages/LeaderboardPage.tsx`.
3. Update `Sidebar.jsx` in Executive, Manager, and Employee folders.
