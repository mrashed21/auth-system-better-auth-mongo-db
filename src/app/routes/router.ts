import { Router } from "express";
import { auth_router } from "../modules/auth/auth.route";
import { health_router } from "../modules/health/health.route";

const router: Router = Router();
const modelRouters = [
  {
    path: "/auth",
    route: auth_router,
  },
  {
    path: "/health",
    route: health_router,
  },
];
modelRouters.forEach((route) => router.use(route.path, route.route));
export default router;
