# Implementation Plan: Skills Categories (Soft Skills & Development Skills)

## 🎯 Objective

Rename "Soft Skills" to **"Skills"** and create two sub-categories:
1. **Soft Skills** - Existing personality and behavioral traits
2. **Development Skills** - Technical and professional development skills

Both categories work identically in terms of scoring (0-10 per trait), but track different skill sets.

---

## 📸 Reference: Development Skills List

From the provided image, the Development Skills are:

| # | Development Skill |
|---|-------------------|
| 1 | Frontend |
| 2 | Backend |
| 3 | Workflows |
| 4 | Databases |
| 5 | Prompting |
| 6 | Non-popular LLMs |
| 7 | Fine-tuning |
| 8 | Data Labelling |
| 9 | Content Generation |

---

## 📋 Current Soft Skills (Existing)

| # | Soft Skill |
|---|------------|
| 1 | Accountability |
| 2 | Learnability |
| 3 | Abstract Thinking |
| 4 | Curiosity |
| 5 | Second-Order Thinking |
| 6 | Compliance |
| 7 | Ambitious |
| 8 | Communication |
| 9 | English |
| 10 | First-Principle Thinking |

---

## 🗂️ Implementation Steps

### Step 1: Update Constants/Traits Arrays

**File:** `components/employee/pages/MyReviewPage.tsx` (and other relevant files)

```tsx
const SOFT_SKILL_TRAITS = [
    "Accountability", "Learnability", "Abstract Thinking", "Curiosity", 
    "Second-Order Thinking", "Compliance", "Ambitious", "Communication", 
    "English", "First-Principle Thinking"
];

const DEVELOPMENT_SKILL_TRAITS = [
    "Frontend", "Backend", "Workflows", "Databases", "Prompting",
    "Non-popular LLMs", "Fine-tuning", "Data Labelling", "Content Generation"
];
```

---

### Step 2: Update Database Schema

**Action:** Add a new column or JSONB field for development skills in `student_task_reviews` table.

**Option A: Separate Column**
```sql
ALTER TABLE student_task_reviews 
ADD COLUMN development_skill_traits JSONB DEFAULT '{}';
```

**Option B: Extend Existing JSONB**
Store both in the same field with prefixes or nested structure:
```json
{
  "soft_skills": { "Accountability": 8, "Communication": 7 },
  "development_skills": { "Frontend": 9, "Backend": 7.5 }
}
```

**Recommended:** Option A (separate column) for cleaner queries and easier maintenance.

---

### Step 3: Update Review Form (Tutor/Mentor Side)

**File:** `components/executive/pages/StudentReviewPage.tsx`

**Changes:**
1. Add state for `taskDevSkillTraitScores`
2. Add a new section in the review form for Development Skills
3. Calculate separate averages for Soft Skills and Development Skills
4. Save both to the database

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  Soft Skills (0-10)           Avg: 7.5  │
├─────────────────────────────────────────┤
│  Accountability  [___]  Learnability [___] │
│  Communication   [___]  Curiosity    [___] │
│  ... (10 traits in 2-column grid)       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Development Skills (0-10)    Avg: 8.2  │
├─────────────────────────────────────────┤
│  Frontend  [___]    Backend     [___]   │
│  Prompting [___]    Databases   [___]   │
│  ... (9 traits in 2-column grid)        │
└─────────────────────────────────────────┘
```

---

### Step 4: Update Student Review Page (Tab Rename & Categories)

**File:** `components/employee/pages/MyReviewPage.tsx`

**Changes:**
1. Rename tab from "Soft Skills" to **"Skills"**
2. Add sub-navigation or accordion for:
   - Soft Skills section
   - Development Skills section
3. Display separate averages and trait breakdowns

**Tab Update:**
```tsx
const tabs = [
    { id: 'Score', icon: <Star size={24} />, color: '#f59e0b', label: 'Score' },
    { id: 'Review', icon: <ClipboardList size={24} />, color: '#3b82f6', label: 'Review' },
    { id: 'Improvements', icon: <TrendingUp size={24} />, color: '#10b981', label: 'Improvements' },
    { id: 'Skills', icon: <Award size={24} />, color: '#8b5cf6', label: 'Skills' }  // Renamed
];
```

---

### Step 5: Update SoftSkillsSection Component

**File:** `components/employee/components/SoftSkillsSection.tsx`

**Option A:** Extend existing component to accept a `category` prop
**Option B:** Create a new reusable `SkillsSection` component that handles both

**Recommended:** Option B - Create a generic `SkillsSection` component:

```tsx
interface SkillsSectionProps {
    title: string;  // "Soft Skills" or "Development Skills"
    averageScore: number;
    traits: { name: string; score: number }[];
    accentColor?: string;
}
```

---

### Step 6: Update Dashboard Home Soft Skills Display

**File:** `components/employee/pages/DashboardHome.jsx`

Update the home dashboard to show both skill categories or a combined "Skills" section with tabs.

---

### Step 7: Update Services/API Layer

**File:** `services/reviews/studentTaskReviews.ts`

Update the `upsertTaskReview` function to accept and save `development_skill_traits`.

```tsx
export async function upsertTaskReview({
    student_id,
    task_id,
    score,
    soft_skills_score,
    development_skills_score,  // NEW
    review,
    improvements,
    reviewer_id,
    reviewer_role,
    soft_skill_traits,
    development_skill_traits   // NEW
}: TaskReviewParams) { ... }
```

---

## 🎨 UI Design Mockup

### Skills Tab (Student View)

```
┌────────────────────────────────────────────────────────────┐
│  Skills                                                    │
│  Track your soft skills and development skills progress    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Soft Skills   │  │ Development Skills│  ← Sub-tabs    │
│  └─────────────────┘  └─────────────────┘                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│      ┌───────────────────────────────────────┐             │
│      │  Overall Average: 7.8/10   🎉          │             │
│      │  ████████████████████░░░░░░ 78%        │             │
│      └───────────────────────────────────────┘             │
│                                                            │
│  ┌────────────┬────────────┬────────────┬────────────┐     │
│  │ Accounta.. │ Learnabil..│ Abstract.. │ Curiosity  │     │
│  │    8.5     │    7.2     │    6.8     │    9.0     │     │
│  └────────────┴────────────┴────────────┴────────────┘     │
│  ... more traits                                           │
└────────────────────────────────────────────────────────────┘
```

### Review Form (Tutor View)

```
┌────────────────────────────────────────────────────────────┐
│  Reviewing: Assignment 1                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Task Score (0-10)         [████████░░] 8.0                │
│                                                            │
│  Review / Feedback                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Great work on the frontend implementation...         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ─── Soft Skills ─────────────────────── Avg: 7.5 ───      │
│  │ Accountability [8] │ Communication [7] │ English [8] │  │
│  │ ... more traits                                      │  │
│                                                            │
│  ─── Development Skills ────────────────── Avg: 8.2 ───    │
│  │ Frontend [9]  │ Backend [7.5] │ Databases [8] │          │
│  │ Prompting [9] │ Fine-tuning [8] │ ...         │          │
│                                                            │
│  [       Save Review       ]                               │
└────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Files to Modify

| File | Changes |
|------|---------|
| `database/sql/add_development_skills.sql` | **NEW** - Add column to student_task_reviews |
| `components/employee/pages/MyReviewPage.tsx` | Rename tab, add sub-categories, display both skill types |
| `components/employee/pages/DashboardHome.jsx` | Update Skills section on home dashboard |
| `components/employee/components/SoftSkillsSection.tsx` | Refactor to handle both categories |
| `components/executive/pages/StudentReviewPage.tsx` | Add Development Skills input section |
| `services/reviews/studentTaskReviews.ts` | Update to save/fetch both skill types |

---

## ✅ Acceptance Criteria

1. [x] Tab renamed from "Soft Skills" to "Skills"
2. [x] Two sub-categories visible: Soft Skills & Development Skills
3. [x] Tutors/Mentors can score both skill categories per task
4. [x] Students can view scores for both categories
5. [x] Separate averages calculated for each category
6. [x] Development Skills matches the 9 traits from the image
7. [ ] Database schema updated with new column (SQL file created, run manually)
8. [x] Real-time updates work for both skill categories
9. [x] Weekly/Monthly filtering applies to both categories

---

## ⏱️ Estimated Effort

| Task | Time |
|------|------|
| Database migration | 10 min |
| Update constants/types | 10 min |
| Update review form (Tutor) | 30 min |
| Update student view (Skills tab) | 30 min |
| Update dashboard home | 15 min |
| Update services layer | 15 min |
| Testing & polish | 20 min |
| **Total** | **~2.5 hours** |

---

## 🚀 Implementation Order

1. **Database First** - Add `development_skill_traits` column
2. **Constants** - Add `DEVELOPMENT_SKILL_TRAITS` array
3. **Tutor Side** - Update `StudentReviewPage.tsx` to capture both
4. **Services** - Update save/fetch functions
5. **Student Side** - Update `MyReviewPage.tsx` to display both
6. **Dashboard** - Update home page Skills display
7. **Testing** - End-to-end verification

---

*Plan created: January 21, 2026*
