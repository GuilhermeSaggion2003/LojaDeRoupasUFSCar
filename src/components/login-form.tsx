  
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { cn } from '../lib/utils';

type Errors = { email?: string; password?: string }

const inputBaseClass =
  'h-12 w-full rounded-xl border border-slate-700/60 bg-[#0c1322] pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-[#fbb03b] focus:ring-2 focus:ring-[#fbb03b]/20 focus:outline-none'

export function LoginForm() {

  // Estados para capturar os dados
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(""); // Para mostrar mensagens se a senha estiver errada
  
  const navigate = useNavigate(); // Ferramenta para mudar de página após o login

  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  
  const nextErrors: Errors = {}
  
  if (!email) nextErrors.email = 'Informe seu e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    nextErrors.email = 'Digite um e-mail válido.'
  
  if (!password) nextErrors.password = 'Informe sua senha.'

  setErrors(nextErrors)
  if (Object.keys(nextErrors).length > 0) return

  setLoading(true)
  try {
    await signInWithEmailAndPassword(auth, email, password)
    navigate('/produtos')
  } catch (error) {
    console.error("Erro na autenticação:", error)
    setErrors({ email: 'Credenciais inválidas. Verifique seu e-mail e senha.' })
  } finally {
    setLoading(false)
  }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          E-mail
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@lojaufscar.com.br"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={cn(
              inputBaseClass,
              errors.email && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20',
            )}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-rose-400">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-slate-200"
        >
          Senha
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={cn(
              inputBaseClass,
              'pr-11',
              errors.password && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20',
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center text-slate-400 transition-colors hover:text-slate-200"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-rose-400">
            {errors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#fbb03b] text-sm font-semibold text-slate-950 shadow-md shadow-amber-500/10 transition-all hover:bg-[#f59e0b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Entrando...</span>
          </>
        ) : (
          'Entrar'
        )}
      </button>
    </form>
  )
}
