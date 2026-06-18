import { pedidoService, auditService, emailService, pdfService } from '../services/index.js';

const ok = (data, message) => ({ success: true, data, message });
const fail = (message) => ({ success: false, message });

const pedidoController = {
  async listar(req, res) {
    try {
      const { page = 1, pageSize = 20, search, tipoId, statusId, prioridadeId, clienteId, dataInicio, dataFim } = req.query;
      const result = await pedidoService.listar({ 
        page: parseInt(page), 
        pageSize: parseInt(pageSize), 
        search, 
        tipoId: tipoId ? parseInt(tipoId) : null,
        statusId: statusId ? parseInt(statusId) : null,
        prioridadeId: prioridadeId ? parseInt(prioridadeId) : null,
        clienteId,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null
      });
      res.json(ok(result));
    } catch (e) {
      res.status(400).json(fail(e.message));
    }
  },

  async obter(req, res) {
    try {
      const { id } = req.params;
      const pedido = await pedidoService.obter(id);
      res.json(ok(pedido));
    } catch (e) {
      res.status(404).json(fail(e.message));
    }
  },

  async criar(req, res) {
    try {
      const pedido = await pedidoService.criar(req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'pedidos', acao: 'INSERT', entidadeId: pedido.id, descricao: `Pedido criado`, ipAddress: req.ip });
      res.status(201).json(ok(pedido.id, 'Pedido criado com sucesso'));
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
      await pedidoService.atualizar(id, req.body);
      await auditService.registrar({ usuario: req.user, modulo: 'pedidos', acao: 'UPDATE', entidadeId: id, descricao: `Pedido atualizado: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Pedido atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async atualizarStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;
      await pedidoService.atualizarStatus(id, statusId);
      await auditService.registrar({ usuario: req.user, modulo: 'pedidos', acao: 'STATUS_UPDATE', entidadeId: id, descricao: `Status do pedido atualizado`, dadosExtras: { statusId }, ipAddress: req.ip });
      res.json(ok(null, 'Status do pedido atualizado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async cancelar(req, res) {
    try {
      const { id } = req.params;
      await pedidoService.cancelar(id);
      await auditService.registrar({ usuario: req.user, modulo: 'pedidos', acao: 'CANCELAR', entidadeId: id, descricao: `Pedido cancelado: ${id}`, ipAddress: req.ip });
      res.json(ok(null, 'Pedido cancelado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('já está cancelado')) {
        return res.status(400).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async efetivar(req, res) {
    try {
      const { id } = req.params;
      const { irParaConcluido, condicaoPagamentoId, formaPagamentoId } = req.body;
      
      const pedido = await pedidoService.efetivar(id, { irParaConcluido, condicaoPagamentoId, formaPagamentoId });
      await auditService.registrar({ usuario: req.user, modulo: 'pedidos', acao: 'EFETIVAR', entidadeId: id, descricao: `Pedido efetivado: ${id}`, dadosExtras: { condicaoPagamentoId, formaPagamentoId }, ipAddress: req.ip });
      res.json(ok(pedido, 'Pedido efetivado com sucesso'));
    } catch (e) {
      if (e.message.includes('não encontrado')) {
        return res.status(404).json(fail(e.message));
      }
      if (e.message.includes('já está efetivado')) {
        return res.status(400).json(fail(e.message));
      }
      res.status(400).json(fail(e.message));
    }
  },

  async enviarEmail(req, res) {
    try {
      const { id } = req.params;
      const { email, mensagem } = req.body;

      // Verificar configuração SMTP
      const configCheck = await emailService.verificarConfiguracao();
      if (!configCheck.configurado) {
        return res.status(400).json(fail(`Configuração de e-mail não disponível: ${configCheck.erro}`));
      }

      // Obter pedido completo
      const pedido = await pedidoService.obter(id);
      if (!pedido) {
        return res.status(404).json(fail('Pedido não encontrado'));
      }

      // Validar e-mail
      const emailDestino = email || pedido.cliente_email;
      if (!emailDestino) {
        return res.status(400).json(fail('E-mail do cliente não informado'));
      }

      // Gerar PDF
      const pdfBuffer = await pdfService.gerarPedidoPDF(pedido);

      // Preparar conteúdo do e-mail
      const assunto = `Pedido ${pedido.numero} - DG-MECH Usinagem`;
      
      const corpo = mensagem || `Olá ${pedido.cliente_nome},\n\nSegue em anexo o pedido ${pedido.numero} no valor de R$ ${Number(pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.\n\nAtenciosamente,\nDG-MECH Usinagem`;

      // Enviar e-mail
      await emailService.enviarEmail({
        para: emailDestino,
        assunto,
        corpo,
        anexos: [{
          filename: `Pedido_${pedido.numero}.pdf`,
          content: pdfBuffer.toString('base64')
        }]
      });

      // Registrar auditoria
      await auditService.registrar({ 
        usuario: req.user, 
        modulo: 'pedidos', 
        acao: 'ENVIAR_EMAIL', 
        entidadeId: id, 
        descricao: `Pedido ${pedido.numero} enviado por e-mail para: ${emailDestino}`, 
        ipAddress: req.ip 
      });

      res.json(ok(null, `Pedido enviado com sucesso para ${emailDestino}`));
    } catch (e) {
      console.error('Erro ao enviar e-mail:', e);
      res.status(400).json(fail(e.message));
    }
  }
};

export default pedidoController;
