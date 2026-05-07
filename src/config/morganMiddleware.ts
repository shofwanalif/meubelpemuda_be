import morgan from "morgan";
import { logger } from "./logging";

export const morganMiddleware = morgan(
  ":method :url :status :response-time ms",
  {
    stream: {
      write: (message) => {
        logger.http(message.trim());
      },
    },
  },
);
