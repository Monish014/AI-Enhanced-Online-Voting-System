const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/response');

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';

// ─── Create Election ──────────────────────────────────────────────────────────
const createElection = async (req, res, next) => {
  try {
    const { title, description, startTime, endTime, isPublicResults } = req.body;

    const election = await Election.create({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isPublicResults: isPublicResults || false,
      createdBy: req.userId,
    });

    await AuditLog.create({
      userId: req.userId,
      action: 'ELECTION_CREATED',
      ipAddress: getIp(req),
      metadata: { electionId: election._id, title },
    });

    // Notify admin dashboard via socket
    req.app.get('io')?.to('admin-room').emit('election-update', {
      action: 'created',
      election: { id: election._id, title, status: election.status },
    });

    return sendSuccess(res, 201, 'Election created successfully.', election);
  } catch (err) {
    next(err);
  }
};

// ─── Get All Elections ────────────────────────────────────────────────────────
const getAllElections = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [elections, total] = await Promise.all([
      Election.find(filter)
        .populate('candidates', 'name party symbol imageUrl')
        .populate('createdBy', 'name email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Election.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Elections retrieved.', {
      elections,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Election ──────────────────────────────────────────────────────
const getElectionById = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates', 'name party symbol imageUrl bio')
      .populate('createdBy', 'name')
      .lean();

    if (!election) return sendError(res, 404, 'Election not found.');

    return sendSuccess(res, 200, 'Election retrieved.', election);
  } catch (err) {
    next(err);
  }
};

// ─── Update Election ──────────────────────────────────────────────────────────
const updateElection = async (req, res, next) => {
  try {
    const { title, description, startTime, endTime, isPublicResults } = req.body;
    const update = {};
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (startTime) update.startTime = new Date(startTime);
    if (endTime) update.endTime = new Date(endTime);
    if (isPublicResults !== undefined) update.isPublicResults = isPublicResults;

    const election = await Election.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!election) return sendError(res, 404, 'Election not found.');

    await AuditLog.create({
      userId: req.userId,
      action: 'ELECTION_UPDATED',
      ipAddress: getIp(req),
      metadata: { electionId: election._id, changes: update },
    });

    req.app.get('io')?.to('admin-room').emit('election-update', {
      action: 'updated',
      election: { id: election._id, title: election.title, status: election.status },
    });

    return sendSuccess(res, 200, 'Election updated.', election);
  } catch (err) {
    next(err);
  }
};

// ─── Delete Election ──────────────────────────────────────────────────────────
const deleteElection = async (req, res, next) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return sendError(res, 404, 'Election not found.');
    if (election.status === 'active') {
      return sendError(res, 400, 'Cannot delete an active election.');
    }

    await Candidate.deleteMany({ electionId: election._id });
    await election.deleteOne();

    await AuditLog.create({
      userId: req.userId,
      action: 'ELECTION_DELETED',
      ipAddress: getIp(req),
      metadata: { electionId: election._id, title: election.title },
    });

    req.app.get('io')?.to('admin-room').emit('election-update', {
      action: 'deleted',
      election: { id: election._id },
    });

    return sendSuccess(res, 200, 'Election and its candidates deleted.');
  } catch (err) {
    next(err);
  }
};

// ─── Get Candidates for Election ──────────────────────────────────────────────
const getCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ electionId: req.params.id }).lean();
    return sendSuccess(res, 200, 'Candidates retrieved.', candidates);
  } catch (err) {
    next(err);
  }
};

// ─── Add Candidate ────────────────────────────────────────────────────────────
const addCandidate = async (req, res, next) => {
  try {
    const { name, party, symbol, bio } = req.body;
    const electionId = req.params.id;

    const election = await Election.findById(electionId);
    if (!election) return sendError(res, 404, 'Election not found.');
    if (election.status === 'ended') {
      return sendError(res, 400, 'Cannot add candidates to an ended election.');
    }

    const imageUrl = req.file
      ? `/uploads/candidates/${req.file.filename}`
      : null;

    const candidate = await Candidate.create({ name, party, symbol, bio, imageUrl, electionId });

    // Push candidate ref into election
    await Election.findByIdAndUpdate(electionId, { $push: { candidates: candidate._id } });

    await AuditLog.create({
      userId: req.userId,
      action: 'CANDIDATE_ADDED',
      ipAddress: getIp(req),
      metadata: { electionId, candidateId: candidate._id, name },
    });

    return sendSuccess(res, 201, 'Candidate added.', candidate);
  } catch (err) {
    next(err);
  }
};

// ─── Update Candidate ─────────────────────────────────────────────────────────
const updateCandidate = async (req, res, next) => {
  try {
    const { name, party, symbol, bio } = req.body;
    const update = {};
    if (name) update.name = name;
    if (party !== undefined) update.party = party;
    if (symbol !== undefined) update.symbol = symbol;
    if (bio !== undefined) update.bio = bio;
    if (req.file) update.imageUrl = `/uploads/candidates/${req.file.filename}`;

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.candidateId,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!candidate) return sendError(res, 404, 'Candidate not found.');

    return sendSuccess(res, 200, 'Candidate updated.', candidate);
  } catch (err) {
    next(err);
  }
};

// ─── Delete Candidate ─────────────────────────────────────────────────────────
const deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.candidateId);
    if (!candidate) return sendError(res, 404, 'Candidate not found.');
    await Election.findByIdAndUpdate(req.params.id, { $pull: { candidates: candidate._id } });
    return sendSuccess(res, 200, 'Candidate removed.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createElection, getAllElections, getElectionById,
  updateElection, deleteElection,
  getCandidates, addCandidate, updateCandidate, deleteCandidate,
};
