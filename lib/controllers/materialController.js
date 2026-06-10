import { materialService, auditService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const materialController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, tipoId, statusId, tipoNome, statusNome, ativo } = req.query;
      const result = await materialService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        tipoId: tipoId ? parseInt(tipoId) : null,
        statusId: statusId ? parseInt(statusId) : null,
        tipoNome,
        statusNome,
        ativo: ativo !== undefined ? ativo === 'true' : true
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const material = await materialService.obter(id);
      res.json(ok(material));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async baixoEstoque(req, res) {
    try {
      const materiais = await materialService.listarBaixoEstoque();
      res.json(ok(materiais));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const material = await materialService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'materiais', acao: 'INSERT', entidadeId: material.id, descricao: `Material criado: ${req.body.nome || ''}`, ipAddress: req.ip });
      res.status(201).json(ok(material.id, 'Material criado com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      if (req.body.id && req.body.id !== id) {
        return res.status(400).json(fail('ID da rota difere do body'));
      }
      await materialService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'materiais', acao: 'UPDATE', entidadeId: id, descricao: `Material atualizado: ${req.body.nome || id}`, ipAddress: req.ip });
      res.json(ok(null, 'Material atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async lancarMovimentacao(req, res) {
    try {
      const { id } = req.params;
      const usuario = req.user?.name || 'sistema';
      const result = await materialService.lancarMovimentacao(id, req.body, usuario);
      await auditService.registrar({ usuario: req.user, modulo: 'materiais', acao: 'INSERT', entidadeId: id, descricao: `Movimentação de estoque lançada no material: ${id}`, dadosExtras: { tipo: req.body.tipoId, quantidade: req.body.quantidade }, ipAddress: req.ip });
      res.json(ok(result.id, 'Movimentação registrada com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async listarMovimentacoes(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, pageSize = 20, tipoId, dataInicio, dataFim } = req.query;
      const result = await materialService.listarMovimentacoes(id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        tipoId: tipoId ? parseInt(tipoId) : null,
        dataInicio,
        dataFim
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await materialService.excluir(id);
      await auditService.registrar({ usuario: req.user, modulo: 'materiais', acao: 'DELETE', entidadeId: id, descricao: `Material inativado: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Material inativado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default materialController;
