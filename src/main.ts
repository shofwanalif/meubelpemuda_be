import dotenv from "dotenv";
dotenv.config();
import { logger } from "./config/logging";

import { app } from "./app/app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
