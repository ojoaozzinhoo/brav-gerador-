import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: 'admin' | 'user';
  image_limit?: number;
  images_generated?: number;
  allowed_system_key?: boolean;
}

export const dbService = {
  init: () => {
    console.log("Serviço Supabase Inicializado");
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    try {
      // IMPORTANTE: SignUp altera a sessão atual no cliente.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name }
        }
      });

      if (error) throw error;
      
      if (!data.user) throw new Error("Erro ao criar usuário (Dados não retornados).");

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || name,
        avatar: '',
        role: 'user',
        image_limit: 10,
        images_generated: 0,
        allowed_system_key: false 
      };

    } catch (error: any) {
      console.error("Erro no cadastro Supabase:", error);
      throw new Error(error.message || "Erro ao cadastrar usuário.");
    }
  },

  authenticate: async (email: string, password: string): Promise<User> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Usuário não encontrado.");

      // Buscar dados extras do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || email.split('@')[0],
        avatar: data.user.user_metadata?.avatar_url,
        role: profile?.role || 'user',
        image_limit: profile?.image_limit || 10,
        images_generated: profile?.images_generated || 0,
        allowed_system_key: profile?.allowed_system_key
      };
    } catch (error: any) {
      console.error("Erro no login Supabase:", error);
      throw new Error(error.message || "Credenciais inválidas");
    }
  },

  resetPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, 
    });
    if (error) throw error;
  },

  updatePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      // Verifica sessão
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
          console.warn("Erro ao obter sessão:", error);
          return null;
      }
      
      const session = data?.session;
      
      if (session?.user) {
        try {
            // Fetch profile details
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.warn("Erro ao buscar perfil:", profileError);
                // Retorna usuário básico mesmo sem perfil para não bloquear
                return {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                    avatar: session.user.user_metadata?.avatar_url,
                    role: 'user',
                    image_limit: 10,
                    images_generated: 0,
                    allowed_system_key: false
                };
            }

            return {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                avatar: session.user.user_metadata?.avatar_url,
                role: profile?.role || 'user',
                image_limit: profile?.image_limit ?? 10,
                images_generated: profile?.images_generated ?? 0,
                allowed_system_key: profile?.allowed_system_key
            };
        } catch (innerError) {
            console.error("Erro crítico ao processar perfil:", innerError);
            return null;
        }
      }
      return null;
    } catch (error) {
      console.error("Erro crítico em getCurrentUser:", error);
      return null;
    }
  },

  // --- ADMIN FUNCTIONS ---

  getAllUsers: async (): Promise<UserProfile[]> => {
    // Retirada ordenação temporariamente para evitar erros se coluna created_at faltar
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error("Erro ao buscar usuários (Supabase):", error);
      // Lançar erro para ser capturado pelo AdminPanel
      throw new Error(error.message || "Falha ao buscar tabela profiles.");
    }
    return data as UserProfile[];
  },

  updateUserLimit: async (userId: string, newLimit: number) => {
    const { error } = await supabase
      .from('profiles')
      .update({ image_limit: newLimit })
      .eq('id', userId);
    
    if (error) throw error;
  },

  resetUserUsage: async (userId: string) => {
    const { error } = await supabase
        .from('profiles')
        .update({ images_generated: 0 })
        .eq('id', userId);
    
    if (error) throw error;
  },

  toggleSystemKeyAccess: async (userId: string, allowed: boolean) => {
    // Explicitamente atualiza e verifica erro, usando select() para retorno
    const { data, error } = await supabase
        .from('profiles')
        .update({ allowed_system_key: allowed })
        .eq('id', userId)
        .select();

    if (error) throw error;
    
    // VERIFICAÇÃO CRÍTICA: Se data for vazio, o update não achou a linha (RLS bloqueou ou ID errado)
    if (!data || data.length === 0) {
        throw new Error("Falha ao atualizar: Nenhuma linha foi modificada. Verifique se você tem permissão de Admin (RLS) ou se a coluna 'allowed_system_key' existe na tabela 'profiles'.");
    }
  },

  adminUpdateUserPassword: async (targetUserId: string, newPassword: string) => {
    const { error } = await supabase.rpc('admin_update_password', {
        target_user_id: targetUserId,
        new_password: newPassword
    });
    
    if (error) {
        console.error("Erro RPC:", error);
        throw new Error(error.message || "Erro ao atualizar senha via Admin.");
    }
  },

  incrementUsage: async (userId: string) => {
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('images_generated')
        .eq('id', userId)
        .single();
    
    if (fetchError) throw fetchError;

    if (profile) {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ images_generated: (profile.images_generated || 0) + 1 })
            .eq('id', userId);
            
        if (updateError) throw updateError;
    }
  },

  // --- API KEY MANAGEMENT ---

  getGlobalApiKey: async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'gemini_api_key')
      .single();
    
    if (error || !data) return null;
    return data.setting_value;
  },

  setGlobalApiKey: async (key: string) => {
    const { data } = await supabase.from('app_settings').select('id').eq('setting_key', 'gemini_api_key').single();
    
    if (data) {
        await supabase.from('app_settings').update({ setting_value: key }).eq('setting_key', 'gemini_api_key');
    } else {
        await supabase.from('app_settings').insert({ setting_key: 'gemini_api_key', setting_value: key });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
  }
};