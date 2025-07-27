import { redirect } from "next/navigation";

import { getSession } from "@acme/auth";

export default async function SignUpPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }
  return <div>Sign Up Page</div>;
}
