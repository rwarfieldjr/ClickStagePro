/**
 * EXAMPLE: Idempotent Job Processing with Credit Consumption
 * 
 * This file demonstrates how to use deductCredits with a jobId for idempotent
 * credit consumption in a queue worker or job processor.
 * 
 * It also shows the "safe enqueue" pattern using the check-and-enqueue endpoint.
 * 
 * When you implement your actual job/queue system, use this pattern:
 */

import { storage } from './storage';
import { pool } from './db';

/**
 * Example: Process a photo staging job with idempotent credit consumption
 * 
 * @param jobId - Unique identifier for this job (from your queue system)
 * @param userId - User who owns the staging request
 * @param photoUrl - URL of the photo to stage
 */
export async function processStagingJob(
  jobId: string,
  userId: string, 
  photoUrl: string
) {
  try {
    // Step 1: Deduct credits FIRST with jobId as sourceId
    // Even if job retries/restarts, credits only deducted once
    const result = await storage.deductCredits(
      userId,
      1, // 1 credit per photo
      'photo_staged',
      jobId // CRITICAL: Pass unique job ID as sourceId for idempotency
    );
    
    console.log(`[job ${jobId}] Credits deducted. New balance: ${result.balance.balance}`);
    
    // If threshold crossed, send alert email
    if (result.thresholdCrossed !== undefined) {
      console.log(`[job ${jobId}] Low balance alert: ${result.thresholdCrossed} credits`);
      // TODO: Send email notification
    }
    
    // Step 2: Process the photo staging
    // const stagedImageUrl = await stagePhotoWithAI(photoUrl);
    
    // Step 3: Save the result
    // await saveProcessedPhoto(jobId, stagedImageUrl);
    
    console.log(`[job ${jobId}] Photo staging completed successfully`);
    
  } catch (error: any) {
    // Handle insufficient credits gracefully
    if (error.message === 'Insufficient credits') {
      console.error(`[job ${jobId}] Insufficient credits for user ${userId}`);
      // TODO: Notify user to purchase more credits
      return;
    }
    
    // For other errors, let them bubble up for retry logic
    throw error;
  }
}

/**
 * Example: Batch job processor with retry logic
 */
export async function batchStagingProcessor() {
  // Your queue system would provide these jobs
  const jobs = [
    { id: 'job-abc-123', userId: 'user-1', photoUrl: 'https://...' },
    { id: 'job-def-456', userId: 'user-2', photoUrl: 'https://...' }
  ];
  
  for (const job of jobs) {
    try {
      await processStagingJob(job.id, job.userId, job.photoUrl);
    } catch (error) {
      console.error(`[job ${job.id}] Failed:`, error);
      // Your retry logic here - job will be idempotent on retry
    }
  }
}

/**
 * IMPORTANT: How idempotency works
 * 
 * Scenario 1 - First run:
 * - deductCredits(userId, 1, 'photo_staged', 'job-123')
 * - Inserts ledger row with source_id='job-123'
 * - Deducts 1 credit: 10 → 9
 * - Returns balance: 9
 * 
 * Scenario 2 - Retry/restart (same job):
 * - deductCredits(userId, 1, 'photo_staged', 'job-123')
 * - Tries to insert ledger row with source_id='job-123'
 * - Database rejects (unique constraint violation)
 * - Catches error 23505, fetches existing transaction
 * - Returns balance: 9 (unchanged!)
 * - NO DOUBLE DEDUCTION ✓
 */

/**
 * PATTERN: Safe Enqueue from Client/API
 * 
 * Use the /api/credits/check-and-enqueue endpoint to check credits 
 * before enqueueing jobs from the UI/HTTP layer:
 */

// Example client-side usage (from React component or API route):
/*
async function enqueuePhotoStaging(photoUrl: string) {
  const response = await fetch('/api/credits/check-and-enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      count: 1,
      photoUrl // Pass any job params you need
    })
  });

  const data = await response.json();
  
  if (data.ok) {
    console.log(`Job enqueued: ${data.jobId}, Balance: ${data.balance}`);
    // Show success message to user
    return data.jobId;
  } else {
    console.error('Insufficient credits');
    // Redirect user to purchase page
    throw new Error(data.error);
  }
}
*/

/**
 * FLOW SUMMARY:
 * 
 * 1. CLIENT (UI/HTTP):
 *    POST /api/credits/check-and-enqueue
 *    → Soft check: Do you have enough credits?
 *    → If yes: Enqueue job, return jobId
 *    → If no: Return 402 error
 * 
 * 2. WORKER (Queue processor):
 *    → Receives job with jobId
 *    → Calls deductCredits(userId, 1, 'photo_staged', jobId)
 *    → Hard deduction with idempotency protection
 *    → Process photo staging
 *    → Save result
 * 
 * This pattern prevents:
 * - Enqueueing jobs when user has no credits (early validation)
 * - Double-charging on job retries (idempotent consumption)
 * - Race conditions (database-level unique constraint)
 */
