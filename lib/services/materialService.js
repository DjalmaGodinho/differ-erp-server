import { materialRepository, movimentacaoRepository } from '../repositories/index.js';

const materialService = {
  async listar({ page, pageSize, search, tipoId, statusId, ativo }) {
    return await materialRepository.findAll({ page, pageSize, search, tipoId, statusId, ativo });
  },

  async obter(id) {
    const material = await materialRepository.findById(id);
    if (!material) throw new Error('Material não encontrado');
    return material;
  },

  async listarBaixoEstoque() {
    return await materialRepository.findLowStock();
  },

  async criar(data) {
    if (!data.descricao) {
      throw new Error('Descrição é obrigatória');
    }

    data.codigo = await materialRepository.generateCodigo();
    data.quantidade = data.quantidade || 0;
    data.quantidade_reservada = data.quantidade_reservada || 0;
    data.status_id = data.status_id || 1;
    data.ativo = data.ativo !== false;

    return await materialRepository.create(data);
  },

  async atualizar(id, data) {
    const material = await materialRepository.findById(id);
    if (!material) throw new Error('Material não encontrado');

    return await materialRepository.update(id, data);
  },

  async excluir(id) {
    const material = await materialRepository.findById(id);
    if (!material) throw new Error('Material não encontrado');
    await materialRepository.delete(id);
    return true;
  },

  async lancarMovimentacao(materialId, data, usuario) {
    const material = await materialRepository.findById(materialId);
    if (!material) throw new Error('Material não encontrado');

    const { tipo_id, quantidade, valor_unitario, fornecedor_id, motivo_id, nota_fiscal, observacao } = data;

    const quantidadeAnterior = parseFloat(material.quantidade);
    let quantidadeNova;

    if (tipo_id === 1) {
      quantidadeNova = quantidadeAnterior + parseFloat(quantidade);
    } else if (tipo_id === 2) {
      quantidadeNova = quantidadeAnterior - parseFloat(quantidade);
      if (quantidadeNova < 0) throw new Error('Quantidade insuficiente em estoque');
    } else {
      throw new Error('Tipo de movimentação inválido');
    }

    await materialRepository.updateQuantidade(materialId, quantidadeNova, material.quantidade_reservada);

    return await movimentacaoRepository.create({
      material_id: materialId,
      tipo_id,
      quantidade,
      quantidade_anterior: quantidadeAnterior,
      quantidade_nova: quantidadeNova,
      valor_unitario,
      fornecedor_id,
      motivo_id,
      nota_fiscal,
      observacao,
      usuario: usuario || 'sistema'
    });
  },

  async listarMovimentacoes(materialId, { page, pageSize, tipoId, dataInicio, dataFim }) {
    return await movimentacaoRepository.findAll({ page, pageSize, materialId, tipoId, dataInicio, dataFim });
  }
};

export default materialService;
