import { createFileRoute } from "@tanstack/react-router";
import TutorApp from "@/components/TutorApp";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <TutorApp />;
}
