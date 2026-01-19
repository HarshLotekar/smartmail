import express from "express";
import { summarizeEmail, suggestReply, draftEmail, analyzeTone, batchLabelEmails, classifyDecision, ensureDecisionLabel } from "../controllers/ai.controller.js";
const router = express.Router();

// POST /api/ai/summarize - Generate AI summary for email content
router.post("/summarize", summarizeEmail);
// POST /api/ai/reply - Generate AI reply suggestions
router.post("/reply", suggestReply);
// POST /api/ai/draft - Draft email with AI
router.post("/draft", draftEmail);
// POST /api/ai/analyze-tone - Analyze tone and generate contextual replies
router.post("/analyze-tone", analyzeTone);
// POST /api/ai/batch-label - Batch label multiple emails with improved AI prompt
router.post("/batch-label", batchLabelEmails);
// POST /api/ai/classify-decision - Classify if email requires action/decision
router.post("/classify-decision", classifyDecision);
// POST /api/ai/ensure-decision-label - Create or get SMARTMAIL_DECISION Gmail label
router.post("/ensure-decision-label", ensureDecisionLabel);

export default router;