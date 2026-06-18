import dayjs from 'dayjs';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function formatDate(date) {
  return date ? dayjs(date).format('DD/MM/YYYY') : '—';
}

// Lazy load puppeteer - só importa quando necessário
let puppeteer;
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = (await import('puppeteer')).default;
  }
  return puppeteer;
}

export const pdfService = {
  async gerarPedidoPDF(pedido) {
    const puppeteerLib = await getPuppeteer();
    const browser = await puppeteerLib.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();

      const materiais = (pedido.materiais || []).map(m => ({
        codigo: m.codigo || '',
        descricao: m.descricao || '',
        unidade: m.unidade_codigo || m.unidade || '',
        quantidade: Number(m.quantidade || 0),
        valorUnitario: Number(m.valor_unitario || m.valorUnitario || 0),
        valorTotal: Number(m.valor_total || m.valorTotal || 0),
      }));

      const servicos = (pedido.servicos || []).map(s => ({
        codigo: s.codigo || '',
        nome: s.nome || '',
        descricao: s.descricao || '',
        unidade: s.unidade_codigo || s.unidade || '',
        quantidade: Number(s.quantidade || 0),
        valorUnitario: Number(s.valor_unitario || s.valorUnitario || 0),
        valorTotal: Number(s.valor_total || s.valorTotal || 0),
      }));

      const totalMateriais = materiais.reduce((a, m) => a + m.valorTotal, 0);
      const totalServicos = servicos.reduce((a, s) => a + s.valorTotal, 0);
      const totalGeral = totalMateriais + totalServicos;

      const rowsMateriais = materiais.map(m => `
        <tr>
          <td>${m.codigo}</td>
          <td>${m.descricao}</td>
          <td style="text-align:center">${m.unidade}</td>
          <td style="text-align:center">${m.quantidade}</td>
          <td style="text-align:right">R$ ${formatCurrency(m.valorUnitario)}</td>
          <td style="text-align:right">R$ ${formatCurrency(m.valorTotal)}</td>
        </tr>`).join('');

      const rowsServicos = servicos.map(s => `
        <tr>
          <td>${s.codigo}</td>
          <td>${s.nome}<br><small>${s.descricao}</small></td>
          <td style="text-align:center">${s.unidade}</td>
          <td style="text-align:center">${s.quantidade}</td>
          <td style="text-align:right">R$ ${formatCurrency(s.valorUnitario)}</td>
          <td style="text-align:right">R$ ${formatCurrency(s.valorTotal)}</td>
        </tr>`).join('');

      const secaoMateriais = materiais.length > 0 ? `
        <h3 style="margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:#555">Materiais / Produtos</h3>
        <table>
          <thead><tr><th>Código</th><th>Descrição</th><th>Un</th><th>Qtd</th><th>Vlr Unit</th><th>Total</th></tr></thead>
          <tbody>${rowsMateriais}</tbody>
          <tfoot><tr><td colspan="5" style="text-align:right;font-weight:bold">Total Materiais</td><td style="text-align:right;font-weight:bold">R$ ${formatCurrency(totalMateriais)}</td></tr></tfoot>
        </table>` : '';

      const secaoServicos = servicos.length > 0 ? `
        <h3 style="margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:#555">Serviços Prestados</h3>
        <table>
          <thead><tr><th>Código</th><th>Serviço</th><th>Un</th><th>Qtd</th><th>Vlr Unit</th><th>Total</th></tr></thead>
          <tbody>${rowsServicos}</tbody>
          <tfoot><tr><td colspan="5" style="text-align:right;font-weight:bold">Total Serviços</td><td style="text-align:right;font-weight:bold">R$ ${formatCurrency(totalServicos)}</td></tr></tfoot>
        </table>` : '';

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Pedido ${pedido.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #003764; padding-bottom: 12px; margin-bottom: 16px; }
    .empresa { font-size: 18px; font-weight: bold; color: #003764; }
    .titulo { font-size: 22px; font-weight: bold; text-align: right; color: #003764; }
    .numero { font-size: 14px; text-align: right; color: #555; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .badge-efetivado { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
    .badge-orcamento { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
    .badge-pendente { background: #fffbe6; color: #faad14; border: 1px solid #ffe58f; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .info-item label { font-size: 10px; color: #888; display: block; }
    .info-item span { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #003764; color: #fff; padding: 6px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tfoot td { background: #f0f4f8; border-top: 2px solid #003764; }
    .totais { margin-top: 16px; border-top: 2px solid #003764; padding-top: 12px; display: flex; justify-content: flex-end; }
    .totais table { width: 280px; }
    .totais td { border: none; padding: 4px 8px; }
    .total-geral { font-size: 14px; font-weight: bold; color: #003764; }
    .obs { margin-top: 16px; padding: 10px; background: #f9f9f9; border-left: 3px solid #003764; font-size: 11px; }
    .obs label { font-weight: bold; display: block; margin-bottom: 4px; }
    .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="empresa">DG-MECH Usinagem ERP</div>
      <div style="font-size: 11px; color: #666; margin-top: 4px;">Soluções em usinagem e metalurgia</div>
    </div>
    <div>
      <div class="titulo">PEDIDO</div>
      <div class="numero">${pedido.numero}</div>
      <div style="margin-top: 4px;">
        <span class="badge ${pedido.tipo_nome === 'Efetivado' ? 'badge-efetivado' : 'badge-orcamento'}">${pedido.tipo_nome}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Pedido</div>
    <div class="info-grid">
      <div class="info-item"><label>Tipo</label><span>${pedido.tipo_nome || '—'}</span></div>
      <div class="info-item"><label>Status</label><span>${pedido.status_nome || '—'}</span></div>
      <div class="info-item"><label>Prioridade</label><span>${pedido.prioridade_nome || '—'}</span></div>
      <div class="info-item"><label>Emissão</label><span>${formatDate(pedido.data_emissao)}</span></div>
      <div class="info-item"><label>Entrega</label><span>${formatDate(pedido.data_entrega)}</span></div>
      <div class="info-item" style="grid-column: span 2"><label>Valor Total</label><span style="color:#003764;font-size:14px">R$ ${formatCurrency(totalGeral)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="info-grid">
      <div class="info-item" style="grid-column: span 2"><label>Nome</label><span>${pedido.cliente_nome || '—'}</span></div>
      <div class="info-item"><label>Código</label><span>${pedido.cliente_codigo || '—'}</span></div>
      <div class="info-item"><label>CNPJ/CPF</label><span>${pedido.cliente_documento || '—'}</span></div>
    </div>
  </div>

  ${secaoMateriais}
  ${secaoServicos}

  <div class="totais">
    <table>
      <tr><td>Total Materiais</td><td style="text-align:right">R$ ${formatCurrency(totalMateriais)}</td></tr>
      <tr><td>Total Serviços</td><td style="text-align:right">R$ ${formatCurrency(totalServicos)}</td></tr>
      <tr class="total-geral"><td><strong>TOTAL GERAL</strong></td><td style="text-align:right"><strong>R$ ${formatCurrency(totalGeral)}</strong></td></tr>
    </table>
  </div>

  ${pedido.observacao ? `<div class="obs"><label>Observações</label>${pedido.observacao}</div>` : ''}

  <div class="footer">Emitido em ${dayjs().format('DD/MM/YYYY HH:mm')} — DG-MECH Usinagem ERP</div>
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }
};

export default pdfService;
