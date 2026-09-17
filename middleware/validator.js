const { body, param, query, validationResult } = require('express-validator');

const validateScore = [
  body('playerName')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Player name must be 1-20 characters')
    .matches(/^[a-zA-Z0-9 _-]+$/)
    .withMessage('Player name may only contain letters, numbers, spaces, underscores, hyphens'),
  body('score')
    .isInt({ min: 0, max: 9999999 })
    .withMessage('Score must be a non-negative integer up to 9,999,999'),
  body('stats')
    .optional()
    .isObject()
    .withMessage('Stats must be an object'),
  body('stats.playtime_seconds')
    .optional()
    .isInt({ min: 0 })
    .withMessage('playtime_seconds must be a non-negative integer'),
  body('stats.total_jumps')
    .optional()
    .isInt({ min: 0 })
    .withMessage('total_jumps must be a non-negative integer'),
  body('stats.total_dashes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('total_dashes must be a non-negative integer'),
  body('stats.obstacles_avoided')
    .optional()
    .isInt({ min: 0 })
    .withMessage('obstacles_avoided must be a non-negative integer'),
  body('stats.death_reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('death_reason must be a string up to 50 chars'),
  body('stats.powerups_collected')
    .optional()
    .isInt({ min: 0 })
    .withMessage('powerups_collected must be a non-negative integer'),
];

const validateLeaderboardQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
  query('page')
    .optional().isInt({ min: 1, max: 10000 })
    .withMessage('page must be a positive integer'),
  query('pageSize')
    .optional().isInt({ min: 1, max: 50 })
    .withMessage('pageSize must be between 1 and 50'),
];

const validatePlayerId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Player ID must be a positive integer'),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = { validateScore, validateLeaderboardQuery, validatePlayerId, handleValidationErrors };
