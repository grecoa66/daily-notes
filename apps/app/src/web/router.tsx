import { createRouter } from "@tanstack/react-router";

import { rootRoute } from "@/web/routes/__root";
import { indexRoute } from "@/web/routes/index";
import { resetPasswordRoute } from "@/web/routes/reset-password";

const routeTree = rootRoute.addChildren([indexRoute, resetPasswordRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
