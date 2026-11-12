import { useRef } from 'react'
import { CheckCircle2, Printer, RotateCcw, ShoppingBag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import {
  TRANSACTION_TYPES,
  formatCents,
  formatReceiptDate,
  type SaleReceiptData,
} from '../../lib/sales'

type Props = {
  receipt: SaleReceiptData | null
  onClose: () => void
}

export function SaleReceiptDialog({ receipt, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!receipt) return null

  const { full: dataFormatada } = formatReceiptDate(receipt.data)
  const transactionMeta = TRANSACTION_TYPES.find((t) => t.value === receipt.tipo)
  const tipoLabel = transactionMeta?.label ?? 'Venda'
  const totalPecas = receipt.itens.reduce((acc, i) => acc + i.quantidade, 0)

  function handlePrint() {
    window.print()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] w-full max-w-lg p-0 overflow-hidden sm:max-w-md">
        {/* Folha de estilos inline exclusiva para impressão do recibo */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-sale-receipt, #printable-sale-receipt * {
              visibility: visible !important;
            }
            #printable-sale-receipt {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 12px !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: monospace, ui-monospace, sans-serif !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Cabeçalho do Modal na tela (não impresso) */}
        <div className="no-print border-b border-border bg-muted/40 px-6 py-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <DialogTitle className="text-base font-semibold">
                Transação Finalizada com Sucesso!
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              O estoque foi atualizado no banco de dados e o comprovante abaixo está disponível para entrega ou impressão.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Conteúdo do Comprovante (visível na tela e na impressão) */}
        <div className="overflow-y-auto px-6 py-4">
          <div
            id="printable-sale-receipt"
            ref={receiptRef}
            className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-card p-5 text-card-foreground shadow-xs"
          >
            {/* Topo do Recibo */}
            <div className="flex flex-col items-center text-center border-b border-dashed border-border pb-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2 no-print">
                <ShoppingBag className="size-5" aria-hidden="true" />
              </div>
              <h3 className="font-bold tracking-tight text-base uppercase text-foreground">
                Loja de Roupas UFSCar
              </h3>
              <p className="text-xs text-muted-foreground">
                Universidade Federal de São Carlos
              </p>
              <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
                Comprovante de {tipoLabel}
              </div>
            </div>

            {/* Metadados da Venda */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground border-b border-dashed border-border pb-3">
              <div className="flex justify-between">
                <span>Transação:</span>
                <span className="font-mono font-semibold text-foreground">
                  #{receipt.id.slice(0, 10).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data/Hora:</span>
                <span className="text-foreground">{dataFormatada}</span>
              </div>
              <div className="flex justify-between">
                <span>Operador de Caixa:</span>
                <span className="font-medium text-foreground">{receipt.operadorNome}</span>
              </div>
            </div>

            {/* Lista descritiva dos itens */}
            <div className="flex flex-col gap-2 border-b border-dashed border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Itens ({totalPecas} {totalPecas === 1 ? 'peça' : 'peças'})
              </p>
              <div className="flex flex-col gap-2">
                {receipt.itens.map((item, index) => {
                  const itemTotal = item.quantidade * item.precoUnitario
                  return (
                    <div
                      key={`${item.produtoId}-${index}`}
                      className="flex items-start justify-between text-xs gap-2"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium text-foreground truncate">
                          {item.nome}
                        </span>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <span>Tam: <strong>{item.tamanho}</strong></span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="size-2 rounded-full border border-black/20"
                              style={{ backgroundColor: item.cor.hex }}
                              aria-hidden="true"
                            />
                            {item.cor.nome}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {item.quantidade} un × {formatCents(item.precoUnitario)}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums text-foreground shrink-0">
                        {formatCents(itemTotal)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Itens devolvidos em caso de troca */}
              {receipt.tipo === 'troca' && receipt.itensDevolvidos && receipt.itensDevolvidos.length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Itens Retornados ao Estoque:
                  </p>
                  <div className="flex flex-col gap-1 mt-1">
                    {receipt.itensDevolvidos.map((dev, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{dev.quantidade}x {dev.nome} ({dev.tamanho} - {dev.cor.nome})</span>
                        <span className="text-emerald-600 font-medium">+ entrada</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumo Financeiro */}
            <div className="flex flex-col gap-1.5 text-xs text-foreground border-b border-dashed border-border pb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatCents(receipt.subtotal)}</span>
              </div>
              {receipt.desconto > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Desconto aplicado</span>
                  <span className="font-medium tabular-nums">− {formatCents(receipt.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 text-sm font-bold text-foreground">
                <span>{receipt.tipo === 'devolucao' ? 'Total Devolvido' : 'Total Líquido'}</span>
                <span className="text-base tabular-nums text-primary">{formatCents(receipt.total)}</span>
              </div>
            </div>

            {/* Rodapé do Cupom */}
            <div className="text-center text-[10px] text-muted-foreground leading-relaxed">
              <p>Guarde este comprovante para trocas em até 30 dias com etiqueta fixada na peça.</p>
              <p className="mt-1 font-semibold text-foreground/80">Obrigado pela preferência!</p>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações na tela (não impresso) */}
        <div className="no-print flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Printer className="size-4" aria-hidden="true" />
            Imprimir Comprovante
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 cursor-pointer font-semibold"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Nova Transação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
