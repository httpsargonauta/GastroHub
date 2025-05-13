"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/config/profile-settings";
import { AppPreferences } from "@/components/config/app-preferences";
import { AuthSettings } from "@/components/config/auth-settings";
import { User, Palette, Lock } from "lucide-react";

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState("perfil");

  return (
    <div>
      <Tabs
        defaultValue="perfil"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900/70 p-1">
          <TabsTrigger
            value="perfil"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
          >
            <User className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="preferencias"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
          >
            <Palette className="mr-2 h-4 w-4" />
            Preferencias
          </TabsTrigger>
          <TabsTrigger
            value="autenticacion"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
          >
            <Lock className="mr-2 h-4 w-4" />
            Autenticación
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="perfil" className="space-y-4">
            <ProfileSettings />
          </TabsContent>
          <TabsContent value="preferencias" className="space-y-4">
            <AppPreferences />
          </TabsContent>
          <TabsContent value="autenticacion" className="space-y-4">
            <AuthSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
