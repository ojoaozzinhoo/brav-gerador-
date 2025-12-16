import React, { useEffect, useState } from 'react';
import { dbService } from '../services/dbService';
import { UserProfile } from '../types';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  
  // Track specific action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // State para modal de senha
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: string, email: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // State para modal de CRIAR USUÁRIO
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [usersList, key] = await Promise.all([
        dbService.getAllUsers(),
        dbService.getGlobalApiKey()
      ]);
      setUsers(usersList);
      setApiKey(key || '');
    } catch (error: any) {
      console.error("Erro ao carregar dados admin:", error);
      setErrorMsg(error.message || "Erro ao conectar com o banco de dados. Verifique a tabela 'profiles' no Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const setActionState = (id: string, isLoading: boolean) => {
      setActionLoading(prev => ({ ...prev, [id]: isLoading }));
  };

  const handleUpdateLimit = async (userId: string, newLimit: number) => {
    const btnId = `limit-${userId}`;
    setActionState(btnId, true);
    try {
      await dbService.updateUserLimit(userId, newLimit);
      // Feedback visual
      const btn = document.getElementById(`save-btn-${userId}`);
      if(btn) {
          btn.innerHTML = "✓";
          btn.classList.add("bg-green-600", "text-white", "border-green-600");
          setTimeout(() => {
              btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>`;
              btn.classList.remove("bg-green-600", "text-white", "border-green-600");
          }, 1500);
      }
    } catch (e: any) {
      alert(`ERRO AO SALVAR: ${e.message}`);
    } finally {
      setActionState(btnId, false);
    }
  };
  
  const handleResetUsage = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation(); 
    e.preventDefault();

    // 1. Atualização Visual IMEDIATA (Sem esperar confirmação de rede)
    setUsers(currentUsers => 
        currentUsers.map(u => 
            u.id === userId 
            ? { ...u, images_generated: 0 } // Força visualmente para 0
            : u
        )
    );
    
    // 2. Envia para o banco em background
    try {
        await dbService.resetUserUsage(userId);
    } catch (e: any) {
        console.error("Erro no DB (Reset):", e);
        // Não revertemos a UI imediatamente para não "piscar" para o usuário.
        // Apenas alertamos se for crítico.
    }
  };

  const handleToggleSystemKey = async (e: React.MouseEvent, userId: string, currentStatus: boolean | undefined) => {
      e.stopPropagation();
      const toggleId = `toggle-${userId}`;
      if (actionLoading[toggleId]) return;

      setActionState(toggleId, true);
      
      // Força conversão para booleano para evitar undefined
      const safeCurrentStatus = !!currentStatus; 
      const nextStatus = !safeCurrentStatus;

      // 1. Atualização Visual IMEDIATA (Otimista)
      setUsers(currentUsers => 
        currentUsers.map(u => 
            u.id === userId 
            ? { ...u, allowed_system_key: nextStatus }
            : u
        )
      );

      // 2. Envia para o banco
      try {
          await dbService.toggleSystemKeyAccess(userId, nextStatus);
      } catch (e: any) {
          console.error("Erro completo do DB:", e);
          
          // Lógica robusta para extrair mensagem de erro e evitar [object Object]
          let errorText = "Erro desconhecido";
          
          if (typeof e === 'string') {
            errorText = e;
          } else if (e?.message) {
            errorText = e.message;
          } else if (e?.error_description) {
            errorText = e.error_description;
          } else if (e?.details) {
            errorText = e.details;
          } else {
             try {
                errorText = JSON.stringify(e);
             } catch (jsonErr) {
                errorText = "Erro não serializável (Verifique o console)";
             }
          }
          
          alert(`FALHA AO SALVAR PERMISSÃO:\n\n${errorText}\n\nO valor será revertido.`);
          
          // Reverte o estado visual em caso de erro
          setUsers(currentUsers => 
            currentUsers.map(u => 
                u.id === userId ? { ...u, allowed_system_key: safeCurrentStatus } : u
            )
          );
      } finally {
          setActionState(toggleId, false);
      }
  };

  const handleLimitChange = (userId: string, newValue: string) => {
      const val = newValue === '' ? 0 : parseInt(newValue);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, image_limit: isNaN(val) ? 0 : val } : u));
  };

  const handleSaveKey = async () => {
    setSavingKey(true);
    try {
      await dbService.setGlobalApiKey(apiKey);
      alert("Chave API salva com sucesso!");
    } catch (e) {
      alert("Erro ao salvar chave.");
    } finally {
      setSavingKey(false);
    }
  };

  const openPasswordModal = (u: UserProfile) => {
    setSelectedUser({ id: u.id, email: u.email });
    setNewPassword('');
    setPasswordModalOpen(true);
  };

  const handleSavePassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
        alert("A senha deve ter no mínimo 6 caracteres.");
        return;
    }
    setSavingPassword(true);
    try {
        await dbService.adminUpdateUserPassword(selectedUser.id, newPassword);
        alert(`Senha de ${selectedUser.email} alterada com sucesso!`);
        setPasswordModalOpen(false);
        setNewPassword('');
        setSelectedUser(null);
    } catch (e: any) {
        alert("Erro ao alterar senha: " + e.message);
    } finally {
        setSavingPassword(false);
    }
  };

  const handleCreateUser = async () => {
      if(!newName || !newEmail || !newUserPassword) {
          alert("Preencha todos os campos.");
          return;
      }
      
      if (!window.confirm("Atenção: Criar um novo usuário fará logout da sua conta atual.\n\nDeseja continuar?")) {
          return;
      }

      setCreatingUser(true);
      try {
          await dbService.logout();
          await new Promise(r => setTimeout(r, 500));
          await dbService.register(newName, newEmail, newUserPassword);
          
          alert("Usuário criado! Você está logado na nova conta.");
          window.location.reload(); 
      } catch (e: any) {
          alert("Erro ao criar usuário: " + e.message);
          setCreatingUser(false);
          if (!await dbService.getCurrentUser()) {
             window.location.reload();
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e2e] w-full max-w-6xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* Modals... */}
        {passwordModalOpen && (
             <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
                 <div className="bg-dark-900 border border-gray-600 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                     <h3 className="text-white font-bold text-lg mb-1">Trocar Senha</h3>
                     <p className="text-xs text-gray-400 mb-4">Para: <span className="text-brand-400">{selectedUser?.email}</span></p>
                     <div className="space-y-3">
                         <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova Senha..." className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white focus:border-brand-500 outline-none" />
                         <div className="flex gap-2">
                             <button onClick={() => setPasswordModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Cancelar</button>
                             <button onClick={handleSavePassword} disabled={savingPassword} className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg text-sm font-bold">{savingPassword ? '...' : "Salvar"}</button>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {createUserModalOpen && (
             <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
                 <div className="bg-dark-900 border border-gray-600 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                     <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="bg-green-500/20 text-green-400 p-1 rounded">👤</span> Criar Novo Usuário
                     </h3>
                     <div className="space-y-3">
                         <div>
                             <label className="text-[10px] uppercase text-gray-400 font-bold">Nome</label>
                             <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white focus:border-brand-500 outline-none" />
                         </div>
                         <div>
                             <label className="text-[10px] uppercase text-gray-400 font-bold">Email</label>
                             <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white focus:border-brand-500 outline-none" />
                         </div>
                         <div>
                             <label className="text-[10px] uppercase text-gray-400 font-bold">Senha Inicial</label>
                             <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white focus:border-brand-500 outline-none" />
                         </div>
                         <div className="bg-yellow-900/20 border border-yellow-700/30 p-2 rounded text-[10px] text-yellow-500 mt-2">
                             Aviso: Você será desconectado do Admin ao criar o usuário.
                         </div>
                         <div className="flex gap-2 mt-4">
                             <button onClick={() => setCreateUserModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg text-sm font-medium">Cancelar</button>
                             <button onClick={handleCreateUser} disabled={creatingUser} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg text-sm font-bold">{creatingUser ? 'Criando...' : "Criar Conta"}</button>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-brand-900/20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-brand-500">🛡️</span> Painel Administrativo
            </h2>
            <button onClick={loadData} disabled={loading} className="p-1.5 bg-dark-800 hover:bg-brand-600 rounded-lg text-gray-400 hover:text-white transition-all border border-gray-600 hover:border-brand-400">
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setCreateUserModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                 <span>+</span> Novo Usuário
             </button>
             <button onClick={onClose} className="text-gray-400 hover:text-white bg-dark-800 hover:bg-red-900/50 p-2 rounded-lg transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* API KEY SECTION */}
          <div className="bg-dark-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              Configuração Global (API Key)
            </h3>
            <div className="flex gap-2">
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Cole a chave Gemini AI aqui..." className="flex-1 bg-black/30 border border-gray-600 rounded-lg p-3 text-sm text-white focus:border-brand-500 outline-none transition-colors" />
              <button onClick={handleSaveKey} disabled={savingKey} className="bg-brand-600 hover:bg-brand-500 text-white px-6 rounded-lg font-bold text-sm transition-all flex items-center gap-2">{savingKey ? 'Sal...' : 'Salvar'}</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Esta chave será usada APENAS por usuários com permissão "API Sistema" ativada abaixo.</p>
          </div>

          {/* USER MANAGEMENT SECTION */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Gerenciamento de Usuários
            </h3>
            
            <div className="bg-dark-900 border border-gray-700 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="p-4">Usuário</th>
                      <th className="p-4 text-center">Geradas</th>
                      <th className="p-4 text-center">Limite</th>
                      <th className="p-4 text-center" title="Permitir uso da API Key do Sistema">API Sistema</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 font-medium text-white">
                          <div className="flex flex-col">
                            <span>{u.email}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{u.id.substring(0,8)}...</span>
                          </div>
                          {u.role === 'admin' && <span className="mt-1 inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold border border-red-500/30 uppercase">ADMIN</span>}
                        </td>
                        <td className="p-4 text-center text-white font-mono">
                           <div className="flex items-center justify-center gap-2">
                             <span className={`font-bold transition-colors duration-300 ${u.images_generated >= u.image_limit ? "text-red-400" : "text-green-400"}`}>
                               {u.images_generated}
                             </span>
                             <button 
                                type="button" 
                                onClick={(e) => handleResetUsage(e, u.id)} 
                                className="text-xs p-1.5 hover:bg-brand-600 rounded text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/20 active:scale-95 active:rotate-180" 
                                title="Zerar contagem"
                             >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                             </button>
                           </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input type="number" className="w-16 bg-black/30 border border-gray-600 rounded p-1 text-center text-white focus:border-brand-500 outline-none transition-colors" value={u.image_limit} onChange={(e) => handleLimitChange(u.id, e.target.value)} />
                            <button id={`save-btn-${u.id}`} onClick={() => handleUpdateLimit(u.id, u.image_limit)} className="p-1 text-gray-400 hover:text-brand-500 transition-colors bg-gray-800 rounded border border-gray-700 hover:border-brand-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                            <button 
                                onClick={(e) => handleToggleSystemKey(e, u.id, u.allowed_system_key)}
                                disabled={actionLoading[`toggle-${u.id}`]}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none cursor-pointer ${actionLoading[`toggle-${u.id}`] ? 'opacity-50 cursor-wait' : ''} ${u.allowed_system_key === true ? 'bg-brand-500' : 'bg-gray-700'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${u.allowed_system_key === true ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </td>
                        <td className="p-4 text-right text-gray-500">
                            <button onClick={() => openPasswordModal(u)} className="p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors" title="Alterar Senha">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && !errorMsg && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                    )}
                    {errorMsg && (
                        <tr><td colSpan={5} className="p-8 text-center text-red-400 bg-red-900/10 rounded font-mono text-xs border border-red-900/30">⚠️ {errorMsg}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};