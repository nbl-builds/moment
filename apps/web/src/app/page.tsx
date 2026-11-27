import { redirect } from "next/navigation";
import { businessRoutes } from "@/config/site";

// Consumer web will live here later; for now `/` opens the business portal.
export default function Home() {
  redirect(businessRoutes.welcome);
}
