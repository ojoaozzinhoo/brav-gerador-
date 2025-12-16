import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const PasswordResetModal: React.FC = () => {
    const { updatePassword, setRecoveryMode } = useAuth();
    const [pass, setPass] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (pass.length < 6) {
            alert("A senha deve ter no mínimo 6 caracteres.");
            return;
        }
        setLoading(true);
        try {
            await updatePassword(pass);
            alert("Senha atualizada com sucesso!");
            setRecoveryMode(false);
        } catch (e: any) {
            alert("Erro ao atualizar senha: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e1e2e] p-8 rounded-xl border border-brand-500 w-full max-w-md shadow-[0_0_50px_rgba(14,165,233,0.3)] animate-in zoom-in-95">
                 <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Definir Nova Senha</h2>
                    <p className="text-sm text-gray-400 text-center mt-2">Você solicitou a recuperação de conta. Digite sua nova senha abaixo.</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">Nova Senha</label>
                        <input 
                            type="password" 
                            value={pass}
                            onChange={e => setPass(e.target.value)}
                            className="w-full bg-dark-900 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-500 outline-none mt-1"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    
                    <button 
                        onClick={handleSave} 
                        disabled={loading} 
                        className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        {loading ? 'Salvando...' : 'Atualizar e Entrar'}
                    </button>
                    
                    <button 
                        onClick={() => setRecoveryMode(false)}
                        className="w-full text-xs text-gray-500 hover:text-white py-2"
                    >
                        Cancelar
                    </button>
                 </div>
            </div>
        </div>
    )
};