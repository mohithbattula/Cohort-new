# Understanding & Implementation Plan: Separating Student Review and Task Review

## 📋 My Understanding

Based on your feedback and the screenshots, I understand that the current implementation has **mixed concerns**. Here's my understanding of what you want:

---

## 🎯 Current State (Problem)

The current **"Student Review"** page in the sidebar contains:
- Student list
- Task selection (per student)
- Task Score (0-10)
- Review / Feedback
- Improvements
- **Soft Skills scoring** ❌ (Should NOT be here)
- **Development Skills scoring** ❌ (Should NOT be here)

Everything is bundled together, which is confusing.

---

## ✅ Desired State (Solution)

You want **THREE separate concepts**:

### 1. **Task Review** (Renamed from current "Student Review")
- **Location:** Under "Project Documents" in sidebar
- **Purpose:** Review individual tasks assigned to students
- **Contains:**
  - Task Score (0-10)
  - Review / Feedback text
  - Improvements text
- **NO skills assessment here** - just task-specific feedback

### 2. **Student Review** (NEW Purpose)
- **Location:** Keep in sidebar under "COHORT" section
- **Purpose:** Overall student performance scoring on **Weekly** and **Monthly** basis
- **Contains:**
  - **Soft Skills** scoring (10 traits)
  - **Development Skills** scoring (9 traits)
  - Weekly/Monthly toggle to view/add scores for different periods
- **NOT tied to individual tasks** - this is an overall assessment of the student

### 3. **Student View (My Review page)**
- **Location:** Student Dashboard
- **Purpose:** Student views their own scores
- **Contains:**
  - Weekly/Monthly toggle
  - Skills tab showing: Soft Skills + Development Skills averages
  - Score/Review/Improvements for their tasks

---

## 📊 Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIDEBAR STRUCTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COHORT                                                         │
│  ├── Dashboard                                                  │
│  ├── Org Hierarchy                                              │
│  ├── Announcements                                              │
│  ├── Messages                                                   │
│  └── Student Review  ←── Overall Skills Scoring (Weekly/Monthly)│
│                                                                 │
│  CURRENT PROJECT                                                │
│  ├── Project 1                                                  │
│  │   ├── Students                                               │
│  │   ├── All Project Tasks                                      │
│  │   ├── Team Performance                                       │
│  │   ├── Project Hierarchy                                      │
│  │   ├── Project Documents                                      │
│  │   └── Task Review  ←── Per-Task Scoring (NEW)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 What Each Page Contains

### **Student Review Page** (Skills Assessment - Weekly/Monthly)

```
┌────────────────────────────────────────────────────────────────┐
│  Student Review               [ Weekly ] [ Monthly ]            │
│  Assess student skills for the selected period                 │
├────────────────────────────────────────────────────────────────┤
│  All Students (12)                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1  Alex Johnson      alex@ex.com    [Student]   →        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

        ↓ Click on student → Opens Modal

┌─ Skills Assessment Modal ──────────────────────────────────────┐
│  Alex Johnson - Weekly Assessment                        [X]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ─── Soft Skills (0-10) ──────────────────────── Avg: 7.5 ─── │
│  Accountability [8]  Communication [7]  Learnability [8]       │
│  ...                                                           │
│                                                                │
│  ─── Development Skills (0-10) ────────────────── Avg: 8.2 ── │
│  Frontend [9]  Backend [7.5]  Prompting [9]  Databases [8]     │
│  ...                                                           │
│                                                                │
│  [        Save Skills Assessment        ]                      │
└────────────────────────────────────────────────────────────────┘
```

### **Task Review Page** (Per-Task Feedback)

```
┌────────────────────────────────────────────────────────────────┐
│  Task Review                  [ Weekly ] [ Monthly ]            │
│  Review individual student tasks                               │
├────────────────────────────────────────────────────────────────┤
│  All Students (12)                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1  Alex Johnson      alex@ex.com    [Student]   →        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

        ↓ Click on student → Opens Modal

┌─ Task Review Modal ────────────────────────────────────────────┐
│  Review: Alex Johnson                                    [X]   │
│  Select a task to grade                                        │
├────────────────┬───────────────────────────────────────────────┤
│ Select Task    │  Reviewing: Assignment 1                      │
│ [Last 7 days]  │                                               │
│ ┌────────────┐ │  Task Score (0-10): ████████ 8.0              │
│ │ Task 1     │ │                                               │
│ │ Score: 8   │ │  Review / Feedback:                           │
│ ├────────────┤ │  ┌──────────────────────────────────────────┐ │
│ │ Task 2     │ │  │ Great work on the implementation...     │ │
│ │ Score: ──  │ │  └──────────────────────────────────────────┘ │
│ └────────────┘ │                                               │
│                │  Improvements:                                 │
│                │  ┌──────────────────────────────────────────┐ │
│                │  │ Focus on code documentation...           │ │
│                │  └──────────────────────────────────────────┘ │
│                │                                               │
│                │  [        Save Task Review        ]           │
│                │  NO SKILLS SCORING HERE                       │
└────────────────┴───────────────────────────────────────────────┘
```

---

## 🗂️ Database Changes

### Current `student_task_reviews` Table
- Used for **per-task** reviews
- Keep: `score`, `review`, `improvements`
- **REMOVE** from task context: `soft_skill_traits`, `development_skill_traits`

### New `student_skills_assessments` Table (Proposed)
For storing **periodic skills assessments** (weekly/monthly):

```sql
CREATE TABLE student_skills_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) NOT NULL,
    reviewer_role TEXT NOT NULL,  -- 'executive' or 'manager'
    period_type TEXT NOT NULL,    -- 'weekly' or 'monthly'
    period_start DATE NOT NULL,   -- Start date of the week/month
    period_end DATE NOT NULL,     -- End date of the week/month
    soft_skill_traits JSONB DEFAULT '{}',
    soft_skills_score NUMERIC(4,2) DEFAULT 0,
    development_skill_traits JSONB DEFAULT '{}',
    development_skills_score NUMERIC(4,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, period_type, period_start)  -- One assessment per student per period
);
```

---

## 📋 Implementation Steps

### Step 1: Create New Database Table
- Create `student_skills_assessments` table for periodic skills scoring
- Keep `student_task_reviews` for task-specific reviews only

### Step 2: Create New `TaskReviewPage.tsx`
- Copy current `StudentReviewPage.tsx`
- **REMOVE** Soft Skills and Development Skills sections
- Keep only: Task Score, Review, Improvements
- Place under Project section in sidebar

### Step 3: Modify `StudentReviewPage.tsx`
- **REMOVE** task selection
- **REMOVE** task score/review/improvements
- **ADD** Weekly/Monthly period selection
- **ADD** Soft Skills assessment form
- **ADD** Development Skills assessment form
- Save to new `student_skills_assessments` table

### Step 4: Update Sidebar Navigation
- COHORT section: "Student Review" → Skills Assessment (Weekly/Monthly)
- PROJECT section: Add "Task Review" → Per-task scoring

### Step 5: Update Student View (`MyReviewPage.tsx`)
- Skills tab: Fetch from `student_skills_assessments` table
- Score/Review/Improvements: Fetch from `student_task_reviews` table

---

## ✅ Acceptance Criteria

1. [ ] "Student Review" in sidebar opens skills assessment page (weekly/monthly)
2. [ ] "Task Review" in sidebar (under Project) opens per-task review page
3. [ ] Skills are scored at student level, NOT per task
4. [ ] Tasks are scored individually with score/review/improvements only
5. [ ] Weekly/Monthly toggle works for both pages
6. [ ] Student can view both their skills and task scores in "My Review"

---

## ⏱️ Estimated Effort

| Task | Time |
|------|------|
| Create database table | 10 min |
| Create TaskReviewPage component | 20 min |
| Modify StudentReviewPage for skills only | 25 min |
| Update sidebar navigation | 10 min |
| Update student view | 15 min |
| Testing | 20 min |
| **Total** | **~1.5-2 hours** |

---

## ❓ Questions Before Proceeding

1. **Task Review location:** Should it be under "Project Documents" or a separate menu item under PROJECT?
2. **Skills Assessment timing:** When assessing weekly, should the system auto-detect the current week, or let the reviewer pick which week?
3. **Existing data:** Do you want me to migrate existing soft_skill_traits from task reviews to the new skills assessment table?

---

*Plan created: January 21, 2026*

**Please confirm this understanding is correct, and I'll proceed with the implementation.**
