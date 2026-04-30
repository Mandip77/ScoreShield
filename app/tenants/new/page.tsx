import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGoogleAuthUrl } from "@/lib/integrations/google/client";
import { getMicrosoftAuthUrl } from "@/lib/integrations/microsoft/client";

export default async function ConnectTenantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const googleUrl = getGoogleAuthUrl();
  const microsoftUrl = getMicrosoftAuthUrl();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            ScoreShield
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Connect tenant</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">Connect your workspace</h1>
          <p className="text-muted-foreground">
            Choose your cloud platform. Your admin will be asked to grant read-only consent.
            We never read file contents — only metadata and audit logs.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <CardTitle>Google Workspace</CardTitle>
              </div>
              <CardDescription>
                Requires a Google Workspace admin account. Scans users, Drive permissions, OAuth
                grants, and audit logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li>• Admin Directory: users & MFA status</li>
                <li>• Drive API: file sharing metadata</li>
                <li>• Reports API: OAuth grants & audit events</li>
                <li>• Alert Center: security alerts</li>
              </ul>
              <Button className="w-full" asChild>
                <a href={googleUrl}>Connect Google Workspace</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <svg viewBox="0 0 23 23" className="h-8 w-8" aria-hidden="true">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <CardTitle>Microsoft 365</CardTitle>
              </div>
              <CardDescription>
                Requires a Microsoft 365 Global Admin. Scans users, OneDrive/SharePoint, OAuth
                grants, Secure Score, and sign-in logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                <li>• Microsoft Graph: users, roles & MFA</li>
                <li>• Security API: Secure Score</li>
                <li>• Files API: OneDrive & SharePoint permissions</li>
                <li>• Audit Logs: sign-ins & risk events</li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <a href={microsoftUrl}>Connect Microsoft 365</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          By connecting, you grant ScoreShield read-only access to metadata and audit logs only.
          We never read email or document contents. You can disconnect at any time.
        </p>
      </main>
    </div>
  );
}
