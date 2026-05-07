import express from "express";
import cors from "cors";
import { morganMiddleware } from "../config/morganMiddleware";
import { auth } from "../lib/auth";
import { toNodeHandler } from "better-auth/node";
import { authenticate } from "../middleware/auth.middleware";

export const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/api/me", authenticate, (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json(req.session.user);
});

app.use(morganMiddleware);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
