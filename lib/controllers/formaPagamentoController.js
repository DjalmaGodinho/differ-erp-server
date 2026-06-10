import { formaPagamentoService, auditService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const formaPagamentoController = {
  async listar(req, res) {
    try {
      const formas = await formaPagamentoService.listar();
      res.json(ok(formas));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const forma = await formaPagamentoService.obter(id);
      res.json(ok(forma));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const forma = await formaPagamentoService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'formas_pagamento', acao: 'INSERT', entidadeId: forma?.id, descricao: `Forma de pagamento criada: ${req.body.nome || ''}`, ipAddress: req.ip });
      res.status(201).json(ok(forma, 'Forma de pagamento criada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const forma = await formaPagamentoService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'formas_pagamento', acao: 'UPDATE', entidadeId: id, descricao: `Forma de pagamento atualizada: ${req.body.nome || id}`, ipAddress: req.ip });
      res.json(ok(forma, 'Forma de pagamento atualizada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await formaPagamentoService.excluir(id);
      await auditService.registrar({ usuario: req.user, modulo: 'formas_pagamento', acao: 'DELETE', entidadeId: id, descricao: `Forma de pagamento excluída: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Forma de pagamento excluída com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  }
};

export default formaPagamentoController;
