import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import type { Product } from '../../lib/products'

type Props = {
  product: Product | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteProductDialog({ product, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={product !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
          <AlertDialogDescription>
            {product ? (
              <>
                O produto <strong className="text-foreground">{product.name}</strong> será removido
                do catálogo. Esta ação não pode ser desfeita.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
