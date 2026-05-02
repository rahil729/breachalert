/**
 * Queue Worker System for Background Jobs
 * Handles rate-limited processing of breach scans
 */

const { getCache, setCache, deleteCache, isRedisConnected } = require("./redis");

const QUEUE_KEYS = {
  PENDING: "queue:pending",
  PROCESSING: "queue:processing",
  COMPLETED: "queue:completed",
};

const QUEUE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

/**
 * Add a job to the queue
 * @param {string} jobType - Type of job (e.g., "scan", "alert")
 * @param {object} jobData - Job data payload
 * @returns {Promise<string>} - Job ID
 */
async function addJob(jobType, jobData) {
  const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job = {
    id: jobId,
    type: jobType,
    data: jobData,
    status: QUEUE_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  await setCache(`${QUEUE_KEYS.PENDING}:${jobId}`, job, 86400); // 24 hour TTL
  return jobId;
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<object|null>} - Job object
 */
async function getJob(jobId) {
  // Check pending queue
  let job = await getCache(`${QUEUE_KEYS.PENDING}:${jobId}`);
  if (job) return job;

  // Check processing queue
  job = await getCache(`${QUEUE_KEYS.PROCESSING}:${jobId}`);
  if (job) return job;

  // Check completed queue
  job = await getCache(`${QUEUE_KEYS.COMPLETED}:${jobId}`);
  return job;
}

/**
 * Get queue statistics
 * @returns {Promise<object>} - Queue stats
 */
async function getQueueStats() {
  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  // Note: In a production system, you'd use Redis SCAN to count
  // For now, just return basic info
  stats.redisConnected = isRedisConnected();
  
  return stats;
}

/**
 * Process jobs in the queue (for background worker)
 * @param {Function} handler - Job handler function
 * @param {number} concurrency - Max concurrent jobs
 */
async function processQueue(handler, concurrency = 1) {
  console.log(`Processing queue with concurrency: ${concurrency}`);
  // Queue processing logic would run here
  // This is a placeholder for the background worker
}

/**
 * Mark job as completed
 * @param {string} jobId - Job ID
 * @param {object} result - Job result
 */
async function completeJob(jobId, result) {
  const job = await getCache(`${QUEUE_KEYS.PROCESSING}:${jobId}`);
  if (!job) return;

  job.status = QUEUE_STATUS.COMPLETED;
  job.result = result;
  job.completedAt = new Date().toISOString();

  await deleteCache(`${QUEUE_KEYS.PROCESSING}:${jobId}`);
  await setCache(`${QUEUE_KEYS.COMPLETED}:${jobId}`, job, 86400);
}

/**
 * Mark job as failed
 * @param {string} jobId - Job ID
 * @param {string} error - Error message
 */
async function failJob(jobId, error) {
  const job = await getCache(`${QUEUE_KEYS.PROCESSING}:${jobId}`);
  if (!job) return;

  job.status = QUEUE_STATUS.FAILED;
  job.error = error;
  job.completedAt = new Date().toISOString();

  await deleteCache(`${QUEUE_KEYS.PROCESSING}:${jobId}`);
  await setCache(`${QUEUE_KEYS.COMPLETED}:${jobId}`, job, 86400);
}

module.exports = {
  addJob,
  getJob,
  getQueueStats,
  processQueue,
  completeJob,
  failJob,
  QUEUE_STATUS,
};
