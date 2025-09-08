import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SupabaseSetup() {
  const { toast } = useToast();
  const currentUrl = window.location.origin;
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Supabase Auth</CardTitle>
          <CardDescription>
            Siga estes passos para configurar corretamente a autenticação e recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Você precisa configurar as URLs no Supabase para que os links de email funcionem corretamente.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Passo 1: Acesse as configurações do Supabase</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('https://supabase.com/dashboard/project/vesffhlaeycsulblwxsa/auth/url-configuration', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir Configurações de URL do Supabase
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Passo 2: Configure a Site URL</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">Defina como Site URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded border">{currentUrl}</code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(currentUrl, 'Site URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Passo 3: Configure as Redirect URLs</h3>
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm text-muted-foreground">Adicione TODAS estas URLs às Redirect URLs permitidas:</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded border text-sm">{currentUrl}</code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(currentUrl, 'URL principal')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded border text-sm">{currentUrl}/reset-password</code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(`${currentUrl}/reset-password`, 'URL de reset')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded border text-sm">{currentUrl}/dashboard</code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(`${currentUrl}/dashboard`, 'URL do dashboard')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background p-2 rounded border text-sm">{currentUrl}/*</code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(`${currentUrl}/*`, 'URL wildcard')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Passo 4: Configurações de Email (Opcional)</h3>
            <Alert>
              <AlertDescription>
                Para desenvolvimento, você pode desativar a confirmação de email:
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>Vá para Authentication → Providers → Email</li>
                  <li>Desmarque "Confirm email"</li>
                  <li>Salve as alterações</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Passo 5: Teste a configuração</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/forgot-password'}
              >
                Testar Recuperação de Senha
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/login'}
              >
                Ir para Login
              </Button>
            </div>
          </div>

          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Após configurar:</strong> Os links de recuperação de senha e confirmação de email funcionarão corretamente neste ambiente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}