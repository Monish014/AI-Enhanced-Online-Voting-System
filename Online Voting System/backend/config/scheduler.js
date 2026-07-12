const cron = require('node-cron');
const Election = require('../models/Election');

/**
 * Runs every minute to auto-transition election statuses.
 * upcoming → active when startTime is reached
 * active   → ended  when endTime is reached
 */
const updateElectionStatuses = async () => {
  try {
    const now = new Date();

    // Activate elections that have reached their start time
    const activated = await Election.updateMany(
      { status: 'upcoming', startTime: { $lte: now } },
      { $set: { status: 'active' } }
    );

    // End elections that have passed their end time
    const ended = await Election.updateMany(
      { status: 'active', endTime: { $lte: now } },
      { $set: { status: 'ended' } }
    );

    if (activated.modifiedCount > 0 || ended.modifiedCount > 0) {
      console.log(
        `[Cron] Elections updated — activated: ${activated.modifiedCount}, ended: ${ended.modifiedCount}`
      );
    }
  } catch (err) {
    console.error('[Cron] updateElectionStatuses error:', err.message);
  }
};

const scheduleCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', updateElectionStatuses);
  console.log('[Cron] Election status scheduler started');
};

module.exports = { scheduleCronJobs };
