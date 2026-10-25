import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/editions/epaper")({
  beforeLoad: () => {
    throw redirect({ to: "/epaper" });
  },
  component: () => null,
});
