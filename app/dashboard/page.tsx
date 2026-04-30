import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { workspaces, workspaceMembers, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Shield, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;

  // Get or create workspace for this user
  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerUserId, userId),
  });

  if (!workspace) {
    const [created] = await db
      .insert(workspaces)
      .values({ name: `${session.user.name ?? session.user.email}'s workspace`, ownerUserId: userId })
      .returning();
    workspace = created;
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: workspace.id, userId, role: "owner" });
  }

  const tenantList = await db.query.tenants.findMany({
    where: eq(tenants.workspaceId, workspace.id),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            ScoreShield
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/lib/auth");
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Workspaces</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect a tenant to run a security scan.
            </p>
          </div>
          <Button asChild>
            <Link href="/tenants/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Connect tenant
            </Link>
          </Button>
        </div>

        {tenantList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No tenants connected yet</CardTitle>
              <CardDescription className="mb-6">
                Connect your Google Workspace or Microsoft 365 to run your first security scan.
              </CardDescription>
              <Button asChild>
                <Link href="/tenants/new">Connect your first tenant</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenantList.map((tenant) => (
              <Card key={tenant.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={tenant.provider === "google" ? "secondary" : "outline"}>
                      {tenant.provider === "google" ? "Google Workspace" : "Microsoft 365"}
                    </Badge>
                    <Badge
                      variant={
                        tenant.status === "active"
                          ? "default"
                          : tenant.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">
                    {tenant.displayName ?? tenant.primaryDomain ?? "Unknown tenant"}
                  </CardTitle>
                  <CardDescription>{tenant.primaryDomain}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    {tenant.lastScanAt
                      ? `Last scanned ${new Date(tenant.lastScanAt).toLocaleDateString()}`
                      : "Not yet scanned"}
                  </div>
                  <Button className="w-full" size="sm" asChild>
                    <Link href={`/dashboard/${tenant.id}`}>View dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
