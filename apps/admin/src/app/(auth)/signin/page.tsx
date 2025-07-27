import { redirect } from "next/navigation";

import { getSession } from "@acme/auth";

export default async function SignInPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }
  return <div>SignInPage</div>;
}
