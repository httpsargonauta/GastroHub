"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Loader2, LogOut, Key, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AuthSettings() {
  const { isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.push("/auth");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión. Por favor intenta de nuevo.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const openUserProfile = () => {
    if (window.Clerk) {
      window.Clerk.openUserProfile();
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5 text-purple-500" />
            Seguridad de la cuenta
          </CardTitle>
          <CardDescription>
            Gestiona la seguridad de tu cuenta y opciones de autenticación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-zinc-800 p-4">
            <h3 className="text-base font-medium mb-1">
              Contraseña y autenticación
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Cambia tu contraseña y configura la autenticación de dos factores.
            </p>
            <Button
              variant="outline"
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
              onClick={openUserProfile}
            >
              <Shield className="mr-2 h-4 w-4" />
              Gestionar seguridad
            </Button>
          </div>

          <div className="rounded-lg border border-zinc-800 p-4">
            <h3 className="text-base font-medium mb-1">
              Proveedores de autenticación
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Conecta tu cuenta con otros proveedores de autenticación.
            </p>
            <Button
              variant="outline"
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
              onClick={openUserProfile}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Gestionar conexiones
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-rose-500">Zona de peligro</CardTitle>
          <CardDescription>
            Acciones irreversibles relacionadas con tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 mb-4">
            Cerrar sesión en todos los dispositivos y terminar tu sesión actual.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-zinc-800 bg-zinc-900 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  Esta acción cerrará tu sesión actual y tendrás que volver a
                  iniciar sesión para acceder a tu cuenta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cerrando sesión
                    </>
                  ) : (
                    "Cerrar sesión"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
