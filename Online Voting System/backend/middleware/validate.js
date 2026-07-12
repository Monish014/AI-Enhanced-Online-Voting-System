const { validationResult } = require('express-validator');

/**
 * Runs express-validator checks and short-circuits with 422 if any fail.
 * Place this after your validation chain:
 *   router.post('/login', [...loginRules], validate, loginController)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      data: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;
