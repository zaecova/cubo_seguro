import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cyberRouter from "./cyber";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cyberRouter);

export default router;
