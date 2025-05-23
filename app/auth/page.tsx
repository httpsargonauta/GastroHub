"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Lock, Mail, User } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";

// Esquema de validación para login
const loginSchema = z.object({
  email: z.string().email({ message: "Ingresa un email válido" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

// Esquema de validación para registro
const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
    email: z.string().email({ message: "Ingresa un email válido" }),
    password: z
      .string()
      .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    confirmPassword: z
      .string()
      .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export default function OAuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Formularios
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        // Muestra el error de autenticación (por ejemplo, formato incorrecto o credenciales inválidas)
        toast.error(error.message);
        return;
      }

      // Si la autenticación es exitosa, supabase guarda la sesión en localStorage
      // Puedes opcionalmente verificar la sesión:
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("No se pudo establecer la sesión. Inténtalo de nuevo.");
        return;
      }

      toast.success("Sesión iniciada exitosamente");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error en login:", error);
      toast.error("Error inesperado durante el inicio de sesión");
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      // Lógica de registro aquí
      if (values.password !== values.confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.push("/dashboard");
    } catch (error) {
      console.error("Error en registro:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // Aquí se aplica el degradado directamente en el contenedor como background
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-900/40 to-black p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="rounded-md bg-purple-600 p-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-white"
          >
            <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
            <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
          </svg>
        </div>
        <span className="text-xl font-bold text-white">GastroHub</span>
      </Link>

      <div className="w-full max-w-md">
        <Tabs
          defaultValue="login"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "login" | "register")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-purple-900/30"
            >
              Iniciar Sesión
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-purple-900/30"
            >
              Registrarse
            </TabsTrigger>
          </TabsList>

          {/* Contenido de Login */}
          <TabsContent value="login">
            <Card className="gradient-border">
              <div className="gradient-border-content">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">
                    Bienvenido de nuevo
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Ingresa tus credenciales para acceder a tu cuenta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="mt-2">Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                  placeholder="tu@email.com"
                                  className="border-white/10 bg-zinc-900 pl-10 text-white placeholder:text-gray-500"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="border-white/10 bg-zinc-900 pl-10 text-white placeholder:text-gray-500"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-2 h-6 w-6 text-gray-500 hover:text-white"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <div className="text-right">
                        <Link
                          href="#"
                          className="text-sm text-purple-400 hover:text-purple-300"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <Button
                        type="submit"
                        className="w-full text-white bg-purple-600 hover:bg-purple-700 group"
                        disabled={isLoading}
                      >
                        {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  {/* Se mejora la separación con un flex y líneas a ambos lados */}
                  <div className="flex items-center my-4">
                    <div className="flex-1 h-px bg-gray-500" />
                    <span className="mx-2 text-sm text-gray-400">
                      ¿Ya tienes una cuenta?
                    </span>
                    <div className="flex-1 h-px bg-gray-500" />
                  </div>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => setActiveTab("register")}
                  >
                    Crear una cuenta
                  </Button>
                </CardFooter>
              </div>
            </Card>
          </TabsContent>

          {/* Contenido de Registro */}
          <TabsContent value="register">
            <Card className="gradient-border">
              <div className="gradient-border-content">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">
                    Crear una cuenta
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Ingresa tus datos para registrarte en GastroHub
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">
                              Nombre completo
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                  placeholder="Juan Pérez"
                                  className="border-white/10 bg-zinc-900 pl-10 text-white placeholder:text-gray-500"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">
                              Email
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                  placeholder="tu@email.com"
                                  className="border-white/10 bg-zinc-900 pl-10 text-white placeholder:text-gray-500"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">
                              Contraseña
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="border-white/10 bg-zinc-900 pl-10 text-white placeholder:text-gray-500"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-2 h-6 w-6 text-gray-500 hover:text-white"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">
                              Confirmar contraseña
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  placeholder="••••••••"
                                  className="border-white/10 bg-zinc-900 pl-10 text-white placeholder:text-gray-500"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-2 h-6 w-6 text-gray-500 hover:text-white"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full text-white bg-purple-600 hover:bg-purple-700 group"
                        disabled={isLoading}
                      >
                        {isLoading ? "Registrando..." : "Registrarse"}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="flex items-center my-4">
                    <div className="flex-1 h-px bg-gray-500" />
                    <span className="mx-2 text-sm text-gray-400">
                      ¿Ya tienes una cuenta?
                    </span>
                    <div className="flex-1 h-px bg-gray-500" />
                  </div>
                  <Button
                    variant="default"
                    className="w-full border-white/10 text-black"
                    onClick={() => setActiveTab("login")}
                  >
                    Iniciar sesión
                  </Button>
                </CardFooter>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
