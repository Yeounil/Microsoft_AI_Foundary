import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ContentTabsProps {
  body: string;
  aiSummary: string;
  translatedContent: string;
  onViewReport: () => void;
  isGeneratingReport?: boolean;
}

/**
 * ContentTabs Component
 * 영문/한글 뉴스 내용 탭
 */
export function ContentTabs({
  body,
  aiSummary,
  translatedContent,
  onViewReport,
  isGeneratingReport = false,
}: ContentTabsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>뉴스 내용</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="english">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="english">English</TabsTrigger>
              <TabsTrigger value="korean">한국어</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button onClick={onViewReport} disabled={isGeneratingReport}>
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    레포트 생성 중...
                  </>
                ) : (
                  "관련 뉴스 AI 종합 분석"
                )}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isGeneratingReport}>
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end">
                  <p className="text-sm">
                    AI가 관련 뉴스를 종합적으로 분석하여 투자 인사이트를 제공합니다.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <TabsContent value="english" className="space-y-4">
            <div className="p-4">
              <p className="text-sm leading-loose whitespace-pre-wrap">
                {body || "원문 내용이 없습니다."}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="korean" className="space-y-4">
            {aiSummary && (
              <div>
                <h3 className="mb-2 font-semibold">AI 요약</h3>
                <div className="prose prose-sm max-w-none text-sm text-muted-foreground leading-relaxed">
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
              </div>
            )}
            {translatedContent && (
              <div>
                <h3 className="mb-2 font-semibold">전체 내용</h3>
                <div className="prose prose-sm max-w-none text-sm leading-loose">
                  <ReactMarkdown>{translatedContent}</ReactMarkdown>
                </div>
              </div>
            )}
            {!aiSummary && !translatedContent && (
              <div className="text-sm text-muted-foreground">
                한국어 번역이 없습니다.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
