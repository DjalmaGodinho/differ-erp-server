import { query } from '../config/database.js';

const auditService = {
  async registrar({ usuario, modulo, acao, entidadeId, descricao, dadosExtras, ipAddress } = {}) {
    try {
      const usuarioId = usuario?.id || null;
      const usuarioEmail = usuario?.email || 'sistema';
      const usuarioNome = usuario?.name || usuario?.email || 'sistema';

      await query(
        `INSERT INTO audit_logs (usuario_id, usuario_email, usuario_nome, modulo, acao, entidade_id, descricao, dados_extras, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          usuarioId,
          usuarioEmail,
          usuarioNome,
          modulo,
          acao,
          entidadeId ? String(entidadeId) : null,
          descricao || null,
          dadosExtras ? JSON.stringify(dadosExtras) : null,
          ipAddress || null,
        ]
      );
    } catch (e) {
      console.error('[auditService] Erro ao registrar log:', e.message);
    }
  },
};

export default auditService;
