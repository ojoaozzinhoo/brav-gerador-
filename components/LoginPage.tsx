import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register, resetPassword } = useAuth();
  
  // Estado para alternar entre Login, Cadastro e Reset
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Campos do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isResetting) {
        if (!email) throw new Error("Digite seu email.");
        await resetPassword(email);
        setSuccessMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setIsLoading(false);
        return; 
      }

      if (isRegistering) {
        if (!name.trim()) throw new Error("Por favor, digite seu nome.");
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    if (isResetting) {
        setIsResetting(false);
        setIsRegistering(false);
    } else {
        setIsRegistering(!isRegistering);
    }
    setError('');
    setSuccessMsg('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResetting(true);
      setIsRegistering(false);
      setError('');
      setSuccessMsg('');
  };

  // Título dinâmico
  let title = 'Bem-vindo de volta';
  let subtitle = 'Acesse o Gerador Brav Elementor';
  let buttonText = 'Entrar na Plataforma';

  if (isResetting) {
      title = 'Recuperar Senha';
      subtitle = 'Digite seu email para receber o link.';
      buttonText = 'Enviar Link de Recuperação';
  } else if (isRegistering) {
      title = 'Crie sua conta';
      subtitle = 'Comece a criar backgrounds incríveis hoje.';
      buttonText = 'Criar Conta Grátis';
  }

  return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-[#1e1e2e] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-brand-500/20 mb-4">
            AI
          </div>
          <h1 className="text-2xl font-bold text-white">
            {title}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 text-red-400 text-xs text-center font-medium animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-3 text-green-400 text-xs text-center font-medium animate-in slide-in-from-top-2">
              {successMsg}
            </div>
          )}

          {/* Campo Nome - Apenas no cadastro */}
          {isRegistering && !isResetting && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">Nome Completo</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-600"
                  placeholder="Seu nome"
                  required={isRegistering}
                />
                <svg className="w-4 h-4 text-gray-500 absolute right-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-600"
                placeholder="seu@email.com"
                required
              />
              <svg className="w-4 h-4 text-gray-500 absolute right-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
            </div>
          </div>

          {!isResetting && (
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">Senha</label>
                <div className="relative">
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#11111b] border border-gray-700 rounded-lg py-3 px-4 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder-gray-600"
                    placeholder="••••••"
                    required
                    minLength={6}
                />
                <svg className="w-4 h-4 text-gray-500 absolute right-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
            </div>
          )}

          {!isRegistering && !isResetting && (
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-300">
                <input type="checkbox" className="rounded bg-dark-900 border-gray-700 text-brand-500 focus:ring-0" />
                Lembrar de mim
              </label>
              <button type="button" onClick={handleForgotPasswordClick} className="text-brand-500 hover:text-brand-400 hover:underline">
                Esqueceu a senha?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg transition-all transform hover:scale-[1.01] ${isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400'}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 
                Processando...
              </span>
            ) : buttonText}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            {isResetting ? (
                <button 
                onClick={toggleMode}
                className="text-xs text-brand-400 font-bold hover:text-white hover:underline transition-colors"
                >
                Voltar para Login
                </button>
            ) : (
                <p className="text-xs text-gray-500">
                    {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'} 
                    <button 
                    onClick={toggleMode}
                    className="ml-1 text-brand-400 font-bold hover:text-white hover:underline transition-colors"
                    >
                    {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                    </button>
                </p>
            )}
        </div>
      </div>
    </div>
  );
};