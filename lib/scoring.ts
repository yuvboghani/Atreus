/**
 * INTELLIGENT MATCHING ENGINE
 * 
 * Deterministic scoring matrix with Entry-Level Override.
 * Score = BaseSkillOverlap × EduMultiplier × YoEMultiplier × EntryBoost
 * 
 * The Golden Bypass: Entry-level jobs (new grad, early career, min_yoe ≤ 2)
 * permanently neutralize the YoE penalty, ensuring students and new grads
 * are never unfairly penalized for low corporate experience.
 */

interface JobParsed {
    tech_stack: string[];
    min_yoe: number;
    req_edu: number;       // 1=HS, 2=BS, 3=MS, 4=PhD
    is_entry_level: boolean;
}

interface UserProfile {
    skill_bank: string[];
    edu_level: number;     // 1=HS, 2=BS, 3=MS, 4=PhD
    current_yoe: number;
}

export function calculateMatchScore(jobParsed: JobParsed, userProfile: UserProfile): number {
    // === 1. ATS BASE SCORE (0-100) — Skill overlap percentage ===
    const jobSkills = jobParsed.tech_stack || [];
    const userSkills = userProfile.skill_bank || [];

    let baseScore: number;
    if (jobSkills.length === 0) {
        baseScore = 50; // Neutral if job has no listed skills
    } else {
        const normalizedUser = new Set(userSkills.map(s => s.toLowerCase().trim()));
        const matches = jobSkills.filter(s => normalizedUser.has(s.toLowerCase().trim()));
        baseScore = (matches.length / jobSkills.length) * 100;
    }

    // === 2. EDUCATION MULTIPLIER ===
    const userEdu = userProfile.edu_level ?? 2;
    const reqEdu = jobParsed.req_edu ?? 2;
    const eduMultiplier = userEdu >= reqEdu ? 1.0 : 0.5;

    // === 3. YOE MULTIPLIER & THE GOLDEN BYPASS ===
    const userYoe = userProfile.current_yoe ?? 0;
    const minYoe = jobParsed.min_yoe ?? 0;
    const isEntryLevel = jobParsed.is_entry_level ?? false;

    let yoeMultiplier: number;
    if (isEntryLevel || minYoe <= 2) {
        // THE GOLDEN BYPASS — entry-level jobs never penalize for low YoE
        yoeMultiplier = 1.0;
    } else if (userYoe >= minYoe) {
        yoeMultiplier = 1.0;
    } else if ((minYoe - userYoe) <= 2) {
        yoeMultiplier = 0.8; // Slight miss — still competitive
    } else {
        yoeMultiplier = 0.3; // Heavy penalty for strict senior roles
    }

    // === 4. THE FINAL MATH ===
    let score = baseScore * eduMultiplier * yoeMultiplier;

    // === 5. PRIORITY BOOST — Entry-level jobs get a signal boost ===
    if (isEntryLevel) {
        score *= 1.15;
    }

    // === 6. CAP AT 100 ===
    return Math.min(Math.round(score), 100);
}
