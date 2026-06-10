import { fornecedorService, auditService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const fornecedorController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, statusId, categoriaId } = req.query;
      const result = await fornecedorService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        statusId: statusId ? parseInt(statusId) : null,
        categoriaId: categoriaId ? parseInt(categoriaId) : null
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const fornecedor = await fornecedorService.obter(id);
      res.json(ok(fornecedor));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const fornecedor = await fornecedorService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'fornecedores', acao: 'INSERT', entidadeId: fornecedor.id, descricao: `Fornecedor criado: ${req.body.nome || ''}`, ipAddress: req.ip });
      res.status(201).json(ok(fornecedor.id, 'Fornecedor criado com sucesso'));
    } catch (e) {
      if (e.message.includes('Já existe')) {
        return res.status(409).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      if (req.body.id && req.body.id !== id) {
        return res.status(400).json(fail('ID da rota difere do body'));
      }
      await fornecedorService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'fornecedores', acao: 'UPDATE', entidadeId: id, descricao: `Fornecedor atualizado: ${req.body.nome || id}`, ipAddress: req.ip });
      res.json(ok(null, 'Fornecedor atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('Já existe')) {
        return res.status(409).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await fornecedorService.excluir(id);
      await auditService.registrar({ usuario: req.user, modulo: 'fornecedores', acao: 'DELETE', entidadeId: id, descricao: `Fornecedor inativado: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Fornecedor inativado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  }
};

export default fornecedorController;
