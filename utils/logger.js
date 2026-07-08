const fs = require('fs');
const { createLogger, format, transports } = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: isProduction
        ? format.json()
        : format.combine(format.colorize(), format.simple())
    }),
    ...(isProduction
      ? []
      : [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
      ]),
  ],
});

module.exports = logger;
