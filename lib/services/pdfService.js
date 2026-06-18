import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';

const BRAND = '#003764';
const GRAY   = '#555555';
const LGRAY  = '#888888';
const WHITE  = '#FFFFFF';
const ROWALT = '#F9F9F9';

function fmt(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function fmtDate(date) {
  return date ? dayjs(date).format('DD/MM/YYYY') : '—';
}

function bufferFromDoc(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 30;
const MR = 30;
const CONTENT_W = PAGE_W - ML - MR;

function sectionTitle(doc, text, y) {
  doc.moveTo(ML, y).lineTo(PAGE_W - MR, y).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(LGRAY).font('Helvetica').text(text.toUpperCase(), ML, y + 4);
  return y + 16;
}

function infoGrid(doc, items, y, cols = 4) {
  const colW = CONTENT_W / cols;
  const numRows = Math.ceil(items.length / cols);

  for (let row = 0; row < numRows; row++) {
    const rowItems = items.slice(row * cols, row * cols + cols);

    // Calculate tallest cell in this row
    let maxH = 0;
    rowItems.forEach((item, ci) => {
      doc.fontSize(9).font('Helvetica-Bold');
      const h = doc.heightOfString(item.value || '—', { width: colW - 8 });
      if (h > maxH) maxH = h;
    });
    const rowH = 10 + maxH + 4; // label(10) + value height + padding

    rowItems.forEach((item, ci) => {
      const x = ML + ci * colW;
      doc.fontSize(7).fillColor(LGRAY).font('Helvetica')
        .text(item.label, x + 2, y, { width: colW - 8 });
      doc.fontSize(9).fillColor('#222222').font('Helvetica-Bold')
        .text(item.value || '—', x + 2, y + 10, { width: colW - 8 });
    });

    y += rowH;
  }

  return y + 6;
}

function tableSection(doc, title, headers, rows, colWidths, y) {
  if (rows.length === 0) return y;

  y = sectionTitle(doc, title, y);
  y += 4;

  const rowH = 16;
  const headerH = 18;

  if (y + headerH + rows.length * rowH + 30 > PAGE_H - 40) {
    doc.addPage();
    y = 30;
  }

  doc.rect(ML, y, CONTENT_W, headerH).fill(BRAND);
  let cx = ML + 4;
  headers.forEach((h, i) => {
    doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
      .text(h, cx, y + 5, { width: colWidths[i] - 4, align: i >= 2 ? 'center' : 'left' });
    cx += colWidths[i];
  });
  y += headerH;

  rows.forEach((row, ri) => {
    if (y + rowH > PAGE_H - 40) {
      doc.addPage();
      y = 30;
    }
    if (ri % 2 === 1) doc.rect(ML, y, CONTENT_W, rowH).fill(ROWALT);
    cx = ML + 4;
    row.forEach((cell, ci) => {
      const align = ci >= 2 ? 'center' : 'left';
      doc.fontSize(8).fillColor('#222222').font('Helvetica')
        .text(String(cell ?? ''), cx, y + 4, { width: colWidths[ci] - 4, align });
      cx += colWidths[ci];
    });
    y += rowH;
  });

  return y + 6;
}

export const pdfService = {
  async gerarPedidoPDF(pedido) {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufPromise = bufferFromDoc(doc);

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
      unidade: s.unidade_codigo || s.unidade || '',
      quantidade: Number(s.quantidade || 0),
      valorUnitario: Number(s.valor_unitario || s.valorUnitario || 0),
      valorTotal: Number(s.valor_total || s.valorTotal || 0),
    }));

    const totalMateriais = materiais.reduce((a, m) => a + m.valorTotal, 0);
    const totalServicos  = servicos.reduce((a, s) => a + s.valorTotal, 0);
    const totalGeral     = totalMateriais + totalServicos;

    // ── HEADER ──────────────────────────────────────────────────────────
    doc.rect(ML, 24, CONTENT_W, 48).fill(BRAND);
    doc.fontSize(16).fillColor(WHITE).font('Helvetica-Bold')
      .text('DG-MECH Usinagem ERP', ML + 10, 32);
    doc.fontSize(8).fillColor('#AACCE8').font('Helvetica')
      .text('Soluções em usinagem e metalurgia', ML + 10, 52);

    doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold')
      .text('PEDIDO', 0, 28, { align: 'right', width: PAGE_W - MR - 4 });
    doc.fontSize(11).fillColor('#AACCE8').font('Helvetica')
      .text(pedido.numero || '', 0, 52, { align: 'right', width: PAGE_W - MR - 4 });

    let y = 84;

    // ── DADOS DO PEDIDO ─────────────────────────────────────────────────
    y = sectionTitle(doc, 'Dados do Pedido', y);
    y = infoGrid(doc, [
      { label: 'Tipo',        value: pedido.tipo_nome },
      { label: 'Status',      value: pedido.status_nome },
      { label: 'Prioridade',  value: pedido.prioridade_nome },
      { label: 'Emissão',     value: fmtDate(pedido.data_emissao) },
      { label: 'Entrega',     value: fmtDate(pedido.data_entrega) },
      { label: 'Valor Total', value: fmt(totalGeral) },
    ], y, 3);

    // ── CLIENTE ─────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'Cliente', y);
    y = infoGrid(doc, [
      { label: 'Nome',     value: pedido.cliente_nome },
      { label: 'Código',   value: pedido.cliente_codigo },
      { label: 'CNPJ/CPF', value: pedido.cliente_documento || '—' },
    ], y, 3);

    // ── MATERIAIS ───────────────────────────────────────────────────────
    const colMat = [50, CONTENT_W - 50 - 30 - 40 - 60 - 60, 30, 40, 60, 60];
    y = tableSection(doc,
      'Materiais / Produtos',
      ['Código', 'Descrição', 'Un', 'Qtd', 'Vlr Unit', 'Total'],
      materiais.map(m => [m.codigo, m.descricao, m.unidade, m.quantidade, fmt(m.valorUnitario), fmt(m.valorTotal)]),
      colMat, y
    );

    if (materiais.length > 0) {
      doc.rect(ML, y, CONTENT_W, 16).fill('#EEF4FA');
      doc.fontSize(8).fillColor(BRAND).font('Helvetica-Bold')
        .text('Total Materiais', ML + 4, y + 4, { width: CONTENT_W - colMat[colMat.length - 1] - 4, align: 'right' })
        .text(fmt(totalMateriais), ML + CONTENT_W - colMat[colMat.length - 1], y + 4, { width: colMat[colMat.length - 1] - 4, align: 'center' });
      y += 20;
    }

    // ── SERVIÇOS ────────────────────────────────────────────────────────
    const colSrv = [50, CONTENT_W - 50 - 30 - 40 - 60 - 60, 30, 40, 60, 60];
    y = tableSection(doc,
      'Serviços Prestados',
      ['Código', 'Serviço', 'Un', 'Qtd', 'Vlr Unit', 'Total'],
      servicos.map(s => [s.codigo, s.nome, s.unidade, s.quantidade, fmt(s.valorUnitario), fmt(s.valorTotal)]),
      colSrv, y
    );

    if (servicos.length > 0) {
      doc.rect(ML, y, CONTENT_W, 16).fill('#EEF4FA');
      doc.fontSize(8).fillColor(BRAND).font('Helvetica-Bold')
        .text('Total Serviços', ML + 4, y + 4, { width: CONTENT_W - colSrv[colSrv.length - 1] - 4, align: 'right' })
        .text(fmt(totalServicos), ML + CONTENT_W - colSrv[colSrv.length - 1], y + 4, { width: colSrv[colSrv.length - 1] - 4, align: 'center' });
      y += 20;
    }

    // ── TOTAL GERAL ──────────────────────────────────────────────────────
    y += 6;
    const totW = 200;
    const totX = PAGE_W - MR - totW;
    doc.moveTo(totX, y).lineTo(PAGE_W - MR, y).strokeColor(BRAND).lineWidth(1).stroke();
    y += 4;
    doc.rect(totX, y, totW, 22).fill(BRAND);
    doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
      .text('TOTAL GERAL', totX + 6, y + 6, { width: totW / 2 - 6 })
      .text(fmt(totalGeral), totX + totW / 2, y + 6, { width: totW / 2 - 6, align: 'right' });
    y += 28;

    // ── OBSERVAÇÕES ──────────────────────────────────────────────────────
    if (pedido.observacao) {
      y += 4;
      doc.rect(ML, y, 3, 30).fill(BRAND);
      doc.fontSize(8).fillColor(GRAY).font('Helvetica-Bold').text('Observações', ML + 8, y + 2);
      doc.fontSize(8).fillColor('#222').font('Helvetica').text(pedido.observacao, ML + 8, y + 12, { width: CONTENT_W - 12 });
      y += 36;
    }

    // ── FOOTER ───────────────────────────────────────────────────────────
    doc.moveTo(ML, PAGE_H - 24).lineTo(PAGE_W - MR, PAGE_H - 24).strokeColor('#EEEEEE').lineWidth(0.5).stroke();
    doc.fontSize(7).fillColor(LGRAY).font('Helvetica')
      .text(`Emitido em ${dayjs().format('DD/MM/YYYY HH:mm')} — DG-MECH Usinagem ERP`, ML, PAGE_H - 18, { align: 'center', width: CONTENT_W });

    doc.end();
    return bufPromise;
  }
};

export default pdfService;
