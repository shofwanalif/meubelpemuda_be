import express from "express";
import cors from "cors";
import { config } from "../../config";
import { morganMiddleware } from "../config/morganMiddleware";
import { auth } from "../lib/auth";
import { toNodeHandler } from "better-auth/node";
import { authenticate } from "../middleware/auth.middleware";
import branchRouter from "./branches/branch.route";
import userRouter from "./user/user.route";
import productRouter from "./product/product.route";
import { salesRouter } from "./sales/sales.route";

export const app = express();

app.set("trust proxy", 1);

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    config.CLIENT_ORIGIN,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(morganMiddleware);

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CLIENT_ORIGIN:", config.CLIENT_ORIGIN);
console.log("COOKIE_DOMAIN:", config.COOKIE_DOMAIN);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/me", authenticate, (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json(req.session.user);
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use("/api/branches", branchRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/sales", salesRouter);
