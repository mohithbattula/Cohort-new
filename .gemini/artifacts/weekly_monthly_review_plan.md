# Implementation Plan: Weekly & Monthly Score Views for My Review Page

## 🎯 Objective

Add **Weekly** and **Monthly** toggle buttons to the student's "My Review" page, allowing students to filter and view their task scores grouped by the selected time period.

---

## 📸 Current State (Reference)

The current "My Review" page displays:
- Tab cards: Score, Review, Improvements, Soft Skills
- A task list table with columns: #, Task, Given By, Score
- No time-based filtering exists

---

## 📋 Implementation Steps

### Step 1: Add State for Time Period Selection

**File:** `components/employee/pages/MyReviewPage.tsx`

Add a new state variable to track the selected view period:

```tsx
const [viewPeriod, setViewPeriod] = useState<'weekly' | 'monthly'>('weekly');
```

**Rationale:** Default to 'weekly' for a more granular initial view that shows recent performance.

---

### Step 2: Create Toggle Button UI Component

**Location:** Position between the tab cards and the task list table.

**Design Requirements:**
- Segmented control style (two connected buttons)
- Active state: Solid background color (e.g., `#f59e0b` amber or existing accent)
- Inactive state: Transparent with border
- Rounded corners for premium look
- Smooth transition on hover/click

**Example JSX:**

```tsx
<div style={{
  display: 'flex',
  gap: '0',
  marginBottom: '24px',
  backgroundColor: '#f1f5f9',
  borderRadius: '12px',
  padding: '4px',
  width: 'fit-content'
}}>
  <button
    onClick={() => setViewPeriod('weekly')}
    style={{
      padding: '10px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: viewPeriod === 'weekly' ? '#f59e0b' : 'transparent',
      color: viewPeriod === 'weekly' ? 'white' : '#64748b',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    Weekly
  </button>
  <button
    onClick={() => setViewPeriod('monthly')}
    style={{
      padding: '10px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: viewPeriod === 'monthly' ? '#f59e0b' : 'transparent',
      color: viewPeriod === 'monthly' ? 'white' : '#64748b',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    Monthly
  </button>
</div>
```

---

### Step 3: Implement Date Filtering Logic

**Filter Function:**

```tsx
const filterReviewsByPeriod = (reviews: any[], period: 'weekly' | 'monthly') => {
  const now = new Date();
  let startDate: Date;

  if (period === 'weekly') {
    // Last 7 days
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    // Last 30 days
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return reviews.filter(review => {
    const reviewDate = new Date(review.created_at || review.updated_at);
    return reviewDate >= startDate;
  });
};
```

**Usage:**

```tsx
const filteredReviews = filterReviewsByPeriod(allReviews, viewPeriod);
```

---

### Step 4: Update Summary Statistics

The statistics displayed (overall score, soft skills average) must recalculate based on filtered reviews.

**Before:**
```tsx
// Uses all reviews
const overallAverage = calculateAverage(allReviews);
```

**After:**
```tsx
// Uses filtered reviews
const filteredReviews = filterReviewsByPeriod(allReviews, viewPeriod);
const overallAverage = calculateAverage(filteredReviews);
```

**Components to Update:**
- Score card display
- Soft Skills section (pass filtered data)
- Any chart or progress indicators

---

### Step 5: Update Task List Display

The task list table should only show reviews from the selected time period.

**Additional Enhancement (Optional):**
Add a date column or group by week/month:

| # | Task | Date | Given By | Score |
|---|------|------|----------|-------|
| 1 | Task A | Jan 20 | Tutor | 9/10 |
| 2 | Task B | Jan 18 | Mentor | 7.5/10 |

---

### Step 6: Handle Empty States

If no reviews exist for the selected period, show a friendly message:

```tsx
{filteredReviews.length === 0 ? (
  <div style={{
    textAlign: 'center',
    padding: '48px',
    color: '#94a3b8'
  }}>
    <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
      No reviews found for this {viewPeriod === 'weekly' ? 'week' : 'month'}.
    </p>
    <p style={{ fontSize: '0.9rem' }}>
      Keep up the great work! New reviews will appear here.
    </p>
  </div>
) : (
  // Render task list
)}
```

---

## 🗂️ Files to Modify

| File | Changes |
|------|---------|
| `components/employee/pages/MyReviewPage.tsx` | Add state, toggle UI, filter logic, update stats calculation |

---

## 🎨 UI Mockup

```
┌────────────────────────────────────────────────────────────┐
│  My Review                                                 │
│  Track your performance across tasks and soft skills       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [★ Score]  [📝 Review]  [📈 Improvements]  [🎓 Soft Skills] │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│         ┌────────────┬────────────┐                        │
│         │   Weekly   │  Monthly   │   ← NEW TOGGLE         │
│         └────────────┴────────────┘                        │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  #    Task                    Given By         Score       │
├────────────────────────────────────────────────────────────┤
│  1    saddtvfd                 [Tutor]         9/10        │
│  2    dvdfewcf vf              [Tutor]         3.5/10      │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ Acceptance Criteria

1. [ ] Toggle buttons (Weekly/Monthly) are visible and styled correctly
2. [ ] Clicking a toggle updates the view immediately
3. [ ] Task list filters based on selected period
4. [ ] Summary statistics recalculate based on filtered data
5. [ ] Empty state message shows when no reviews exist for period
6. [ ] Real-time updates continue to work with filtering
7. [ ] Mobile responsive design maintained

---

## ⏱️ Estimated Effort

| Task | Time |
|------|------|
| Add state and toggle UI | 15 min |
| Implement filter logic | 10 min |
| Update stats calculation | 10 min |
| Handle empty states | 5 min |
| Testing & polish | 15 min |
| **Total** | **~55 min** |

---

## 🚀 Next Steps

1. Review and approve this plan
2. Implement changes in `MyReviewPage.tsx`
3. Test with real review data
4. Verify mobile responsiveness
5. Deploy

---

*Plan created: January 21, 2026*
