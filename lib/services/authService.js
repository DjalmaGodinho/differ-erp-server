import fetch from 'node-fetch';
import { usuarioRepository } from '../repositories/index.js';
import { getSupabaseConfig } from '../middleware/auth.js';

const authService = {
  async login(email, senha) {
    const config = getSupabaseConfig();
    
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey
      },
      body: JSON.stringify({ email, password: senha })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login falhou: ${error}`);
    }

    const result = await response.json();
    const userId = result.user?.id;
    
    let role = 'USUARIO';
    if (userId) {
      try {
        const profile = await usuarioRepository.findById(userId);
        if (profile) role = profile.role;
      } catch (e) {
        console.log('Erro ao buscar role:', e.message);
      }
    }

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      role,
      user: {
        id: userId,
        email: result.user?.email,
        role
      }
    };
  },

  async criarUsuario({ email, senha, nome, role }) {
    const config = getSupabaseConfig();
    
    if (!config.serviceRoleKey) {
      throw new Error('Service Role Key não configurada');
    }

    const response = await fetch(`${config.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.serviceRoleKey}`,
        'apikey': config.serviceRoleKey
      },
      body: JSON.stringify({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar usuário: ${error}`);
    }

    const result = await response.json();
    const userId = result.id;

    await usuarioRepository.create({ id: userId, email, nome, role: role || 'usuario' });

    return { id: userId, email, role };
  },

  async listarUsuarios() {
    return await usuarioRepository.findAll();
  },

  async atualizarRole(id, role) {
    return await usuarioRepository.updateRole(id, role);
  },

  async removerUsuario(id) {
    return await usuarioRepository.delete(id);
  },

  async setupAdmin({ email, senha, nome, role = 'admin', userId }) {
    const existeAdmin = await usuarioRepository.existsAdmin();
    if (existeAdmin) {
      throw new Error('Já existe um administrador configurado');
    }

    const config = getSupabaseConfig();

    if (!config.serviceRoleKey) {
      if (!userId) throw new Error('Modo sem Service Role Key: informe o UserId do Supabase');
      await usuarioRepository.create({ id: userId, email, nome, role });
      return { id: userId, email, role };
    }

    try {
      const response = await fetch(`${config.url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'apikey': config.serviceRoleKey
        },
        body: JSON.stringify({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { nome }
        })
      });

      let newUserId;
      if (response.ok) {
        const result = await response.json();
        newUserId = result.id;
      } else if (response.status === 422) {
        throw new Error('Usuário já existe no Supabase');
      } else {
        const error = await response.text();
        throw new Error(`Erro ao criar admin: ${error}`);
      }

      await usuarioRepository.create({ id: newUserId, email, nome, role });
      return { id: newUserId, email, role };
    } catch (e) {
      if (e.message.includes('already exists')) {
        throw new Error('Usuário já existe no Supabase');
      }
      throw e;
    }
  }
};

export default authService;
