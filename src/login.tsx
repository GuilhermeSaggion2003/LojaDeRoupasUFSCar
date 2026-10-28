import { BrandLogo } from './components/brand-logo';
import { LoginForm } from './components/login-form';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0b111e] p-4 antialiased">
      {/* Background Dot Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70"
      />

      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-[32rem] rounded-full bg-blue-600/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 size-[32rem] rounded-full bg-amber-500/10 blur-[120px]"
      />

      {/* Centered Login Card */}
      <div className="relative z-10 flex w-full max-w-[430px] flex-col rounded-[28px] border border-slate-800/80 bg-[#111927] p-8 shadow-2xl shadow-black/80 sm:p-10">
        <BrandLogo />

        <div className="mt-6 mb-7 flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bem-vindo de volta
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Acesse o sistema de gestão com suas credenciais.
          </p>
        </div>

        <LoginForm />

        <p className="mt-8 text-center text-xs text-slate-500">
          Acesso restrito a gerentes e funcionários autorizados.
        </p>
      </div>
    </main>
  )
}
