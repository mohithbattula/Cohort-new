# Implementation Plan: Dynamic Skills Assessment with Selectable Traits

## 1. Objective
Refactor the Skills Assessment system to allow reviewers (Tutors/Mentors) to select a subset of traits to score for any given period (Weekly/Monthly). Traits that are not selected (unchecked) must be excluded from the average calculation and not treated as zero.

## 2. Core Concepts
- **Selectable Traits**: Each trait in "Soft Skills" and "Development Skills" will have a checkbox.
- **Dynamic Averaging**: 
  - `Average = (Sum of Scored Traits) / (Number of Selected Traits)`
- **Data Integrity**: Non-selected traits will be stored as `null` or omitted from the score calculation, ensuring they don't penalize the student's overall performance.

---

## 3. Implementation Workflow

### Phase 1: Database Verification
The existing `student_skills_assessments` table uses `JSONB` for `soft_skill_traits` and `development_skill_traits`. This is flexible enough to store our data.
- **Update Logic**: When saving, we will ensure that only traits with an "enabled" status contribute to the `soft_skills_score` and `development_skills_score` columns.
- **Storage Strategy**: We will store traits as:
  ```json
  {
    "Communication": 8.5,
    "English": null,
    "Accountability": 9.0
  }
  ```
  (Where `null` indicates the trait was not assessed this week).

### Phase 2: Reviewer UI Enhancements (`StudentReviewPage.tsx`)
1. **New Form State**:
   - `enabledSoftSkills`: A Set or Record of trait names that are checked.
   - `softSkillScores`: Updated to handle `number | null`.
2. **UI Components**:
   - Add a checkbox next to each trait name.
   - The number input for a trait should be **disabled** unless the checkbox is checked.
   - Real-time Average Display: Calculate the average on the fly based only on checked items.
3. **Validation**:
   - Prevent saving if "0" traits are selected (at least one skill must be assessed).

### Phase 3: Calculation Logic
```typescript
const calculateDynamicAverage = (scores: Record<string, number | null>) => {
    const activeScores = Object.values(scores).filter(v => v !== null) as number[];
    if (activeScores.length === 0) return 0;
    const sum = activeScores.reduce((a, b) => a + b, 0);
    return parseFloat((sum / activeScores.length).toFixed(1));
};
```

### Phase 4: Student View Updates (`MyReviewPage.tsx`)
- **Filtered Display**: In the "Skills" tab, only traits that have a non-null score will be displayed.
- **Contextual Average**: The average shown to the student will match the reviewer's calculation (e.g., "Average: 8.5 (based on 8 traits)").

---

## 4. Example Scenario
**Tutor assesses a student for Week 3:**
1. Checkmarks **8 out of 10** Soft Skill traits.
2. Leaves "English" and "Curiosity" unchecked (not observed this week).
3. Enters scores for the 8 traits (Total sum: 72).
4. **Resulting Calculation**: $72 / 8 = 9.0$.
5. **Database**: `soft_skills_score` is saved as `9.0`. Traits `English` and `Curiosity` are stored as `null`.
6. **Student Portal**: Student sees 8 bars in their chart, and an overall average of 9.0.

## 5. Next Steps
1. Modify `StudentReviewPage.tsx` to add checkbox logic and updated averaging.
2. Update `MyReviewPage.tsx` to hide `null` scored traits.
