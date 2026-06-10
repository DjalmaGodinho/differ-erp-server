import { condicaoPagamentoService, auditService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const condicaoPagamentoController = {
  async listar(req, res) {
    try {
      const condicoes = await condicaoPagamentoService.listar();
      res.json(ok(condicoes));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const condicao = await condicaoPagamentoService.obter(id);
      res.json(ok(condicao));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const condicao = await condicaoPagamentoService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'condicoes_pagamento', acao: 'INSERT', entidadeId: condicao?.id, descricao: `Condição de pagamento criada: ${req.body.nome || ''}`, ipAddress: req.ip });
      res.status(201).json(ok(condicao, 'Condição de pagamento criada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const condicao = await condicaoPagamentoService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'condicoes_pagamento', acao: 'UPDATE', entidadeId: id, descricao: `Condição de pagamento atualizada: ${req.body.nome || id}`, ipAddress: req.ip });
      res.json(ok(condicao, 'Condição de pagamento atualizada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await condicaoPagamentoService.excluir(id);
      await auditService.registrar({ usuario: req.user, modulo: 'condicoes_pagamento', acao: 'DELETE', entidadeId: id, descricao: `Condição de pagamento excluída: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Condição de pagamento excluída com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  }
};

export default condicaoPagamentoController;
