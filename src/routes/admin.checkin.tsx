import { createFileRoute } from "@tanstack/react-router";
import { CheckinValidator } from "@/components/checkin/CheckinValidator";

export const Route = createFileRoute("/admin/checkin")({
  head: () => ({
    meta: [
      { title: "Validação / Check-in — Admin Way Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckinPage,
});

function CheckinPage() {
  return <CheckinValidator />;
}
