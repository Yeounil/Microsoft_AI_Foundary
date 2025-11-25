'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';

interface ReportGeneratingModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
}

export function ReportGeneratingModal({ open, onClose, symbol }: ReportGeneratingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            레포트 생성 중
          </DialogTitle>
          <DialogDescription>
            {symbol} 레포트를 생성하고 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <p className="font-medium">레포트를 생성하고 있습니다</p>
            <p className="text-sm text-muted-foreground">
              생성되는 동안 다른 작업을 할 수 있습니다.<br />
              생성이 완료되면 알림을 보내드릴게요!
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            창 닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
