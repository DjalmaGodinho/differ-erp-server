import { contaReceberService, pedidoService, auditService } from '../services/index.js';
import { contaReceberRepository } from '../repositories/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const contaReceberController = {
  async listar(req, res) {
    try {
      const { page, pageSize, clienteId, status, dataInicio, dataFim } = req.query;
      const result = await contaReceberService.listar({ 
        page: parseInt(page) || 1, 
        pageSize: parseInt(pageSize) || 20,
        clienteId,
        status,
        dataInicio,
        dataFim
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const conta = await contaReceberService.obter(id);
      res.json(ok(conta));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const conta = await contaReceberService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'contas_receber', acao: 'INSERT', entidadeId: conta?.id, descricao: `Conta a receber criada`, ipAddress: req.ip });
      res.status(201).json(ok(conta, 'Conta a receber criada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const conta = await contaReceberService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'contas_receber', acao: 'UPDATE', entidadeId: id, descricao: `Conta a receber atualizada: ${id}`, ipAddress: req.ip });
      res.json(ok(conta, 'Conta a receber atualizada com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      await contaReceberService.excluir(id);
      await auditService.registrar({ usuario: req.user, modulo: 'contas_receber', acao: 'DELETE', entidadeId: id, descricao: `Conta a receber excluída: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Conta a receber excluída com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async gerarDoPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const { condicaoPagamentoId, formaPagamentoId } = req.body;
      
      const contas = await contaReceberService.gerarDoPedido(pedidoId, condicaoPagamentoId, formaPagamentoId);
      await auditService.registrar({ usuario: req.user, modulo: 'contas_receber', acao: 'INSERT', entidadeId: pedidoId, descricao: `Contas a receber geradas do pedido: ${pedidoId}`, dadosExtras: { condicaoPagamentoId, formaPagamentoId }, ipAddress: req.ip });
      res.status(201).json(ok(contas, 'Contas a receber geradas com sucesso'));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async listarPorPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const contas = await contaReceberRepository.findByPedido(pedidoId);
      res.json(ok(contas));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  }
};

export default contaReceberController;
