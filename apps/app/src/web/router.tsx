import { createRouter } from "@tanstack/react-router";

import { rootRoute } from "@/web/routes/__root";
import { indexRoute } from "@/web/routes/index";

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
