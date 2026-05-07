import winston from "winston";

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
});

const { combine, timestamp, printf, colorize, align } = winston.format;

const logger = winston.createLogger({
  level: "http",
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    }),
    printf(
      (info) =>
        `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`,
    ),
  ),

  transports: [new winston.transports.Console()],
});

export { logger };
