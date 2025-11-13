import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

interface ContentTabsProps {
  body: string;
  aiSummary: string;
  translatedContent: string;
}

/**
 * ContentTabs Component
 * 영문/한글 뉴스 내용 탭
 */
export function ContentTabs({
  body,
  aiSummary,
  translatedContent,
}: ContentTabsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>뉴스 내용</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="english">
          <TabsList className="mb-4">
            <TabsTrigger value="english">English</TabsTrigger>
            <TabsTrigger value="korean">한국어</TabsTrigger>
          </TabsList>

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
