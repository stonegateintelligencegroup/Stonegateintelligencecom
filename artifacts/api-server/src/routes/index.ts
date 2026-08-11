import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactRouter from "./contact";
import authRouter from "./auth";
import intakeRouter from "./intake";
import adminPortalRouter from "./portal/admin";
import clientPortalRouter from "./portal/client";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactRouter);
router.use(authRouter);
router.use(intakeRouter);
router.use("/portal/admin", adminPortalRouter);
router.use("/portal/client", clientPortalRouter);
router.use(storageRouter);

export default router;
