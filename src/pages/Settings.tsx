import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { User, Lock, Globe, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

const handlePasswordChange = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos",
          variant: "destructive",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive",
        });
        return;
      }

      if (newPassword.length < 6) {
        toast({
          title: "Erro",
          description: "A nova senha deve ter pelo menos 6 caracteres",
          variant: "destructive",
        });
        return;
      }

      if (!user?.email) {
        toast({
          title: "Erro",
          description: "Não foi possível identificar o e-mail do usuário",
          variant: "destructive",
        });
        return;
      }

      // Verifica a senha atual (reauth)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Senha atual incorreta",
          description: "Verifique sua senha atual e tente novamente",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso",
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error?.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
    toast({
      title: t('settings.title'),
      description: "Language updated successfully",
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">{t('settings.title')}</h1>
        
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              {t('settings.profile')}
            </TabsTrigger>
            <TabsTrigger value="theme">
              <Palette className="h-4 w-4 mr-2" />
              {t('settings.theme')}
            </TabsTrigger>
            <TabsTrigger value="language">
              <Globe className="h-4 w-4 mr-2" />
              {t('settings.language')}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              {t('settings.security')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile')}</CardTitle>
                <CardDescription>
                  {t('common.profile_info')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('user.name')}</Label>
                  <Input value={user?.name} disabled />
                </div>
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input value={user?.email} disabled />
                </div>
                <div>
                  <Label>{t('user.role')}</Label>
                  <Input value={user?.role} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.theme')}</CardTitle>
                <CardDescription>
                  {t('settings.themeSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center gap-3 cursor-pointer">
                      <Sun className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{t('settings.themeLight')}</div>
                        <div className="text-sm text-muted-foreground">{t('settings.themeLightDesc')}</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center gap-3 cursor-pointer">
                      <Moon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{t('settings.themeDark')}</div>
                        <div className="text-sm text-muted-foreground">{t('settings.themeDarkDesc')}</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center gap-3 cursor-pointer">
                      <Monitor className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{t('settings.themeSystem')}</div>
                        <div className="text-sm text-muted-foreground">{t('settings.themeSystemDesc')}</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.language')}</CardTitle>
                <CardDescription>
                  {t('settings.languageSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.preferredLanguage')}</Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🇧🇷</span>
                          <span>Português</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🇺🇸</span>
                          <span>English</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="fr">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🇫🇷</span>
                          <span>Français</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' && 'A mudança de idioma será aplicada imediatamente em toda a aplicação.'}
                    {language === 'en' && 'The language change will be applied immediately throughout the application.'}
                    {language === 'fr' && 'Le changement de langue sera appliqué immédiatement dans toute l\'application.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.changePassword')}</CardTitle>
                <CardDescription>
                  {t('settings.passwordSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current">{t('settings.currentPassword')}</Label>
                  <Input
                    id="current"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new">{t('settings.newPassword')}</Label>
                  <Input
                    id="new"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">{t('settings.confirmPassword')}</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handlePasswordChange} className="w-full md:w-auto">
                  {t('common.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}