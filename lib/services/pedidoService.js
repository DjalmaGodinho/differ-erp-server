import { pedidoRepository, clienteRepository, contaReceberRepository, condicaoPagamentoRepository } from '../repositories/index.js';

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
      const valorUnitario = m.valor_unitario || m.valorUnitario || 0;
      m.valor_total = m.quantidade * valorUnitario;
      valorTotal += m.valor_total;
    });
    servicos.forEach(s => {
      const valorUnitario = s.valor_unitario || s.valorUnitario || 0;
      s.valor_total = s.quantidade * valorUnitario;
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
      const valorUnitario = m.valor_unitario || m.valorUnitario || 0;
      m.valor_total = m.quantidade * valorUnitario;
      valorTotal += m.valor_total;
    });
    servicos.forEach(s => {
      const valorUnitario = s.valor_unitario || s.valorUnitario || 0;
      s.valor_total = s.quantidade * valorUnitario;
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
  },

  async efetivar(id, { irParaConcluido = false, formaPagamentoId, condicaoPagamentoId } = {}) {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error('Pedido não encontrado');
    if (pedido.tipo_id === 2) throw new Error('Pedido já está efetivado');

    // Busca dados do cliente para obter pagamento padrão quando não informado
    const cliente = await clienteRepository.findById(pedido.cliente_id);

    const fpId = formaPagamentoId || cliente?.forma_pagamento_id || null;
    const cpId = condicaoPagamentoId || cliente?.condicao_pagamento_id || null;

    // Atualizar tipo para Efetivado (2)
    await pedidoRepository.updateTipo(id, 2);

    // Status: Produção (3) ou Concluído (4)
    const novoStatusId = irParaConcluido ? 4 : 3;
    const pedidoAtualizado = await pedidoRepository.updateStatus(id, novoStatusId);

    // Gerar contas a receber quando vai para Concluído
    if (irParaConcluido) {
      const valorTotal = Number(pedido.valor_total || 0);
      const dataEmissao = new Date().toISOString().split('T')[0];

      let parcelas = 1;
      let diasEntreParcelas = 0;
      let entradaPercentual = 0;

      if (cpId) {
        const condicao = await condicaoPagamentoRepository.findById(cpId);
        if (condicao) {
          parcelas = condicao.parcelas || 1;
          diasEntreParcelas = condicao.dias_entre_parcelas || 30;
          entradaPercentual = Number(condicao.entrada_percentual || 0);
        }
      }

      const contas = [];
      if (entradaPercentual > 0) {
        // Primeira parcela = entrada
        const valorEntrada = (valorTotal * entradaPercentual) / 100;
        const valorRestante = valorTotal - valorEntrada;
        const parcelasRestantes = parcelas - 1;
        const valorParcela = parcelasRestantes > 0 ? valorRestante / parcelasRestantes : 0;

        contas.push({
          pedido_id: id,
          cliente_id: pedido.cliente_id,
          numero_documento: `${pedido.numero}-1`,
          data_emissao: dataEmissao,
          data_vencimento: dataEmissao,
          valor_original: valorEntrada,
          parcela: 1,
          total_parcelas: parcelas,
          forma_pagamento_id: fpId,
          observacao: `Entrada - Pedido ${pedido.numero}`
        });

        for (let i = 1; i < parcelas; i++) {
          const venc = new Date(dataEmissao);
          venc.setDate(venc.getDate() + diasEntreParcelas * i);
          contas.push({
            pedido_id: id,
            cliente_id: pedido.cliente_id,
            numero_documento: `${pedido.numero}-${i + 1}`,
            data_emissao: dataEmissao,
            data_vencimento: venc.toISOString().split('T')[0],
            valor_original: valorParcela,
            parcela: i + 1,
            total_parcelas: parcelas,
            forma_pagamento_id: fpId,
            observacao: `Parcela ${i + 1}/${parcelas} - Pedido ${pedido.numero}`
          });
        }
      } else {
        const valorParcela = valorTotal / parcelas;
        for (let i = 0; i < parcelas; i++) {
          const venc = new Date(dataEmissao);
          venc.setDate(venc.getDate() + diasEntreParcelas * (i + 1));
          contas.push({
            pedido_id: id,
            cliente_id: pedido.cliente_id,
            numero_documento: `${pedido.numero}-${i + 1}`,
            data_emissao: dataEmissao,
            data_vencimento: venc.toISOString().split('T')[0],
            valor_original: valorParcela,
            parcela: i + 1,
            total_parcelas: parcelas,
            forma_pagamento_id: fpId,
            observacao: `Parcela ${i + 1}/${parcelas} - Pedido ${pedido.numero}`
          });
        }
      }

      await contaReceberRepository.createMany(contas);
    }

    return pedidoAtualizado;
  }
};

export default pedidoService;
