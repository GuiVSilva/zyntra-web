import requireSession from "@/lib/authentication";
import * as organizationService from "@/server/services/organization";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { NewOrganization } from "@/components/organization/create-org";

export const dynamic = "force-dynamic";

const OnboardingPage = async () => {
  const session = await requireSession("/onboarding");

  const organizations = await organizationService.listForUser({
    session,
    userId: session.user.id,
  });
  if (organizations.length > 0) redirect("/dashboard");

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">Configuração</div>

        {session.user.emailVerified ? (
          <AuthCard
            title="Crie sua organização"
            description="Tudo no Zyntra começa com a criação de uma organização - projetos, tarefas e as pessoas com quem você os compartilha."
          >
            <NewOrganization defaultName={session.user.name} />
          </AuthCard>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;