import { contaReceberRepository, pedidoRepository, clienteRepository } from '../repositories/index.js';
import dayjs from 'dayjs';

export const contaReceberService = {
  async listar(params) {
    return await contaReceberRepository.findAll(params);
  },

  async obter(id) {
    const conta = await contaReceberRepository.findById(id);
    if (!conta) throw new Error('Conta a receber não encontrada');
    return conta;
  },

  async criar(data) {
    return await contaReceberRepository.create(data);
  },

  async atualizar(id, data) {
    return await contaReceberRepository.update(id, data);
  },

  async excluir(id) {
    return await contaReceberRepository.delete(id);
  },

  async gerarDoPedido(pedidoId, condicaoPagamentoId, formaPagamentoId) {
    const pedido = await pedidoRepository.findById(pedidoId);
    if (!pedido) throw new Error('Pedido não encontrado');

    const cliente = await clienteRepository.findById(pedido.cliente_id);
    if (!cliente) throw new Error('Cliente não encontrado');

    // Se não informou condição, usa a do cliente
    const condicaoId = condicaoPagamentoId || cliente.condicao_pagamento_id;
    if (!condicaoId) throw new Error('Condição de pagamento não informada');

    const condicao = await condicaoPagamentoRepository.findById(condicaoId);
    if (!condicao) throw new Error('Condição de pagamento não encontrada');

    // Forma de pagamento
    const formaId = formaPagamentoId || cliente.forma_pagamento_id;

    // Calcular parcelas
    const contas = [];
    const dataEmissao = dayjs();
    const valorTotal = parseFloat(pedido.valor_total);
    
    // Verificar se tem entrada
    const temEntrada = condicao.entrada_percentual > 0;
    const valorEntrada = temEntrada ? valorTotal * (condicao.entrada_percentual / 100) : 0;
    const valorRestante = valorTotal - valorEntrada;
    const parcelasRestantes = temEntrada ? condicao.parcelas - 1 : condicao.parcelas;
    
    let parcelaAtual = 1;
    
    // Se tem entrada, cria primeira parcela
    if (temEntrada && valorEntrada > 0) {
      contas.push({
        pedido_id: pedidoId,
        cliente_id: pedido.cliente_id,
        numero_documento: `${pedido.numero}/E`,
        data_emissao: dataEmissao.format('YYYY-MM-DD'),
        data_vencimento: dataEmissao.format('YYYY-MM-DD'),
        valor_original: valorEntrada,
        parcela: parcelaAtual++,
        total_parcelas: condicao.parcelas,
        forma_pagamento_id: formaId,
        observacao: `Entrada referente ao pedido ${pedido.numero}`
      });
    }
    
    // Criar parcelas restantes
    const valorParcela = parcelasRestantes > 0 ? valorRestante / parcelasRestantes : 0;
    
    for (let i = 0; i < parcelasRestantes; i++) {
      const dataVencimento = dataEmissao.add((i + 1) * condicao.dias_entre_parcelas, 'day');
      
      contas.push({
        pedido_id: pedidoId,
        cliente_id: pedido.cliente_id,
        numero_documento: `${pedido.numero}/${parcelaAtual}`,
        data_emissao: dataEmissao.format('YYYY-MM-DD'),
        data_vencimento: dataVencimento.format('YYYY-MM-DD'),
        valor_original: valorParcela,
        parcela: parcelaAtual++,
        total_parcelas: condicao.parcelas,
        forma_pagamento_id: formaId,
        observacao: `Parcela ${parcelaAtual - 1} de ${condicao.parcelas} referente ao pedido ${pedido.numero}`
      });
    }
    
    return await contaReceberRepository.createMany(contas);
  }
};

// Importação tardia para evitar circular dependency
import { condicaoPagamentoRepository } from '../repositories/index.js';
