// Resume-writing + ATS guidance distilled from the MIT-licensed
// paramchoudhary/resumeskills agent skills (resume-ats-optimizer,
// resume-bullet-writer, job-description-analyzer). Injected into the AI prompts so
// generated resumes are ATS-optimized and scoring uses real ATS criteria.

export const ATS_WRITING_GUIDELINES = `ATS & writing rules (follow strictly):
- Keywords: identify the job description's hard skills (tools, languages, certifications, methodologies), soft skills, and industry/domain terms. Weave the most important ones naturally into the summary, the skills and tools lists, and the experience bullets. Repeat each critical keyword 2-4 times across the resume — never keyword-stuff. Use the exact terms from the job description, not paraphrases.
- Summary: 3-5 sentences, front-loaded with the 5-8 most important keywords for the target role; highlight years of experience, top relevant skills, and 1-2 quantified achievements.
- Experience bullets: use the X-Y-Z formula — "Accomplished [X] as measured by [Y] by doing [Z]". Every bullet starts with a strong action verb (e.g. Led, Directed, Spearheaded, Built, Launched, Streamlined, Optimized, Reduced, Increased, Scaled, Resolved) and includes at least one quantified metric (%, $, count, or time) plus the scope (team size, users, budget). Never write duties ("Responsible for…", "Helped with…") — write achievements with impact. Keep bullets to 1-2 lines and naturally written.`;

export const ATS_SCORING_GUIDELINES = `Scoring method (apply consistently):
- Extract the job description's keywords into three buckets: hard skills (tools, languages, certifications, methodologies), soft skills, and industry/domain terms.
- Distinguish REQUIRED keywords ("must have", "required", "X years", listed under Requirements, or mentioned 3+ times) from PREFERRED ("nice to have", "bonus", "a plus", mentioned once).
- score = weighted keyword coverage on a 0-100 scale where REQUIRED keywords carry ~70% weight and PREFERRED ~30%. Bands: 90-100 overqualified, 75-89 excellent fit, 60-74 good fit, 50-59 stretch, below 50 under-qualified.
- matchedKeywords / missingKeywords: list REQUIRED keywords first.
- suggestions: concrete edits that insert missing REQUIRED keywords into the summary, the skills list, or a specific experience bullet.`;
