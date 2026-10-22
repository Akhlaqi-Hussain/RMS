import { redirect } from "next/navigation";

// HOME-1: the address "/" used to show an empty page. Send visitors to the
// login page; a user who is already signed in is then forwarded to /main by
// proxy.js.
export default function Home() {
  redirect("/login");
}
