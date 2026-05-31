import { pedidoRepository } from '../repositories/index.js';

const pedidoService = {
  async listar({ page, pageSize, search, tipoId, statusId, prioridadeId, clienteId }) {
    return await pedidoRepository.findAll({ page, pageSize, search, tipoId, statusId, prioridadeId, clienteId });
  },

  async obter(id) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error('Pedido não encontrado');
    return pedido;
  },

  async criar(data) {
    if (!data.cliente_id) {
      throw new Error('Cliente é obrigatório');
    }

    data.numero = await pedidoRepository.generateNumero();
    data.status_id = data.status_id || 1;
    data.prioridade_id = data.prioridade_id || 3;

    const materiais = data.materiais || [];
    const servicos = data.servicos || [];

    let valorTotal = 0;
    materiais.forEach(m => {
      m.valor_total = m.quantidade * m.valor_unitario;
      valorTotal += m.valor_total;
    });
    servicos.forEach(s => {
      s.valor_total = s.quantidade * s.valor_unitario;
      valorTotal += s.valor_total;
    });

    data.valor_total = valorTotal;

    return await pedidoRepository.create(data, materiais, servicos);
  },

  async atualizar(id, data) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error('Pedido não encontrado');

    const materiais = data.materiais || [];
    const servicos = data.servicos || [];

    let valorTotal = 0;
    materiais.forEach(m => {
      m.valor_total = m.quantidade * m.valor_unitario;
      valorTotal += m.valor_total;
    });
    servicos.forEach(s => {
      s.valor_total = s.quantidade * s.valor_unitario;
      valorTotal += s.valor_total;
    });

    data.valor_total = valorTotal;

    return await pedidoRepository.update(id, data, materiais, servicos);
  },

  async atualizarStatus(id, statusId) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error('Pedido não encontrado');
    return await pedidoRepository.updateStatus(id, statusId);
  },

  async cancelar(id) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error('Pedido não encontrado');
    if (pedido.status_id === 5) throw new Error('Pedido já está cancelado');
    return await pedidoRepository.updateStatus(id, 5);
  }
};

export default pedidoService;
