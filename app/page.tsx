import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">GastroHub</h1>
        <p className="text-lg text-gray-600">
          Gestión Integral para Restaurantes y PYMES
        </p>
      </div>
      <Link className={buttonVariants({ variant: "ghost" })} href="/dashboard">
        Ingresar a GastroHub
      </Link>
    </main>
  );
}
