"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, Loader2, Sun, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const preferencesFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["es", "en", "pt", "fr"]),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sales: z.boolean(),
    inventory: z.boolean(),
  }),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export function AppPreferences() {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Get user preferences from metadata or set defaults
  const userPreferences =
    (user?.publicMetadata?.preferences as Record<string, any>) || {};

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      theme: userPreferences.theme || "system",
      language: userPreferences.language || "es",
      notifications: {
        email: userPreferences.notifications?.email ?? true,
        push: userPreferences.notifications?.push ?? true,
        sales: userPreferences.notifications?.sales ?? true,
        inventory: userPreferences.notifications?.inventory ?? true,
      },
    },
    mode: "onChange",
  });

  async function onSubmit(data: PreferencesFormValues) {
    setIsLoading(true);

    try {
      // Update user metadata with preferences
      await user?.update({
        publicMetadata: {
          ...user.publicMetadata,
          preferences: {
            language: data.language,
            notifications: data.notifications,
          },
        },
      });

      toast({
        title: "Preferencias actualizadas",
        description:
          "Tus preferencias de la aplicación han sido actualizadas correctamente.",
      });

      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description:
          "No se pudieron actualizar tus preferencias. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle>Preferencias de la aplicación</CardTitle>
        <CardDescription>
          Personaliza la apariencia y comportamiento de la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Sun className="mr-2 h-5 w-5 text-purple-500" />
                  Apariencia
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tema</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="border-zinc-800 bg-zinc-950 text-white">
                              <SelectValue placeholder="Selecciona un tema" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                            <SelectItem
                              value="light"
                              className="hover:bg-zinc-800"
                            >
                              Claro
                            </SelectItem>
                            <SelectItem
                              value="dark"
                              className="hover:bg-zinc-800"
                            >
                              Oscuro
                            </SelectItem>
                            <SelectItem
                              value="system"
                              className="hover:bg-zinc-800"
                            >
                              Sistema
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Elige cómo quieres que se vea la aplicación.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-purple-500" />
                  Idioma y región
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="border-zinc-800 bg-zinc-950 text-white">
                              <SelectValue placeholder="Selecciona un idioma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                            <SelectItem
                              value="es"
                              className="hover:bg-zinc-800"
                            >
                              Español
                            </SelectItem>
                            <SelectItem
                              value="en"
                              className="hover:bg-zinc-800"
                            >
                              English
                            </SelectItem>
                            <SelectItem
                              value="pt"
                              className="hover:bg-zinc-800"
                            >
                              Português
                            </SelectItem>
                            <SelectItem
                              value="fr"
                              className="hover:bg-zinc-800"
                            >
                              Français
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Elige el idioma en el que quieres ver la aplicación.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Bell className="mr-2 h-5 w-5 text-purple-500" />
                  Notificaciones
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notifications.email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notificaciones por correo
                          </FormLabel>
                          <FormDescription>
                            Recibe notificaciones importantes por correo
                            electrónico.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notifications.push"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notificaciones push
                          </FormLabel>
                          <FormDescription>
                            Recibe notificaciones en tiempo real en tu
                            navegador.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notifications.sales"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Alertas de ventas
                          </FormLabel>
                          <FormDescription>
                            Recibe notificaciones sobre nuevas ventas y
                            tendencias.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notifications.inventory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Alertas de inventario
                          </FormLabel>
                          <FormDescription>
                            Recibe notificaciones cuando el inventario esté
                            bajo.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar preferencias
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
