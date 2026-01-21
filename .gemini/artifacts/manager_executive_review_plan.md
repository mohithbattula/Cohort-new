# Implementation Plan: Manager & Executive Review Form Updates

## 🎯 Objective

Ensure both **Manager (Mentor)** and **Executive (Tutor)** dashboards have the updated review form that includes:
1. **Weekly/Monthly** time period toggle for viewing reviews
2. **Development Skills** scoring section (9 traits)
3. Consistent terminology and UI across all reviewer roles

---

## 📊 Current Status

| Feature | Executive (Tutor) | Manager (Mentor) | Student |
|---------|-------------------|------------------|---------|
| Development Skills Input | ✅ Done | ⚠️ Needs Verification | ✅ Done (View Only) |
| Weekly/Monthly Toggle | ❌ Not Added | ❌ Not Added | ✅ Done |
| Skills Tab (Soft + Dev) | N/A | N/A | ✅ Done |

---

## 📋 Implementation Steps

### Step 1: Verify Manager Dashboard Uses StudentReviewPage

**Check:** Does the Manager Dashboard route to the same `StudentReviewPage.tsx` component?

**File:** `components/pages/ManagerDashboard.tsx`

```tsx
// Line 56 in ManagerDashboard.tsx
<Route path="student-review" element={<StudentReviewPage />} />
```

**Status:** ✅ Already sharing the component - Manager inherits all Executive changes!

---

### Step 2: Add Weekly/Monthly Toggle to StudentReviewPage (Reviewer Side)

**File:** `components/executive/pages/StudentReviewPage.tsx`

**Current State:** The reviewer form shows all students and their tasks, but has no time-based filtering.

**Changes:**
1. Add `viewPeriod` state (`'weekly'` | `'monthly'`)
2. Add toggle UI in the header area
3. Filter the displayed task reviews based on the selected period
4. This helps reviewers focus on recent tasks needing review

**UI Placement:**
```
┌────────────────────────────────────────────────────────────┐
│  Student Review                 [ Weekly ] [ Monthly ]     │
│  Track performance across tasks                            │
├────────────────────────────────────────────────────────────┤
│  All Students (12)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1  [A] Alex Johnson   alex@example.com  [Student]  │   │
│  │  2  [B] Bob Smith      bob@example.com   [Mentor]   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

### Step 3: Verify Development Skills Section in Review Modal

**File:** `components/executive/pages/StudentReviewPage.tsx`

**Status:** ✅ Already implemented in previous changes!

The review modal now includes:
- Task Score (0-10)
- Review / Feedback textarea
- Improvements textarea
- **Soft Skills (0-10)** - 10 traits with average
- **Development Skills (0-10)** - 9 traits with average
- Save Review button

---

### Step 4: Filter Tasks by Time Period in Review Modal

**Enhancement:** When a reviewer opens a student's review modal, filter the task list based on the selected period.

```tsx
// Filter tasks by review date
const filterTasksByPeriod = (tasks: any[], period: 'weekly' | 'monthly') => {
    const now = new Date();
    const daysBack = period === 'weekly' ? 7 : 30;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    return tasks.filter(task => {
        // Show tasks due within the period OR tasks with reviews in the period
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const reviews = task.student_task_reviews || [];
        const hasRecentReview = reviews.some((r: any) => {
            const reviewDate = new Date(r.created_at || r.updated_at);
            return reviewDate >= startDate;
        });
        
        return (dueDate && dueDate >= startDate) || hasRecentReview;
    });
};
```

---

### Step 5: Update Database Migration (If Not Done)

**File:** `database/sql/add_development_skills.sql`

**SQL to run in Supabase:**
```sql
-- Add development_skill_traits column
ALTER TABLE student_task_reviews 
ADD COLUMN IF NOT EXISTS development_skill_traits JSONB DEFAULT '{}';

-- Add development_skills_score column
ALTER TABLE student_task_reviews 
ADD COLUMN IF NOT EXISTS development_skills_score NUMERIC(4,2) DEFAULT 0;
```

**Status:** ⚠️ SQL file created, needs to be run manually in Supabase SQL Editor

---

### Step 6: Ensure Consistent Terminology

**Labels to verify across all reviewer UIs:**

| Old Term | New Term | Files to Check |
|----------|----------|----------------|
| Employee | Student | Sidebar, Header, Forms |
| Executive | Tutor | Review labels, locked messages |
| Manager | Mentor | Review labels |
| Soft Skills | Skills (with sub-categories) | Tabs, sections |

---

## 🗂️ Files to Modify

| File | Changes |
|------|---------|
| `components/executive/pages/StudentReviewPage.tsx` | Add Weekly/Monthly toggle, filter tasks by period |
| `components/manager/components/Layout/Header.jsx` | Verify search/terminology consistency |
| `database/sql/add_development_skills.sql` | Run migration (already created) |

---

## 🎨 UI Mockup: Updated StudentReviewPage

```
┌────────────────────────────────────────────────────────────┐
│  Student Review                 [ Weekly ] [ Monthly ]     │
│  Track performance across tasks                            │
├────────────────────────────────────────────────────────────┤
│  Search students...                                        │
├────────────────────────────────────────────────────────────┤
│  All Students (12)                                         │
├────────────────────────────────────────────────────────────┤
│  1  [A] Alex Johnson      alex@ex.com    [Student]   →     │
│  2  [B] Bob Smith         bob@ex.com     [Mentor]    →     │
│  3  [C] Carol White       carol@ex.com   [Student]   →     │
└────────────────────────────────────────────────────────────┘

                        ↓ Click on student

┌─ Review Modal ───────────────────────────────────────────┐
│  Review: Alex Johnson                              [X]   │
│  Select a task to grade                                  │
├────────────────┬─────────────────────────────────────────┤
│  Select Task   │  Reviewing: Assignment 1               │
│  ┌──────────┐  │                                         │
│  │ Task 1   │  │  Task Score (0-10)    [████████] 8.0    │
│  │ Score: 8 │  │                                         │
│  ├──────────┤  │  Review / Feedback                      │
│  │ Task 2   │  │  ┌────────────────────────────────────┐  │
│  │ Score: ──│  │  │ Great work on implementation...   │  │
│  └──────────┘  │  └────────────────────────────────────┘  │
│                │                                         │
│                │  ─── Soft Skills ──── Avg: 7.5 ───      │
│                │  Accountability [8] Communication [7]   │
│                │  ...                                    │
│                │                                         │
│                │  ─── Development Skills ─── Avg: 8.2 ───│
│                │  Frontend [9]  Backend [7.5]            │
│                │  Prompting [9] Databases [8]            │
│                │  ...                                    │
│                │                                         │
│                │  [        Save Review        ]          │
└────────────────┴─────────────────────────────────────────┘
```

---

## ✅ Acceptance Criteria

1. [ ] Weekly/Monthly toggle added to StudentReviewPage header
2. [ ] Task list in review modal filters by selected period
3. [ ] Development Skills section saves correctly from both Manager and Executive
4. [ ] Manager cannot override Executive reviews (existing behavior preserved)
5. [ ] Both skill categories (Soft + Dev) saved to database
6. [ ] Real-time updates work for both skill types
7. [ ] Terminology consistent across Executive and Manager dashboards

---

## ⏱️ Estimated Effort

| Task | Time |
|------|------|
| Add Weekly/Monthly toggle to StudentReviewPage | 15 min |
| Add task filtering logic | 10 min |
| Testing with Executive login | 10 min |
| Testing with Manager login | 10 min |
| Run database migration | 5 min |
| **Total** | **~50 min** |

---

## 🚀 Implementation Order

1. **Run SQL migration** - Add development_skill_traits column
2. **Add toggle UI** - Weekly/Monthly in StudentReviewPage header
3. **Add filter logic** - Filter tasks by selected period
4. **Test Executive flow** - Login as Tutor and review a student
5. **Test Manager flow** - Login as Mentor and review a student
6. **Verify read-only** - Ensure Manager can't edit Executive reviews

---

## 📝 Notes

- The `StudentReviewPage.tsx` component is **shared** between Executive and Manager dashboards
- Any changes to this file automatically apply to both roles
- The `userRole` context determines if the reviewer is 'executive' or 'manager'
- Lock mechanism prevents Managers from editing Executive reviews

---

*Plan created: January 21, 2026*
