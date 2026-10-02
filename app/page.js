// app/page.js — Redirige la raíz a /productos.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/productos");
}
