import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { subscribe } from "../controllers/subscribe.controller.js";

const router = Router();
router.route("/subscribe").post(verifyJWT, subscribe);
export default router;
