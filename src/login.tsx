import { BrandLogo } from './components/brand-logo';
import { LoginForm } from './components/login-form';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-card sm:items-center sm:justify-center sm:bg-background sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block"
      >
        <div className="absolute -top-40 -left-32 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-brand-gold/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
      </div>

      <div className="relative flex w-full flex-1 flex-col justify-center px-6 py-10 sm:max-w-md sm:flex-none sm:rounded-3xl sm:border sm:bg-card sm:px-10 sm:py-12 sm:shadow-xl sm:shadow-primary/5">
        <BrandLogo />

        <div className="mt-8 mb-8 flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Acesse o sistema de gestão com suas credenciais.
          </p>
        </div>

        <LoginForm />

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {'Acesso restrito a gerentes e funcionários autorizados.'}
        </p>
      </div>
    </main>
  )
}
